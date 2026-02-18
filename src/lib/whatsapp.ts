// ═══ WhatsApp Provider Abstraction ═══

export interface WhatsAppRecipient {
  phone: string
  name?: string
}

export interface WhatsAppTextMessage {
  to: string
  text: string
}

export interface WhatsAppTemplateMessage {
  to: string
  templateName: string
  language?: string
  variables?: string[]
}

export interface WhatsAppMediaMessage {
  to: string
  type: "image" | "document" | "audio" | "video"
  mediaUrl: string
  caption?: string
  filename?: string
}

export interface WhatsAppSendResult {
  messageId: string
  status: "sent" | "failed"
  error?: string
}

export interface WhatsAppIncomingMessage {
  messageId: string
  from: string
  fromName?: string
  timestamp: number
  type: "text" | "image" | "document" | "audio" | "video" | "reaction" | "location"
  text?: string
  mediaUrl?: string
  mediaFilename?: string
  mediaMimeType?: string
}

export interface WhatsAppStatusUpdate {
  messageId: string
  status: "sent" | "delivered" | "read" | "failed"
  timestamp: number
  recipientId?: string
  errorCode?: string
  errorTitle?: string
}

export interface WhatsAppProvider {
  name: string

  sendText(message: WhatsAppTextMessage): Promise<WhatsAppSendResult>
  sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult>
  sendMedia(message: WhatsAppMediaMessage): Promise<WhatsAppSendResult>

  // Parse incoming webhook payload
  parseIncoming(body: unknown): {
    messages: WhatsAppIncomingMessage[]
    statuses: WhatsAppStatusUpdate[]
  }

  // Verify webhook signature
  verifySignature(body: string, signature: string): boolean

  // Webhook verification (GET challenge)
  verifyWebhook(params: Record<string, string>): string | null
}

// ═══ Meta Cloud API Implementation ═══

export class MetaCloudAPIProvider implements WhatsAppProvider {
  name = "MetaCloudAPI"

  private phoneNumberId: string
  private accessToken: string
  private appSecret: string
  private verifyToken: string
  private apiVersion = "v21.0"

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ""
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ""
    this.appSecret = process.env.WHATSAPP_APP_SECRET || ""
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ""
  }

  private get baseUrl() {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`
  }

  async sendText(message: WhatsAppTextMessage): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to,
          type: "text",
          text: { body: message.text },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { messageId: "", status: "failed", error: data.error?.message || "Unknown error" }
      }

      return { messageId: data.messages?.[0]?.id || "", status: "sent" }
    } catch (err) {
      return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    try {
      const components: unknown[] = []
      if (message.variables && message.variables.length > 0) {
        components.push({
          type: "body",
          parameters: message.variables.map((v) => ({ type: "text", text: v })),
        })
      }

      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to,
          type: "template",
          template: {
            name: message.templateName,
            language: { code: message.language || "pt_BR" },
            components: components.length > 0 ? components : undefined,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { messageId: "", status: "failed", error: data.error?.message || "Unknown error" }
      }

      return { messageId: data.messages?.[0]?.id || "", status: "sent" }
    } catch (err) {
      return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  async sendMedia(message: WhatsAppMediaMessage): Promise<WhatsAppSendResult> {
    try {
      const mediaPayload: Record<string, unknown> = { link: message.mediaUrl }
      if (message.caption) mediaPayload.caption = message.caption
      if (message.filename) mediaPayload.filename = message.filename

      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to,
          type: message.type,
          [message.type]: mediaPayload,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { messageId: "", status: "failed", error: data.error?.message || "Unknown error" }
      }

      return { messageId: data.messages?.[0]?.id || "", status: "sent" }
    } catch (err) {
      return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  parseIncoming(body: unknown): {
    messages: WhatsAppIncomingMessage[]
    statuses: WhatsAppStatusUpdate[]
  } {
    const messages: WhatsAppIncomingMessage[] = []
    const statuses: WhatsAppStatusUpdate[] = []

    const payload = body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<Record<string, unknown>>
            statuses?: Array<Record<string, unknown>>
            contacts?: Array<{ wa_id: string; profile?: { name?: string } }>
          }
        }>
      }>
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value) continue

        const contactsMap = new Map<string, string>()
        for (const c of value.contacts || []) {
          contactsMap.set(c.wa_id, c.profile?.name || "")
        }

        for (const msg of value.messages || []) {
          const from = msg.from as string
          const msgType = msg.type as string
          const incoming: WhatsAppIncomingMessage = {
            messageId: msg.id as string,
            from,
            fromName: contactsMap.get(from),
            timestamp: parseInt(msg.timestamp as string) * 1000,
            type: msgType as WhatsAppIncomingMessage["type"],
          }

          if (msgType === "text") {
            incoming.text = (msg.text as { body: string })?.body
          } else if (["image", "document", "audio", "video"].includes(msgType)) {
            const media = msg[msgType] as { id?: string; caption?: string; filename?: string; mime_type?: string }
            if (media?.caption) incoming.text = media.caption
            if (media?.filename) incoming.mediaFilename = media.filename
            if (media?.mime_type) incoming.mediaMimeType = media.mime_type
            // Media URL needs to be fetched via Graph API using media.id
            if (media?.id) incoming.mediaUrl = media.id // Store ID; resolve later
          }

          messages.push(incoming)
        }

        for (const st of value.statuses || []) {
          statuses.push({
            messageId: st.id as string,
            status: (st.status as string) as WhatsAppStatusUpdate["status"],
            timestamp: parseInt(st.timestamp as string) * 1000,
            recipientId: st.recipient_id as string,
            errorCode: (st.errors as Array<{ code?: string }>)?.[0]?.code,
            errorTitle: (st.errors as Array<{ title?: string }>)?.[0]?.title,
          })
        }
      }
    }

    return { messages, statuses }
  }

  verifySignature(body: string, signature: string): boolean {
    if (!this.appSecret) return true // Skip if not configured
    try {
      const crypto = require("crypto") as typeof import("crypto")
      const expectedSig = crypto
        .createHmac("sha256", this.appSecret)
        .update(body)
        .digest("hex")
      return signature === `sha256=${expectedSig}`
    } catch {
      return false
    }
  }

  verifyWebhook(params: Record<string, string>): string | null {
    const mode = params["hub.mode"]
    const token = params["hub.verify_token"]
    const challenge = params["hub.challenge"]

    if (mode === "subscribe" && token === this.verifyToken) {
      return challenge || null
    }
    return null
  }
}

// ═══ Evolution API Implementation ═══

export class EvolutionAPIProvider implements WhatsAppProvider {
  name = "EvolutionAPI"

  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || ""
    this.apiKey = process.env.EVOLUTION_API_KEY || ""
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || "jrclaw"
  }

  private get endpoint() {
    return `${this.baseUrl}/message/sendText/${this.instanceName}`
  }

  private get headers() {
    return {
      apikey: this.apiKey,
      "Content-Type": "application/json",
    }
  }

  async sendText(message: WhatsAppTextMessage): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          number: message.to,
          text: message.text,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { messageId: "", status: "failed", error: JSON.stringify(data) }
      }
      return { messageId: data.key?.id || "", status: "sent" }
    } catch (err) {
      return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    // Evolution API doesn't support Meta templates directly
    // Fallback: send as text with variables interpolated
    let text = message.templateName
    if (message.variables) {
      message.variables.forEach((v, i) => {
        text = text.replace(`{{${i + 1}}}`, v)
      })
    }
    return this.sendText({ to: message.to, text })
  }

  async sendMedia(message: WhatsAppMediaMessage): Promise<WhatsAppSendResult> {
    try {
      const endpoint = `${this.baseUrl}/message/sendMedia/${this.instanceName}`
      const res = await fetch(endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          number: message.to,
          mediatype: message.type,
          media: message.mediaUrl,
          caption: message.caption,
          fileName: message.filename,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { messageId: "", status: "failed", error: JSON.stringify(data) }
      }
      return { messageId: data.key?.id || "", status: "sent" }
    } catch (err) {
      return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  parseIncoming(body: unknown): {
    messages: WhatsAppIncomingMessage[]
    statuses: WhatsAppStatusUpdate[]
  } {
    const messages: WhatsAppIncomingMessage[] = []
    const statuses: WhatsAppStatusUpdate[] = []

    const payload = body as {
      event?: string
      data?: Record<string, unknown>
    }

    if (payload.event === "messages.upsert") {
      const data = payload.data as {
        key?: { remoteJid?: string; id?: string; fromMe?: boolean }
        message?: { conversation?: string; imageMessage?: unknown; documentMessage?: unknown }
        pushName?: string
        messageTimestamp?: number
      }

      if (data.key && !data.key.fromMe) {
        const phone = (data.key.remoteJid || "").replace("@s.whatsapp.net", "")
        messages.push({
          messageId: data.key.id || "",
          from: phone,
          fromName: data.pushName as string,
          timestamp: (data.messageTimestamp || Date.now() / 1000) * 1000,
          type: "text",
          text: data.message?.conversation || "",
        })
      }
    } else if (payload.event === "messages.update") {
      const data = payload.data as {
        key?: { id?: string }
        update?: { status?: number }
      }
      if (data.key?.id) {
        const statusMap: Record<number, WhatsAppStatusUpdate["status"]> = {
          2: "sent", 3: "delivered", 4: "read",
        }
        statuses.push({
          messageId: data.key.id,
          status: statusMap[data.update?.status || 0] || "sent",
          timestamp: Date.now(),
        })
      }
    }

    return { messages, statuses }
  }

  verifySignature(): boolean {
    return true // Evolution API uses API key auth
  }

  verifyWebhook(): string | null {
    return null // Evolution API uses different webhook setup
  }
}

// ═══ Mock Provider (Development) ═══

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "MockProvider"

  private messageCounter = 0

  async sendText(message: WhatsAppTextMessage): Promise<WhatsAppSendResult> {
    this.messageCounter++
    console.log(`[MockWhatsApp] Sending text to ${message.to}: ${message.text.substring(0, 50)}...`)
    return { messageId: `mock_${Date.now()}_${this.messageCounter}`, status: "sent" }
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    this.messageCounter++
    console.log(`[MockWhatsApp] Sending template "${message.templateName}" to ${message.to}`)
    return { messageId: `mock_${Date.now()}_${this.messageCounter}`, status: "sent" }
  }

  async sendMedia(message: WhatsAppMediaMessage): Promise<WhatsAppSendResult> {
    this.messageCounter++
    console.log(`[MockWhatsApp] Sending ${message.type} to ${message.to}: ${message.mediaUrl}`)
    return { messageId: `mock_${Date.now()}_${this.messageCounter}`, status: "sent" }
  }

  parseIncoming(): { messages: WhatsAppIncomingMessage[]; statuses: WhatsAppStatusUpdate[] } {
    return { messages: [], statuses: [] }
  }

  verifySignature(): boolean {
    return true
  }

  verifyWebhook(params: Record<string, string>): string | null {
    return params["hub.challenge"] || null
  }
}

// ═══ Factory ═══

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || "mock"

  switch (provider.toLowerCase()) {
    case "meta":
      return new MetaCloudAPIProvider()
    case "evolution":
      return new EvolutionAPIProvider()
    case "mock":
    default:
      return new MockWhatsAppProvider()
  }
}

// ═══ Mock conversations for dev mode ═══

export interface MockConversation {
  id: string
  phone_number: string
  contact_name: string
  last_message: string
  last_message_at: string
  last_interaction_at: string | null
  unread_count: number
  status: string
  person_id: string | null
  case_id: string | null
  project_id: string | null
  messages: MockMessage[]
}

export interface MockMessage {
  id: string
  direction: string
  type: string
  content: string | null
  media_url: string | null
  media_filename: string | null
  template_name: string | null
  status: string
  created_at: string
}

export function getMockConversations(): MockConversation[] {
  const now = new Date()
  const h = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString()

  return [
    {
      id: "mock-conv-1",
      phone_number: "5544999001001",
      contact_name: "João Silva (Agro Sul Ltda)",
      last_message: "Doutor, quando sai a decisão do alvará?",
      last_message_at: h(0.5),
      last_interaction_at: h(0.5),
      unread_count: 2,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m1", direction: "INBOUND", type: "TEXT", content: "Bom dia, Dr. Roberto!", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(2) },
        { id: "m2", direction: "OUTBOUND", type: "TEXT", content: "Bom dia, João! Como posso ajudar?", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(1.8) },
        { id: "m3", direction: "INBOUND", type: "TEXT", content: "Queria saber sobre o andamento do processo de recuperação judicial.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(1.5) },
        { id: "m4", direction: "OUTBOUND", type: "TEXT", content: "O plano foi aprovado pela AGC na semana passada. Estamos aguardando a homologação judicial.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(1.2) },
        { id: "m5", direction: "INBOUND", type: "TEXT", content: "Ótimo! E o alvará daquele precatório?", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(1) },
        { id: "m6", direction: "INBOUND", type: "TEXT", content: "Doutor, quando sai a decisão do alvará?", media_url: null, media_filename: null, template_name: null, status: "DELIVERED", created_at: h(0.5) },
      ],
    },
    {
      id: "mock-conv-2",
      phone_number: "5544999002002",
      contact_name: "Maria Oliveira",
      last_message: "Documento enviado conforme solicitado",
      last_message_at: h(3),
      last_interaction_at: h(3),
      unread_count: 0,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m7", direction: "OUTBOUND", type: "TEMPLATE", content: "Prezada Maria, informamos que há um prazo processual vencendo em 3 dias úteis...", media_url: null, media_filename: null, template_name: "prazo_proximo", status: "READ", created_at: h(5) },
        { id: "m8", direction: "INBOUND", type: "TEXT", content: "Obrigada pelo aviso! Vou providenciar os documentos.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(4) },
        { id: "m9", direction: "OUTBOUND", type: "TEXT", content: "Perfeito! Precisamos até sexta-feira.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(3.5) },
        { id: "m10", direction: "INBOUND", type: "DOCUMENT", content: "Documento enviado conforme solicitado", media_url: "/mock/doc.pdf", media_filename: "procuracao_atualizada.pdf", template_name: null, status: "DELIVERED", created_at: h(3) },
      ],
    },
    {
      id: "mock-conv-3",
      phone_number: "5544999003003",
      contact_name: "Carlos Santos (Fazenda Boa Vista)",
      last_message: "Segue foto do contrato",
      last_message_at: h(6),
      last_interaction_at: h(6),
      unread_count: 1,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m11", direction: "INBOUND", type: "TEXT", content: "Boa tarde! Preciso mandar a foto do contrato de arrendamento.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(7) },
        { id: "m12", direction: "OUTBOUND", type: "TEXT", content: "Pode enviar, Carlos. Vou analisar.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(6.5) },
        { id: "m13", direction: "INBOUND", type: "IMAGE", content: "Segue foto do contrato", media_url: "/mock/contrato.jpg", media_filename: null, template_name: null, status: "DELIVERED", created_at: h(6) },
      ],
    },
    {
      id: "mock-conv-4",
      phone_number: "5544999004004",
      contact_name: "Ana Paula Ferreira",
      last_message: "Audiência confirmada para dia 25/02 às 14h",
      last_message_at: h(12),
      last_interaction_at: h(12),
      unread_count: 0,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m14", direction: "OUTBOUND", type: "TEMPLATE", content: "Prezada Ana Paula, sua audiência foi designada para 25/02/2026 às 14h00. Confirma presença?", media_url: null, media_filename: null, template_name: "reuniao_confirmacao", status: "READ", created_at: h(14) },
        { id: "m15", direction: "INBOUND", type: "TEXT", content: "Confirmo! Preciso levar algum documento?", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(13) },
        { id: "m16", direction: "OUTBOUND", type: "TEXT", content: "Audiência confirmada para dia 25/02 às 14h. Traga RG e comprovante de residência.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(12) },
      ],
    },
    {
      id: "mock-conv-5",
      phone_number: "5544999005005",
      contact_name: "Roberto Mendes",
      last_message: "[Automático] Olá Roberto! Recebi sua mensagem...",
      last_message_at: h(26),
      last_interaction_at: null,
      unread_count: 1,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m17", direction: "INBOUND", type: "TEXT", content: "Boa noite, gostaria de saber sobre meu processo.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(27) },
        { id: "m18", direction: "OUTBOUND", type: "TEXT", content: "[Automático] Olá Roberto! Recebi sua mensagem e encaminhei ao Dr. Responsável. Ele retornará no próximo horário comercial (seg-sex, 8h-19h).", media_url: null, media_filename: null, template_name: null, status: "DELIVERED", created_at: h(26) },
      ],
    },
    {
      id: "mock-conv-6",
      phone_number: "5599999006006",
      contact_name: "Pedro Lima (Balsas/MA)",
      last_message: "Obrigado pelas informações!",
      last_message_at: h(48),
      last_interaction_at: h(48),
      unread_count: 0,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m19", direction: "OUTBOUND", type: "TEMPLATE", content: "Prezado Pedro, informamos nova movimentação no processo 0001234-56.2024.8.10.0001.", media_url: null, media_filename: null, template_name: "movimentacao_processual", status: "READ", created_at: h(50) },
        { id: "m20", direction: "INBOUND", type: "TEXT", content: "Obrigado pelas informações!", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(48) },
      ],
    },
    {
      id: "mock-conv-7",
      phone_number: "5544999007007",
      contact_name: "Fernanda Costa",
      last_message: "Proposta de acordo: R$ 150.000,00 em 24 parcelas...",
      last_message_at: h(72),
      last_interaction_at: null,
      unread_count: 0,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m21", direction: "OUTBOUND", type: "TEMPLATE", content: "Proposta de acordo: R$ 150.000,00 em 24 parcelas de R$ 6.250,00, com entrada de R$ 15.000,00.", media_url: null, media_filename: null, template_name: "proposta_acordo", status: "READ", created_at: h(72) },
      ],
    },
    {
      id: "mock-conv-8",
      phone_number: "5544999008008",
      contact_name: "Marcos Almeida",
      last_message: "Relatório mensal de atividades",
      last_message_at: h(120),
      last_interaction_at: h(120),
      unread_count: 0,
      status: "ARCHIVED",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m22", direction: "OUTBOUND", type: "DOCUMENT", content: "Relatório mensal de atividades", media_url: "/mock/relatorio.pdf", media_filename: "Relatorio_Jan_2026.pdf", template_name: null, status: "READ", created_at: h(120) },
        { id: "m23", direction: "INBOUND", type: "TEXT", content: "Recebido, obrigado!", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(119) },
      ],
    },
    {
      id: "mock-conv-9",
      phone_number: "5544999009009",
      contact_name: "Luiza Barros",
      last_message: "Segue o comprovante de pagamento",
      last_message_at: h(200),
      last_interaction_at: h(200),
      unread_count: 0,
      status: "ARCHIVED",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m24", direction: "INBOUND", type: "IMAGE", content: "Segue o comprovante de pagamento", media_url: "/mock/comprovante.jpg", media_filename: null, template_name: null, status: "READ", created_at: h(200) },
      ],
    },
    {
      id: "mock-conv-10",
      phone_number: "5544999010010",
      contact_name: "Ricardo Souza (Banco XYZ)",
      last_message: "Informamos que o alvará foi processado.",
      last_message_at: h(300),
      last_interaction_at: h(300),
      unread_count: 0,
      status: "ACTIVE",
      person_id: null,
      case_id: null,
      project_id: null,
      messages: [
        { id: "m25", direction: "INBOUND", type: "TEXT", content: "Informamos que o alvará foi processado. Valor creditado em D+2.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(300) },
        { id: "m26", direction: "OUTBOUND", type: "TEXT", content: "Obrigado pela informação, Ricardo. Vou comunicar ao cliente.", media_url: null, media_filename: null, template_name: null, status: "READ", created_at: h(299) },
      ],
    },
  ]
}
