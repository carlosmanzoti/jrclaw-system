"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Calendar, Building2, MapPin, Calculator, ArrowLeft,
  ChevronLeft, ChevronRight, Clock, AlertTriangle,
  Info, Scale, Sun, Moon,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ESTADOS_BRASIL } from "@/lib/constants"

// ─── Constants ────────────────────────────────────────────────────

const TRIBUNAL_TIPO_OPTIONS = [
  { value: "ALL", label: "Todos os tribunais" },
  { value: "STF", label: "STF" },
  { value: "STJ", label: "STJ" },
  { value: "TST", label: "TST" },
  { value: "TSE", label: "TSE" },
  { value: "STM", label: "STM" },
  { value: "TJ", label: "Tribunais de Justica (TJ)" },
  { value: "TRF", label: "Tribunais Regionais Federais (TRF)" },
  { value: "TRT", label: "Tribunais Regionais do Trabalho (TRT)" },
  { value: "TRE", label: "Tribunais Regionais Eleitorais (TRE)" },
]

const UF_OPTIONS = [
  { value: "ALL", label: "Todos os estados" },
  ...ESTADOS_BRASIL.map((uf) => ({ value: uf, label: uf })),
]

const HOLIDAY_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  NACIONAL: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  ESTADUAL: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  MUNICIPAL: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  FORENSE: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  PONTO_FACULTATIVO: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
}

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  NACIONAL: "Nacional",
  ESTADUAL: "Estadual",
  MUNICIPAL: "Municipal",
  FORENSE: "Forense",
  PONTO_FACULTATIVO: "Ponto Facultativo",
}

const SUSPENSION_TYPE_LABELS: Record<string, string> = {
  RECESSO_DEZ_JAN: "Recesso Dez/Jan",
  FERIAS_JULHO: "Ferias Julho",
  SUSPENSAO_PRAZOS_ART220: "Suspensão Art. 220 CPC",
  SUSPENSAO_PORTARIA: "Suspensão por Portaria",
  INDISPONIBILIDADE_SISTEMA: "Indisponibilidade de Sistema",
  LUTO_OFICIAL: "Luto Oficial",
  CALAMIDADE: "Calamidade",
  ELEICOES: "Eleicoes",
  OPERACAO_ESPECIAL: "Operacao Especial",
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const WEEKDAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"]

// ─── Types ────────────────────────────────────────────────────────

interface CourtCalendarEntry {
  id: string
  tribunal_codigo: string
  tribunal_nome: string
  tribunal_tipo: string
  uf: string | null
  ano: number
}

interface HolidayEntry {
  id: string
  data: string | Date
  nome: string
  tipo: string
  uf: string | null
  suspende_expediente: boolean
  prazos_prorrogados: boolean
  fundamento_legal: string | null
}

interface SuspensionEntry {
  id: string
  tipo: string
  data_inicio: string | Date
  data_fim: string | Date
  suspende_prazos: boolean
  suspende_audiencias: boolean
  nome: string
  fundamento_legal: string | null
}

// ─── Main Component ───────────────────────────────────────────────

export function CalendarioJudicial() {
  const [ano, setAno] = useState(2026)
  const [tribunalTipo, setTribunalTipo] = useState("ALL")
  const [ufFilter, setUfFilter] = useState("ALL")
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)

  // Business days calculator state
  const [calcDataInicio, setCalcDataInicio] = useState("")
  const [calcDataFim, setCalcDataFim] = useState("")
  const [calcUf, setCalcUf] = useState("PR")
  const [calcTribunal, setCalcTribunal] = useState("")
  const [calcResult, setCalcResult] = useState<{
    dias_corridos: number
    dias_uteis: number
    feriados: number
  } | null>(null)

  // Fetch court calendars
  const { data: calendars, isLoading: calendarsLoading } = trpc.deadlines.courtCalendar.list.useQuery({
    ano,
    tribunal_tipo: tribunalTipo !== "ALL" ? tribunalTipo : undefined,
    uf: ufFilter !== "ALL" ? ufFilter : undefined,
  })

  // Fetch holidays for selected calendar
  const { data: holidays } = trpc.deadlines.courtCalendar.holidays.useQuery(
    {
      calendar_id: selectedCalendarId ?? "",
      date_from: new Date(ano, 0, 1).toISOString(),
      date_to: new Date(ano, 11, 31).toISOString(),
    },
    { enabled: !!selectedCalendarId }
  )

  // Fetch suspensions for selected calendar
  const { data: suspensions } = trpc.deadlines.courtCalendar.suspensions.useQuery(
    { calendar_id: selectedCalendarId ?? "" },
    { enabled: !!selectedCalendarId }
  )

  // Business days calculation
  const calcMutation = trpc.deadlines.courtCalendar.calculateBusinessDays.useQuery(
    {
      data_inicio: calcDataInicio ? new Date(calcDataInicio).toISOString() : "",
      data_fim: calcDataFim ? new Date(calcDataFim).toISOString() : "",
      uf: calcUf,
      tribunal_codigo: calcTribunal || undefined,
    },
    {
      enabled: false,
    }
  )

  const handleCalculate = () => {
    if (!calcDataInicio || !calcDataFim) return
    calcMutation.refetch().then((result) => {
      if (result.data) {
        setCalcResult(result.data as unknown as { dias_corridos: number; dias_uteis: number; feriados: number })
      }
    })
  }

  // Build holiday date set for mini calendar highlighting
  const holidayDates = useMemo(() => {
    const dates = new Set<string>()
    if (holidays) {
      for (const h of holidays as HolidayEntry[]) {
        const d = new Date(h.data)
        dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
      }
    }
    return dates
  }, [holidays])

  // Build suspension date ranges for highlighting
  const suspensionRanges = useMemo(() => {
    if (!suspensions) return []
    return (suspensions as SuspensionEntry[]).map((s) => ({
      start: new Date(s.data_inicio),
      end: new Date(s.data_fim),
      nome: s.nome,
    }))
  }, [suspensions])

  const isInSuspension = (date: Date): boolean => {
    return suspensionRanges.some((r) => date >= r.start && date <= r.end)
  }

  // Select first calendar when list loads
  const calendarsList = (calendars ?? []) as CourtCalendarEntry[]
  const selectedCalendar = calendarsList.find((c) => c.id === selectedCalendarId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link href="/prazos">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="size-6 text-[#C9A961]" />
              Calendário Judicial {ano}
            </h1>
            <p className="text-[#666666] mt-1">
              Feriados, suspensoes e recessos dos tribunais
            </p>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setAno(ano - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-lg font-bold w-16 text-center">{ano}</span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setAno(ano + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={tribunalTipo} onValueChange={(v) => { setTribunalTipo(v); setSelectedCalendarId(null) }}>
          <SelectTrigger className="w-[260px] bg-white h-9">
            <Building2 className="size-3.5 mr-1.5 text-[#666666]" />
            <SelectValue placeholder="Tipo de tribunal" />
          </SelectTrigger>
          <SelectContent>
            {TRIBUNAL_TIPO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ufFilter} onValueChange={(v) => { setUfFilter(v); setSelectedCalendarId(null) }}>
          <SelectTrigger className="w-[180px] bg-white h-9">
            <MapPin className="size-3.5 mr-1.5 text-[#666666]" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {UF_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tribunal selector cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {calendarsLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4 pb-4">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : calendarsList.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-[#666666]">
            <Building2 className="size-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhum calendario encontrado</p>
            <p className="text-sm">Ajuste os filtros acima.</p>
          </div>
        ) : (
          calendarsList.map((cal) => (
            <Card
              key={cal.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCalendarId === cal.id
                  ? "ring-2 ring-[#C9A961] border-[#C9A961]"
                  : ""
              }`}
              onClick={() => setSelectedCalendarId(cal.id)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold line-clamp-1">{cal.tribunal_nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {cal.tribunal_tipo}
                      </Badge>
                      {cal.uf && (
                        <Badge variant="secondary" className="text-[10px]">
                          {cal.uf}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {cal.tribunal_codigo}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Annual Calendar Grid */}
      {selectedCalendarId && (
        <div className="space-y-6">
          {selectedCalendar && (
            <div className="flex items-center gap-2 text-sm text-[#666666]">
              <Building2 className="size-4" />
              <span className="font-medium text-gray-800">{selectedCalendar.tribunal_nome}</span>
              <span>-</span>
              <span>{ano}</span>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-red-400" />
              <span>Feriado Nacional</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-orange-400" />
              <span>Feriado Estadual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-purple-400" />
              <span>Feriado Forense</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-gray-400" />
              <span>Ponto Facultativo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-blue-400" />
              <span>Suspensão</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-gray-200" />
              <span>Fim de semana</span>
            </div>
          </div>

          {/* 12 Mini Months */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, monthIdx) => (
              <MiniMonth
                key={monthIdx}
                year={ano}
                month={monthIdx}
                holidayDates={holidayDates}
                holidays={(holidays ?? []) as HolidayEntry[]}
                isInSuspension={isInSuspension}
              />
            ))}
          </div>

          {/* Holidays List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="size-4 text-[#C9A961]" />
                Feriados ({((holidays ?? []) as HolidayEntry[]).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {((holidays ?? []) as HolidayEntry[]).length === 0 ? (
                <p className="text-sm text-[#666666] py-4 text-center">
                  Nenhum feriado cadastrado para este tribunal.
                </p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[110px]">Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="w-[120px]">Tipo</TableHead>
                        <TableHead className="w-[100px]">Suspende</TableHead>
                        <TableHead className="w-[100px]">Prorroga</TableHead>
                        <TableHead>Fundamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((holidays ?? []) as HolidayEntry[]).map((h) => {
                        const colors = HOLIDAY_TYPE_COLORS[h.tipo] || HOLIDAY_TYPE_COLORS.PONTO_FACULTATIVO
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="font-mono text-xs">
                              {new Date(h.data).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-sm">{h.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${colors.bg} ${colors.text}`}>
                                {HOLIDAY_TYPE_LABELS[h.tipo] || h.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {h.suspende_expediente ? (
                                <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600">Sim</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Nao</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {h.prazos_prorrogados ? (
                                <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600">Sim</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Nao</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-[#666666] max-w-[200px] truncate">
                              {h.fundamento_legal || "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Suspensions List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="size-4 text-blue-600" />
                Suspensoes e Recessos ({((suspensions ?? []) as SuspensionEntry[]).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {((suspensions ?? []) as SuspensionEntry[]).length === 0 ? (
                <p className="text-sm text-[#666666] py-4 text-center">
                  Nenhuma suspensao cadastrada para este tribunal.
                </p>
              ) : (
                <div className="space-y-3">
                  {((suspensions ?? []) as SuspensionEntry[]).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50/50"
                    >
                      <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{s.nome}</p>
                          <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700">
                            {SUSPENSION_TYPE_LABELS[s.tipo] || s.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#666666] mt-1">
                          {new Date(s.data_inicio).toLocaleDateString("pt-BR")} a{" "}
                          {new Date(s.data_fim).toLocaleDateString("pt-BR")}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          {s.suspende_prazos && (
                            <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600">
                              <AlertTriangle className="size-3 mr-1" />
                              Suspende prazos
                            </Badge>
                          )}
                          {s.suspende_audiencias && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600">
                              Suspende audiencias
                            </Badge>
                          )}
                        </div>
                        {s.fundamento_legal && (
                          <p className="text-[10px] text-[#666666] mt-1">
                            <Scale className="size-3 inline mr-1" />
                            {s.fundamento_legal}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Days Calculator */}
      <Card className="border-[#C9A961]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="size-4 text-[#C9A961]" />
            Calculadora de Dias Uteis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={calcDataInicio}
                onChange={(e) => { setCalcDataInicio(e.target.value); setCalcResult(null) }}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={calcDataFim}
                onChange={(e) => { setCalcDataFim(e.target.value); setCalcResult(null) }}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UF</Label>
              <Select value={calcUf} onValueChange={(v) => { setCalcUf(v); setCalcResult(null) }}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASIL.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tribunal (opcional)</Label>
              <Input
                placeholder="Ex: TJPR"
                value={calcTribunal}
                onChange={(e) => { setCalcTribunal(e.target.value); setCalcResult(null) }}
                className="bg-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!calcDataInicio || !calcDataFim || calcMutation.isFetching}
                onClick={handleCalculate}
              >
                <Calculator className="size-4 mr-1.5" />
                Calcular
              </Button>
            </div>
          </div>

          {/* Calculation Result */}
          {calcResult && (
            <div className="mt-4 grid gap-3 grid-cols-3">
              <div className="p-4 rounded-lg bg-[#FAFAFA] border text-center">
                <p className="text-2xl font-bold text-gray-800">{calcResult.dias_corridos}</p>
                <p className="text-xs text-[#666666] mt-1">Dias corridos</p>
              </div>
              <div className="p-4 rounded-lg bg-[#C9A961]/10 border border-[#C9A961]/30 text-center">
                <p className="text-2xl font-bold text-[#C9A961]">{calcResult.dias_uteis}</p>
                <p className="text-xs text-[#666666] mt-1">Dias uteis</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-2xl font-bold text-[#DC3545]">{calcResult.feriados}</p>
                <p className="text-xs text-[#666666] mt-1">Feriados no periodo</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Mini Month Component ─────────────────────────────────────────

function MiniMonth({
  year,
  month,
  holidayDates,
  holidays,
  isInSuspension,
}: {
  year: number
  month: number
  holidayDates: Set<string>
  holidays: HolidayEntry[]
  isInSuspension: (date: Date) => boolean
}) {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build calendar grid (6 weeks max = 42 cells)
  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < 42) cells.push(null)

  const getDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const getDayClasses = (day: number): string => {
    const date = new Date(year, month, day)
    const weekday = date.getDay()
    const dateKey = getDateKey(day)
    const isHoliday = holidayDates.has(dateKey)
    const isSuspension = isInSuspension(date)
    const isWeekend = weekday === 0 || weekday === 6

    // Find the holiday type for color coding
    if (isHoliday) {
      const holiday = holidays.find((h) => {
        const hd = new Date(h.data)
        return hd.getDate() === day && hd.getMonth() === month
      })
      if (holiday) {
        switch (holiday.tipo) {
          case "NACIONAL": return "bg-red-400 text-white font-bold"
          case "ESTADUAL": return "bg-orange-400 text-white font-bold"
          case "MUNICIPAL": return "bg-amber-400 text-white font-bold"
          case "FORENSE": return "bg-purple-400 text-white font-bold"
          case "PONTO_FACULTATIVO": return "bg-gray-400 text-white"
          default: return "bg-red-300 text-white"
        }
      }
      return "bg-red-400 text-white font-bold"
    }
    if (isSuspension) return "bg-blue-300 text-white font-medium"
    if (isWeekend) return "bg-gray-100 text-gray-400"
    return "text-gray-700 hover:bg-gray-50"
  }

  // Count holidays in this month
  const monthHolidayCount = holidays.filter((h) => {
    const d = new Date(h.data)
    return d.getMonth() === month
  }).length

  return (
    <Card className="overflow-hidden">
      <div className="px-3 py-2 bg-[#FAFAFA] border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">{MONTH_NAMES[month]}</h3>
        {monthHolidayCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {monthHolidayCount} feriado(s)
          </Badge>
        )}
      </div>
      <CardContent className="p-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {WEEKDAY_SHORT.map((day, i) => (
            <div
              key={i}
              className={`text-center text-[10px] font-medium py-0.5 ${
                i === 0 || i === 6 ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => (
            <div
              key={idx}
              className={`text-center text-[11px] rounded-sm h-6 flex items-center justify-center ${
                day ? getDayClasses(day) : ""
              }`}
              title={day ? getHolidayTooltip(day, month, holidays, isInSuspension, year) : undefined}
            >
              {day || ""}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────

function getHolidayTooltip(
  day: number,
  month: number,
  holidays: HolidayEntry[],
  isInSuspension: (date: Date) => boolean,
  year: number
): string {
  const date = new Date(year, month, day)
  const holiday = holidays.find((h) => {
    const d = new Date(h.data)
    return d.getDate() === day && d.getMonth() === month
  })

  const parts: string[] = []
  if (holiday) {
    parts.push(`${holiday.nome} (${HOLIDAY_TYPE_LABELS[holiday.tipo] || holiday.tipo})`)
  }
  if (isInSuspension(date)) {
    parts.push("Período de suspensão")
  }

  return parts.join(" | ")
}
