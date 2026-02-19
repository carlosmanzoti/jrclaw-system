/**
 * TribunalProvider — abstract interface for fetching court movements/publications.
 *
 * Implementations:
 *   - DataJudProvider  (CNJ public API — real)
 *   - LegalOneProvider (Thomson Reuters — placeholder)
 *   - ManualProvider   (always configured — manual insertion)
 */

// ── Types ─────────────────────────────────────────────────────

export interface TribunalMovement {
  data: Date
  tipo: string          // DESPACHO | DECISAO | SENTENCA | ACORDAO | PUBLICACAO | INTIMACAO | CITACAO | ATO_ORDINATORIO | OUTRO
  descricao: string
  conteudo_integral?: string
  fonte: string         // DATAJUD | LEGAL_ONE | MANUAL
  fonte_url?: string
  codigo_cnj?: string   // CNJ movement code
}

export interface TribunalPublication {
  data: Date
  diario: string
  caderno: string
  pagina?: string
  conteudo: string
  processo_numero: string
  fonte: string
}

export interface CaseSearchResult {
  numero_processo: string
  tribunal: string
  vara?: string
  comarca?: string
  classe?: string
  assunto?: string
  data_distribuicao?: Date
}

export interface ProviderStatus {
  configured: boolean
  healthy: boolean
  lastCheck?: Date
  message?: string
}

export interface TribunalProvider {
  name: string
  fetchMovements(caseNumber: string): Promise<TribunalMovement[]>
  fetchPublications(oabNumber: string, date: Date): Promise<TribunalPublication[]>
  searchCase(query: string): Promise<CaseSearchResult[]>
  isConfigured(): boolean
  getStatus(): Promise<ProviderStatus>
}

// ── Helpers ───────────────────────────────────────────────────

/** Extracts the tribunal code (digits 14-17) from a CNJ case number */
function extractTribunalCode(caseNumber: string): string | null {
  const clean = caseNumber.replace(/[^0-9]/g, "")
  // CNJ format: NNNNNNN DD AAAA J TR OOOO (20 digits)
  if (clean.length < 17) return null
  return clean.substring(13, 17) // TR + OOOO simplified to 4 digits for tribunal
}

/** Maps CNJ tribunal digits to DataJud API alias */
function getTribunalAlias(caseNumber: string): string | null {
  const clean = caseNumber.replace(/[^0-9]/g, "")
  if (clean.length < 18) return null

  const justica = clean[13]    // J — segmento de justiça
  const tribunal = clean.substring(14, 16) // TR — tribunal

  const map: Record<string, Record<string, string>> = {
    "5": { // Trabalhista
      "01": "trt1", "02": "trt2", "03": "trt3", "04": "trt4", "05": "trt5",
      "06": "trt6", "07": "trt7", "08": "trt8", "09": "trt9", "10": "trt10",
      "11": "trt11", "12": "trt12", "13": "trt13", "14": "trt14", "15": "trt15",
      "16": "trt16", "17": "trt17", "18": "trt18", "19": "trt19", "20": "trt20",
      "21": "trt21", "22": "trt22", "23": "trt23", "24": "trt24",
    },
    "4": { // Federal
      "01": "trf1", "02": "trf2", "03": "trf3", "04": "trf4", "05": "trf5", "06": "trf6",
    },
    "8": { // Estadual
      "01": "tjac", "02": "tjal", "03": "tjap", "04": "tjam", "05": "tjba",
      "06": "tjce", "07": "tjdft", "08": "tjes", "09": "tjgo", "10": "tjma",
      "11": "tjmt", "12": "tjms", "13": "tjmg", "14": "tjpa", "15": "tjpb",
      "16": "tjpr", "17": "tjpe", "18": "tjpi", "19": "tjrj", "20": "tjrn",
      "21": "tjrs", "22": "tjro", "23": "tjrr", "24": "tjsc", "25": "tjsp",
      "26": "tjse", "27": "tjto",
    },
  }

  return map[justica]?.[tribunal] || null
}

/** Maps DataJud movement codes to our MovementType */
function mapMovementType(codigo: number, nome: string): string {
  // CNJ SGT movement code ranges
  if (codigo >= 1 && codigo <= 99) return "DESPACHO"
  if (codigo >= 100 && codigo <= 199) return "DECISAO"
  if (codigo >= 200 && codigo <= 299) return "SENTENCA"
  if (codigo >= 300 && codigo <= 399) return "ACORDAO"
  if (codigo >= 400 && codigo <= 499) return "PUBLICACAO"
  if (codigo >= 500 && codigo <= 599) return "INTIMACAO"
  if (codigo >= 600 && codigo <= 699) return "CITACAO"

  const lower = nome.toLowerCase()
  if (lower.includes("despacho")) return "DESPACHO"
  if (lower.includes("decisão") || lower.includes("decisao")) return "DECISAO"
  if (lower.includes("sentença") || lower.includes("sentenca")) return "SENTENCA"
  if (lower.includes("acórdão") || lower.includes("acordao")) return "ACORDAO"
  if (lower.includes("publicação") || lower.includes("publicacao")) return "PUBLICACAO"
  if (lower.includes("intimação") || lower.includes("intimacao")) return "INTIMACAO"
  if (lower.includes("citação") || lower.includes("citacao")) return "CITACAO"

  return "ATO_ORDINATORIO"
}

// ── In-memory cache ──────────────────────────────────────────

const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

// ── Rate limiter (5 req/s for DataJud) ──────────────────────

let lastRequestTime = 0
const MIN_INTERVAL = 200 // 1000ms / 5 = 200ms between requests

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now()
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequestTime))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequestTime = Date.now()
  return fetch(url, options)
}

// ═════════════════════════════════════════════════════════════
// DataJud Provider — CNJ Public API
// ═════════════════════════════════════════════════════════════

export class DataJudProvider implements TribunalProvider {
  name = "DataJud"
  private apiKey: string
  private baseUrl = "https://api-publica.datajud.cnj.jus.br"

  constructor() {
    this.apiKey = process.env.DATAJUD_API_KEY || ""
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!this.apiKey) {
      return { configured: false, healthy: false, message: "DATAJUD_API_KEY não configurada" }
    }
    try {
      const res = await fetch(`${this.baseUrl}/api_publica_tst/_search?size=1`, {
        method: "POST",
        headers: {
          "Authorization": `APIKey ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: { match_all: {} } }),
      })
      return { configured: true, healthy: res.ok, lastCheck: new Date(), message: res.ok ? "OK" : `HTTP ${res.status}` }
    } catch (err: any) {
      return { configured: true, healthy: false, lastCheck: new Date(), message: err.message }
    }
  }

  async fetchMovements(caseNumber: string): Promise<TribunalMovement[]> {
    if (!this.apiKey) return []

    const cacheKey = `datajud:movements:${caseNumber}`
    const cached = getCached<TribunalMovement[]>(cacheKey)
    if (cached) return cached

    const alias = getTribunalAlias(caseNumber)
    if (!alias) {
      console.warn(`[DataJud] Could not determine tribunal for case: ${caseNumber}`)
      return []
    }

    const cleanNumber = caseNumber.replace(/[^0-9]/g, "")

    try {
      const res = await rateLimitedFetch(
        `${this.baseUrl}/api_publica_${alias}/_search`,
        {
          method: "POST",
          headers: {
            "Authorization": `APIKey ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: {
              match: {
                numeroProcesso: cleanNumber,
              },
            },
            size: 1,
          }),
        }
      )

      if (!res.ok) {
        console.error(`[DataJud] API error ${res.status} for ${caseNumber}`)
        return []
      }

      const data = await res.json()
      const hits = data.hits?.hits || []

      if (hits.length === 0) return []

      const processo = hits[0]._source
      const movimentos: TribunalMovement[] = (processo.movimentos || []).map((mov: any) => ({
        data: new Date(mov.dataHora),
        tipo: mapMovementType(mov.codigo || 0, mov.nome || ""),
        descricao: mov.nome || "Movimentação",
        conteudo_integral: mov.complementosTabelados?.map((c: any) => `${c.nome}: ${c.valor}`).join("; ") || undefined,
        fonte: "DATAJUD",
        codigo_cnj: mov.codigo ? String(mov.codigo) : undefined,
      }))

      // Sort newest first
      movimentos.sort((a, b) => b.data.getTime() - a.data.getTime())

      setCache(cacheKey, movimentos)
      return movimentos
    } catch (err) {
      console.error(`[DataJud] Fetch error for ${caseNumber}:`, err)
      return []
    }
  }

  async fetchPublications(_oabNumber: string, _date: Date): Promise<TribunalPublication[]> {
    // DataJud does not provide DJe publications — placeholder
    return []
  }

  async searchCase(query: string): Promise<CaseSearchResult[]> {
    if (!this.apiKey) return []

    const cleanQuery = query.replace(/[^0-9]/g, "")
    if (cleanQuery.length < 10) return []

    const alias = getTribunalAlias(query)
    if (!alias) return []

    try {
      const res = await rateLimitedFetch(
        `${this.baseUrl}/api_publica_${alias}/_search`,
        {
          method: "POST",
          headers: {
            "Authorization": `APIKey ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: { match: { numeroProcesso: cleanQuery } },
            size: 5,
          }),
        }
      )

      if (!res.ok) return []
      const data = await res.json()

      return (data.hits?.hits || []).map((hit: any) => {
        const src = hit._source
        return {
          numero_processo: src.numeroProcesso,
          tribunal: src.tribunal || alias.toUpperCase(),
          vara: src.orgaoJulgador?.nome,
          comarca: src.orgaoJulgador?.codigoMunicipioIBGE,
          classe: src.classe?.nome,
          assunto: src.assuntos?.[0]?.nome,
          data_distribuicao: src.dataAjuizamento ? new Date(src.dataAjuizamento) : undefined,
        }
      })
    } catch {
      return []
    }
  }
}

// ═════════════════════════════════════════════════════════════
// Legal One Provider — Thomson Reuters (placeholder)
// ═════════════════════════════════════════════════════════════

export class LegalOneProvider implements TribunalProvider {
  name = "LegalOne"

  isConfigured(): boolean {
    return false // Not yet integrated
  }

  async getStatus(): Promise<ProviderStatus> {
    return { configured: false, healthy: false, message: "Integração com Legal One não configurada" }
  }

  async fetchMovements(_caseNumber: string): Promise<TribunalMovement[]> {
    return []
  }

  async fetchPublications(_oabNumber: string, _date: Date): Promise<TribunalPublication[]> {
    return []
  }

  async searchCase(_query: string): Promise<CaseSearchResult[]> {
    return []
  }
}

// ═════════════════════════════════════════════════════════════
// Manual Provider — always configured
// ═════════════════════════════════════════════════════════════

export class ManualProvider implements TribunalProvider {
  name = "Manual"

  isConfigured(): boolean {
    return true
  }

  async getStatus(): Promise<ProviderStatus> {
    return { configured: true, healthy: true, message: "Inserção manual sempre disponível" }
  }

  async fetchMovements(_caseNumber: string): Promise<TribunalMovement[]> {
    return [] // Manual — no automatic fetching
  }

  async fetchPublications(_oabNumber: string, _date: Date): Promise<TribunalPublication[]> {
    return []
  }

  async searchCase(_query: string): Promise<CaseSearchResult[]> {
    return []
  }
}

// ═════════════════════════════════════════════════════════════
// Provider registry
// ═════════════════════════════════════════════════════════════

let _providers: TribunalProvider[] | null = null

export function getProviders(): TribunalProvider[] {
  if (!_providers) {
    _providers = [
      new DataJudProvider(),
      new LegalOneProvider(),
      new ManualProvider(),
    ]
  }
  return _providers
}

export function getActiveProvider(): TribunalProvider | null {
  const providers = getProviders()
  // Return first configured provider (DataJud takes priority)
  return providers.find(p => p.isConfigured() && p.name !== "Manual") || null
}
