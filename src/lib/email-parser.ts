import type { EmailActivityType } from "@prisma/client"

// ═══ Types ═══

export interface ExtractedDeadline {
  descricao: string
  dias: number | null
  data_limite: string | null // ISO string
  contagem: "DIAS_UTEIS" | "DIAS_CORRIDOS"
  tipo_prazo: "FATAL" | "ORDINARIO" | "DILIGENCIA" | "AUDIENCIA"
}

export interface ExtractedProcessNumber {
  numero: string // formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  raw: string
}

export interface ExtractedMeeting {
  data: string | null // ISO string
  hora: string | null // HH:mm
  local: string | null
  link: string | null
  participantes: string[]
}

export interface ExtractedCourtInfo {
  vara: string | null
  comarca: string | null
  tribunal: string | null
  juiz: string | null
}

export interface EmailClassification {
  tipo: EmailActivityType
  confianca: number // 0-1
  motivo: string
}

export interface AutoFilledActivity {
  tipo: EmailActivityType
  titulo: string
  descricao: string | null
  deadline: ExtractedDeadline | null
  meeting: ExtractedMeeting | null
  court: ExtractedCourtInfo | null
  processos: ExtractedProcessNumber[]
}

// ═══ Regex patterns ═══

// CNJ format: NNNNNNN-DD.AAAA.J.TR.OOOO
const CNJ_PATTERN = /\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/g

// Deadline patterns (Portuguese legal terms)
const PRAZO_PATTERNS = [
  /prazo\s+(?:de\s+)?(\d+)\s*(?:dias?\s+)?(?:úteis|uteis)/i,
  /prazo\s+(?:de\s+)?(\d+)\s*(?:dias?\s+)?(?:corridos|consecutivos)/i,
  /prazo\s+(?:de\s+)?(\d+)\s*dias?/i,
  /no\s+prazo\s+de\s+(\d+)\s*dias?/i,
  /(?:intimado|citado|notificado).*?(\d+)\s*dias?/i,
]

// Fatal deadline keywords
const PRAZO_FATAL_KEYWORDS = [
  /prazo\s+fatal/i,
  /prazo\s+perempt[oó]rio/i,
  /prazo\s+improrrog[aá]vel/i,
  /sob\s+pena\s+de/i,
  /revelia/i,
  /preclu[sã]o/i,
  /decad[eê]ncia/i,
  /prescri[çc][aã]o/i,
]

// Date patterns (DD/MM/YYYY or DD.MM.YYYY)
const DATE_PATTERNS = [
  /(\d{1,2})[/.](\d{1,2})[/.](\d{4})/g,
  /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi,
]

// Time patterns
const TIME_PATTERN = /(?:às?\s+)?(\d{1,2})[h:](\d{2})(?:\s*(?:h|hs|horas?))?/gi

// Meeting link patterns
const MEETING_LINK_PATTERNS = [
  /https?:\/\/teams\.microsoft\.com\/[^\s"<>]+/gi,
  /https?:\/\/[\w.-]*zoom\.us\/[^\s"<>]+/gi,
  /https?:\/\/meet\.google\.com\/[^\s"<>]+/gi,
]

// Court patterns
const VARA_PATTERN = /(\d+[ªa]?\s*[Vv]ara\s+[^,.\n]{3,50})/i
const COMARCA_PATTERN = /[Cc]omarca\s+(?:de\s+|d[aeo]\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/
const TRIBUNAL_PATTERN = /(TJ[A-Z]{2}|TRF\d|TST|STJ|STF|TRT\s*\d+)/i
const JUIZ_PATTERN = /(?:Ju[ií]z(?:a)?|Des(?:embargador(?:a)?)?|Dr(?:a)?\.?)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/

// Classification keywords
const TYPE_KEYWORDS: Record<EmailActivityType, RegExp[]> = {
  PRAZO: [
    /prazo/i, /intim(?:ação|acao|ado)/i, /cita(?:ção|cao|do)/i,
    /notifica(?:ção|cao|do)/i, /manifesta(?:ção|cao)/i,
  ],
  AUDIENCIA: [
    /audi[eê]ncia/i, /sess[aã]o\s+de\s+julg/i,
    /designad[ao]\s+audi[eê]ncia/i,
  ],
  REUNIAO: [
    /reuni[aã]o/i, /meeting/i, /agenda(?:mento|r)/i,
    /call/i, /teams/i, /zoom/i,
  ],
  DESPACHO: [
    /despacho/i, /decis[aã]o/i, /determinou/i,
    /deferiu/i, /indeferiu/i,
  ],
  DILIGENCIA: [
    /dilig[eê]ncia/i, /per[ií]cia/i, /vistoria/i,
    /inspe[çc][aã]o/i,
  ],
  PETICAO: [
    /peti[çc][aã]o/i, /peticion/i, /protocolar/i,
    /juntada/i,
  ],
  RECURSO: [
    /recurso/i, /apela[çc][aã]o/i, /agravo/i,
    /embargos/i, /contrarraz[oõ]es/i,
  ],
  PROVIDENCIA: [
    /provid[eê]ncia/i, /cumpr(?:ir|imento)/i,
    /comprov(?:ar|ante)/i, /junt(?:ar|ada)/i,
  ],
  OUTRO: [],
}

// Month name to number
const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3,
  maio: 4, junho: 5, julho: 6, agosto: 7,
  setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
}

// ═══ EmailDataExtractor class ═══

export class EmailDataExtractor {
  private subject: string
  private body: string
  private text: string // combined subject + body for matching

  constructor(subject: string, bodyHtml: string) {
    this.subject = subject
    this.body = this.stripHtml(bodyHtml)
    this.text = `${subject}\n${this.body}`
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  extractProcessNumbers(): ExtractedProcessNumber[] {
    const matches: ExtractedProcessNumber[] = []
    const seen = new Set<string>()

    let match: RegExpExecArray | null
    const regex = new RegExp(CNJ_PATTERN.source, "g")

    while ((match = regex.exec(this.text)) !== null) {
      const numero = match[1]
      if (!seen.has(numero)) {
        seen.add(numero)
        matches.push({ numero, raw: match[0] })
      }
    }

    return matches
  }

  extractDeadlineInfo(): ExtractedDeadline | null {
    let dias: number | null = null
    let contagem: "DIAS_UTEIS" | "DIAS_CORRIDOS" = "DIAS_UTEIS"

    // Try specific patterns first
    const utilMatch = this.text.match(PRAZO_PATTERNS[0])
    if (utilMatch) {
      dias = parseInt(utilMatch[1])
      contagem = "DIAS_UTEIS"
    }

    if (!dias) {
      const corridoMatch = this.text.match(PRAZO_PATTERNS[1])
      if (corridoMatch) {
        dias = parseInt(corridoMatch[1])
        contagem = "DIAS_CORRIDOS"
      }
    }

    if (!dias) {
      for (let i = 2; i < PRAZO_PATTERNS.length; i++) {
        const m = this.text.match(PRAZO_PATTERNS[i])
        if (m) {
          dias = parseInt(m[1])
          contagem = "DIAS_UTEIS" // default to business days
          break
        }
      }
    }

    if (!dias) return null

    // Check if fatal
    const isFatal = PRAZO_FATAL_KEYWORDS.some((kw) => kw.test(this.text))

    // Try to extract explicit date
    const dataLimite = this.extractFirstDate()

    // Build description from context
    const descricao = this.extractDeadlineDescription()

    return {
      descricao: descricao || `Prazo de ${dias} dias`,
      dias,
      data_limite: dataLimite,
      contagem,
      tipo_prazo: isFatal ? "FATAL" : "ORDINARIO",
    }
  }

  extractMeetingInfo(): ExtractedMeeting | null {
    const classification = this.classifyEmailType()
    if (classification.tipo !== "REUNIAO" && classification.tipo !== "AUDIENCIA") {
      // Still check if there's a meeting link
      const link = this.extractMeetingLink()
      if (!link) return null
    }

    const data = this.extractFirstDate()
    const hora = this.extractFirstTime()
    const link = this.extractMeetingLink()
    const local = this.extractLocation()

    if (!data && !hora && !link && !local) return null

    return {
      data,
      hora,
      local,
      link,
      participantes: [],
    }
  }

  extractCourtInfo(): ExtractedCourtInfo | null {
    const vara = this.text.match(VARA_PATTERN)?.[1]?.trim() || null
    const comarca = this.text.match(COMARCA_PATTERN)?.[1]?.trim() || null
    const tribunal = this.text.match(TRIBUNAL_PATTERN)?.[1]?.trim() || null
    const juiz = this.text.match(JUIZ_PATTERN)?.[1]?.trim() || null

    if (!vara && !comarca && !tribunal && !juiz) return null

    return { vara, comarca, tribunal, juiz }
  }

  classifyEmailType(): EmailClassification {
    let bestType: EmailActivityType = "OUTRO"
    let bestScore = 0
    let bestMotivo = ""

    for (const [tipo, patterns] of Object.entries(TYPE_KEYWORDS) as [EmailActivityType, RegExp[]][]) {
      if (tipo === "OUTRO") continue

      let score = 0
      const matchedTerms: string[] = []

      for (const pattern of patterns) {
        // Subject matches count double
        if (pattern.test(this.subject)) {
          score += 2
          matchedTerms.push(pattern.source)
        } else if (pattern.test(this.body)) {
          score += 1
          matchedTerms.push(pattern.source)
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestType = tipo
        bestMotivo = `Termos encontrados: ${matchedTerms.slice(0, 3).join(", ")}`
      }
    }

    const maxPossible = Math.max(
      ...Object.values(TYPE_KEYWORDS).map((p) => p.length * 2),
      1
    )
    const confianca = Math.min(bestScore / maxPossible, 1)

    return {
      tipo: bestType,
      confianca: Math.round(confianca * 100) / 100,
      motivo: bestMotivo || "Nenhum termo específico encontrado",
    }
  }

  autoFillActivity(): AutoFilledActivity {
    const classification = this.classifyEmailType()
    const processos = this.extractProcessNumbers()
    const deadline = this.extractDeadlineInfo()
    const meeting = this.extractMeetingInfo()
    const court = this.extractCourtInfo()

    // Build a smart title
    let titulo = this.subject
    if (titulo.length > 100) {
      titulo = titulo.substring(0, 97) + "..."
    }

    // Build description
    const descParts: string[] = []
    if (processos.length > 0) {
      descParts.push(`Processos: ${processos.map((p) => p.numero).join(", ")}`)
    }
    if (deadline) {
      descParts.push(`Prazo: ${deadline.dias} dias (${deadline.contagem === "DIAS_UTEIS" ? "úteis" : "corridos"})`)
    }
    if (court?.vara) {
      descParts.push(`Vara: ${court.vara}`)
    }

    return {
      tipo: classification.tipo,
      titulo,
      descricao: descParts.length > 0 ? descParts.join("\n") : null,
      deadline,
      meeting,
      court,
      processos,
    }
  }

  // ═══ Private helpers ═══

  private extractFirstDate(): string | null {
    // Try DD/MM/YYYY or DD.MM.YYYY
    const dateRegex = /(\d{1,2})[/.](\d{1,2})[/.](\d{4})/
    const match = this.text.match(dateRegex)
    if (match) {
      const day = parseInt(match[1])
      const month = parseInt(match[2]) - 1
      const year = parseInt(match[3])
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
        const date = new Date(year, month, day)
        return date.toISOString()
      }
    }

    // Try written date: "15 de março de 2026"
    const writtenRegex = /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i
    const written = this.text.match(writtenRegex)
    if (written) {
      const day = parseInt(written[1])
      const monthName = written[2].toLowerCase()
      const year = parseInt(written[3])
      const month = MONTH_MAP[monthName]
      if (month !== undefined && day >= 1 && day <= 31 && year >= 2020) {
        const date = new Date(year, month, day)
        return date.toISOString()
      }
    }

    return null
  }

  private extractFirstTime(): string | null {
    const match = this.text.match(/(?:às?\s+)?(\d{1,2})[h:](\d{2})/)
    if (match) {
      const hours = parseInt(match[1])
      const minutes = parseInt(match[2])
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      }
    }
    return null
  }

  private extractMeetingLink(): string | null {
    for (const pattern of MEETING_LINK_PATTERNS) {
      const match = this.text.match(pattern)
      if (match) return match[0]
    }
    return null
  }

  private extractLocation(): string | null {
    const patterns = [
      /(?:local|endere[çc]o|sala)[:]\s*([^\n]{3,80})/i,
      /(?:na|no|em)\s+(sala\s+[^\n,]{2,40})/i,
      /(?:na|no|em)\s+(audit[oó]rio\s+[^\n,]{2,40})/i,
    ]

    for (const pattern of patterns) {
      const match = this.text.match(pattern)
      if (match) return match[1].trim()
    }

    return null
  }

  private extractDeadlineDescription(): string | null {
    // Try to find the sentence containing "prazo"
    const sentences = this.text.split(/[.\n]/).filter(Boolean)
    for (const sentence of sentences) {
      if (/prazo/i.test(sentence) || /intim/i.test(sentence) || /cita/i.test(sentence)) {
        const trimmed = sentence.trim()
        if (trimmed.length > 10 && trimmed.length < 200) {
          return trimmed
        }
      }
    }
    return null
  }
}
