import { generateText } from "ai"
import { anthropic } from "@/lib/ai"
import { db } from "@/lib/db"

// ═══ Configuration ═══

interface ChatbotConfig {
  enabled: boolean
  businessHoursStart: number // 0-23
  businessHoursEnd: number   // 0-23
  businessDays: number[]     // 0=Sunday, 1=Monday, ..., 6=Saturday
  timezone: string
}

function getChatbotConfig(): ChatbotConfig {
  return {
    enabled: process.env.WHATSAPP_CHATBOT_ENABLED === "true",
    businessHoursStart: parseInt(process.env.WHATSAPP_BUSINESS_HOURS_START || "8"),
    businessHoursEnd: parseInt(process.env.WHATSAPP_BUSINESS_HOURS_END || "19"),
    businessDays: [1, 2, 3, 4, 5], // Mon-Fri
    timezone: "America/Sao_Paulo",
  }
}

function isBusinessHours(config: ChatbotConfig): boolean {
  const now = new Date()
  // Use Intl to get Sao Paulo time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    hour: "numeric",
    hour12: false,
    weekday: "short",
  })
  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0")
  const weekday = parts.find((p) => p.type === "weekday")?.value || ""

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  const dayNum = dayMap[weekday] ?? 0

  return (
    config.businessDays.includes(dayNum) &&
    hour >= config.businessHoursStart &&
    hour < config.businessHoursEnd
  )
}

// ═══ Chatbot Response ═══

export async function handleChatbotMessage(
  phone: string,
  incomingText: string
): Promise<string | null> {
  const config = getChatbotConfig()

  if (!config.enabled) return null
  if (isBusinessHours(config)) return null // Don't respond during business hours

  // Lookup person and their data
  const person = await db.person.findFirst({
    where: {
      OR: [
        { whatsapp: phone },
        { celular: phone },
        { whatsapp: `+${phone}` },
        { celular: `+${phone}` },
      ],
    },
    select: {
      id: true,
      nome: true,
      tipo: true,
    },
  })

  if (!person) {
    return `[Automático] Olá! Recebi sua mensagem. No momento estamos fora do horário de atendimento (seg-sex, ${config.businessHoursStart}h-${config.businessHoursEnd}h). Sua mensagem foi registrada e retornaremos assim que possível.`
  }

  // Get person's cases and deadlines
  const cases = await db.case.findMany({
    where: {
      OR: [
        { cliente_id: person.id },
        { partes: { some: { person_id: person.id } } },
      ],
      status: "ATIVO",
    },
    select: {
      id: true,
      numero_processo: true,
      tipo: true,
      fase_processual: true,
      advogado_responsavel: { select: { name: true } },
      prazos: {
        where: { status: "PENDENTE" },
        orderBy: { data_limite: "asc" },
        take: 3,
        select: { descricao: true, data_limite: true, tipo: true },
      },
      movimentacoes: {
        orderBy: { data: "desc" },
        take: 2,
        select: { descricao: true, data: true, tipo: true },
      },
    },
    take: 5,
  })

  // Get upcoming calendar events
  const now = new Date()
  const future30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const events = await db.calendarEvent.findMany({
    where: {
      case_: { OR: [{ cliente_id: person.id }] },
      data_inicio: { gte: now, lte: future30 },
      status: "AGENDADO",
    },
    select: { titulo: true, data_inicio: true, local: true, tipo_evento: true },
    take: 3,
    orderBy: { data_inicio: "asc" },
  })

  // Build context for Claude
  const casesSummary = cases.map((c) => {
    const deadlines = c.prazos.map((p) =>
      `  - ${p.descricao} (${p.tipo}, vence ${new Date(p.data_limite).toLocaleDateString("pt-BR")})`
    ).join("\n")
    const movements = c.movimentacoes.map((m) =>
      `  - ${new Date(m.data).toLocaleDateString("pt-BR")}: ${m.descricao.substring(0, 100)}`
    ).join("\n")
    return `Processo ${c.numero_processo || "s/n"} (${c.tipo}, ${c.fase_processual || "em andamento"}) — Responsável: ${c.advogado_responsavel.name}\n  Últimas movimentações:\n${movements || "  Nenhuma recente"}\n  Próximos prazos:\n${deadlines || "  Nenhum pendente"}`
  }).join("\n\n")

  const eventsSummary = events.map((e) =>
    `- ${e.titulo} em ${new Date(e.data_inicio).toLocaleDateString("pt-BR")} ${e.local ? `(${e.local})` : ""}`
  ).join("\n")

  const responsavel = cases[0]?.advogado_responsavel?.name || "o advogado responsável"

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      maxOutputTokens: 500,
      temperature: 0.3,
      system: `Você é o assistente automático do escritório JRCLaw Advocacia. Está respondendo fora do horário comercial via WhatsApp.

REGRAS ABSOLUTAS:
1. NUNCA dê aconselhamento jurídico, opiniões sobre chances de sucesso, ou interpretações legais.
2. Apenas forneça informações factuais sobre andamento, prazos e próximos passos.
3. Se a pergunta exigir análise jurídica, diga: "Essa questão requer análise do ${responsavel}. Encaminhei sua mensagem."
4. Seja cordial, profissional e objetivo.
5. Use português brasileiro formal.
6. Respostas curtas (máx 3 parágrafos).

DADOS DO CLIENTE: ${person.nome}

PROCESSOS ATIVOS:
${casesSummary || "Nenhum processo ativo encontrado."}

PRÓXIMOS EVENTOS:
${eventsSummary || "Nenhum evento agendado."}

Horário comercial: seg-sex, ${config.businessHoursStart}h-${config.businessHoursEnd}h.`,
      prompt: incomingText,
    })

    return `[Automático] ${text}`
  } catch (err) {
    console.error("[WhatsApp Chatbot] AI error:", err)
    return `[Automático] Olá ${person.nome}! Recebi sua mensagem e encaminhei ao ${responsavel}. Retornaremos no próximo horário comercial (seg-sex, ${config.businessHoursStart}h-${config.businessHoursEnd}h).`
  }
}

// ═══ OCR for images ═══

export async function processImageOCR(
  imageUrl: string,
  messageId: string
): Promise<{ text: string; documentType: string | null } | null> {
  try {
    // Fetch image and convert to base64
    const res = await fetch(imageUrl)
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const contentType = res.headers.get("content-type") || "image/jpeg"

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      maxOutputTokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: `data:${contentType};base64,${base64}`,
            },
            {
              type: "text",
              text: `Analise esta imagem e:
1. Extraia TODO o texto legível (OCR)
2. Identifique o tipo de documento (se aplicável): CONTRATO, PROCURACAO, COMPROVANTE_PAGAMENTO, CERTIDAO, RG, CPF, CNH, COMPROVANTE_ENDERECO, NOTA_FISCAL, BOLETO, OUTRO

Responda em JSON:
{
  "text": "texto extraído completo",
  "documentType": "TIPO_DOCUMENTO ou null"
}`,
            },
          ],
        },
      ],
    })

    try {
      const parsed = JSON.parse(text)
      // Update message with OCR text
      await db.whatsAppMessage.updateMany({
        where: { id: messageId },
        data: {
          ocr_text: parsed.text || null,
          ocr_processed: true,
        },
      })
      return parsed
    } catch {
      // AI didn't return valid JSON — store raw text
      await db.whatsAppMessage.updateMany({
        where: { id: messageId },
        data: { ocr_text: text, ocr_processed: true },
      })
      return { text, documentType: null }
    }
  } catch (err) {
    console.error("[WhatsApp OCR] Error:", err)
    return null
  }
}
