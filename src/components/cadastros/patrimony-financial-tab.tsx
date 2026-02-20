"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatPercent, formatMultiple, getIndicatorColor } from "./patrimony-tab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Plus, Pencil, Trash2 } from "lucide-react"

// ─── Types ───────────────────────────────────────────────

interface FinancialFormData {
  year: number | ""
  period: string
  quarter: number | ""
  // DRE
  grossRevenue: string
  netRevenue: string
  cogs: string
  grossProfit: string
  operatingExpenses: string
  ebitda: string
  depreciation: string
  ebit: string
  financialExpenses: string
  financialIncome: string
  netIncome: string
  // Balance Sheet
  totalAssets: string
  currentAssets: string
  nonCurrentAssets: string
  totalLiabilities: string
  currentLiabilities: string
  nonCurrentLiabilities: string
  equity: string
  cash: string
  // Debt
  totalDebt: string
  shortTermDebt: string
  longTermDebt: string
  netDebt: string
  // Cash Flow
  operatingCashFlow: string
  investingCashFlow: string
  financingCashFlow: string
  // Source
  source: string
  documentUrl: string
  notes: string
}

const EMPTY_FORM: FinancialFormData = {
  year: "",
  period: "ANUAL",
  quarter: "",
  grossRevenue: "",
  netRevenue: "",
  cogs: "",
  grossProfit: "",
  operatingExpenses: "",
  ebitda: "",
  depreciation: "",
  ebit: "",
  financialExpenses: "",
  financialIncome: "",
  netIncome: "",
  totalAssets: "",
  currentAssets: "",
  nonCurrentAssets: "",
  totalLiabilities: "",
  currentLiabilities: "",
  nonCurrentLiabilities: "",
  equity: "",
  cash: "",
  totalDebt: "",
  shortTermDebt: "",
  longTermDebt: "",
  netDebt: "",
  operatingCashFlow: "",
  investingCashFlow: "",
  financingCashFlow: "",
  source: "",
  documentUrl: "",
  notes: "",
}

const SOURCE_OPTIONS = [
  "Balanco auditado",
  "Balancete gerencial",
  "Estimativa",
]

// ─── Helpers ─────────────────────────────────────────────

/** Convert centavos (API) to display value in Reais */
function centsToReais(cents: number): string {
  if (!cents) return ""
  return (cents / 100).toFixed(2)
}

/** Convert user input (Reais) to centavos for API */
function reaisToCents(reais: string): number | undefined {
  if (!reais || reais.trim() === "") return undefined
  const val = parseFloat(reais)
  if (isNaN(val)) return undefined
  return Math.round(val * 100)
}

/** Format a centavos value for display in the DRE statement */
function fmtDre(cents: number, negative?: boolean): string {
  if (!cents) return "R$ 0,00"
  const abs = Math.abs(cents / 100)
  const formatted = abs.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (negative && cents > 0) return `R$ (${formatted})`
  return `R$ ${formatted}`
}

/** Calculate margin percentage */
function calcMargin(value: number, base: number): string {
  if (!base || base === 0) return ""
  const pct = (value / base) * 100
  return `${pct.toFixed(1)}%`
}

// ─── Indicator Labels ────────────────────────────────────

const INDICATOR_LABELS: Record<string, string> = {
  debtToEquity: "Divida / PL",
  debtToEbitda: "Div.Liq. / EBITDA",
  currentRatio: "Liquidez Corrente",
  grossMargin: "Margem Bruta",
  ebitdaMargin: "Margem EBITDA",
  netMargin: "Margem Liquida",
  roe: "ROE",
}

function formatIndicatorValue(key: string, value: number | null): string {
  if (value === null || value === undefined) return "--"
  if (key === "debtToEquity" || key === "debtToEbitda" || key === "currentRatio") {
    return formatMultiple(value)
  }
  return formatPercent(value)
}

// ─── DRE Display ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DreStatement({ data }: { data: any }) {
  if (!data) return null

  const netRev = data.netRevenue || 0
  const deductions = (data.grossRevenue || 0) - netRev

  const lines = [
    { label: "Receita Bruta", value: data.grossRevenue, negative: false, margin: "" },
    { label: "(-) Deducoes", value: deductions, negative: true, margin: "" },
    { separator: true },
    { label: "= Receita Liquida", value: netRev, negative: false, margin: "", bold: true },
    { label: "(-) CMV/CPV", value: data.cogs, negative: true, margin: "" },
    { separator: true },
    { label: "= Lucro Bruto", value: data.grossProfit, negative: false, margin: calcMargin(data.grossProfit, netRev), bold: true },
    { label: "(-) Despesas Operacionais", value: data.operatingExpenses, negative: true, margin: "" },
    { separator: true },
    { label: "= EBITDA", value: data.ebitda, negative: false, margin: calcMargin(data.ebitda, netRev), bold: true },
    { label: "(-) Depreciacao", value: data.depreciation, negative: true, margin: "" },
    { label: "= EBIT", value: data.ebit, negative: false, margin: calcMargin(data.ebit, netRev), bold: true },
    { label: "(-) Despesas Financeiras", value: data.financialExpenses, negative: true, margin: "" },
    { label: "(+) Receitas Financeiras", value: data.financialIncome, negative: false, margin: "" },
    { doubleSeparator: true },
    { label: "= Lucro Liquido", value: data.netIncome, negative: false, margin: calcMargin(data.netIncome, netRev), bold: true, highlight: true },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">DRE - Demonstracao do Resultado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-sm space-y-0.5">
          {lines.map((line, idx) => {
            if ("separator" in line && line.separator) {
              return (
                <div key={idx} className="border-t border-dashed border-muted-foreground/30 my-1" />
              )
            }
            if ("doubleSeparator" in line && line.doubleSeparator) {
              return (
                <div key={idx} className="border-t-2 border-muted-foreground/50 my-1" />
              )
            }
            const l = line as {
              label: string
              value: number
              negative?: boolean
              margin: string
              bold?: boolean
              highlight?: boolean
            }
            return (
              <div
                key={idx}
                className={`grid grid-cols-[1fr_auto_auto] gap-4 py-0.5 px-2 rounded ${
                  l.highlight
                    ? "bg-[#C9A961]/10 font-bold"
                    : l.bold
                      ? "font-semibold"
                      : ""
                }`}
              >
                <span className="truncate">{l.label}</span>
                <span className="text-right whitespace-nowrap tabular-nums">
                  {fmtDre(l.value, l.negative)}
                </span>
                <span className="text-right text-muted-foreground w-16 tabular-nums">
                  {l.margin}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Balance Sheet Display ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BalanceSheet({ data }: { data: any }) {
  if (!data) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Balanco Patrimonial</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ATIVO */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">ATIVO</h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span>Circulante</span>
                <span className="tabular-nums">{formatCurrency(data.currentAssets)}</span>
              </div>
              <div className="flex justify-between">
                <span>Nao Circulante</span>
                <span className="tabular-nums">{formatCurrency(data.nonCurrentAssets)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>TOTAL ATIVO</span>
                <span className="tabular-nums">{formatCurrency(data.totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* PASSIVO + PL */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">PASSIVO + PL</h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span>Circulante</span>
                <span className="tabular-nums">{formatCurrency(data.currentLiabilities)}</span>
              </div>
              <div className="flex justify-between">
                <span>Nao Circulante</span>
                <span className="tabular-nums">{formatCurrency(data.nonCurrentLiabilities)}</span>
              </div>
              <div className="flex justify-between">
                <span>Patrimonio Liquido</span>
                <span className="tabular-nums">{formatCurrency(data.equity)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>TOTAL PASSIVO + PL</span>
                <span className="tabular-nums">
                  {formatCurrency(
                    (data.totalLiabilities || 0) + (data.equity || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Indicators Display ──────────────────────────────────

function IndicatorsGrid({
  indicators,
}: {
  indicators: {
    year: number
    debtToEquity: number | null
    debtToEbitda: number | null
    currentRatio: number | null
    grossMargin: number | null
    ebitdaMargin: number | null
    netMargin: number | null
    roe: number | null
  } | null | undefined
}) {
  if (!indicators) return null

  const keys: (keyof typeof INDICATOR_LABELS)[] = [
    "debtToEquity",
    "debtToEbitda",
    "grossMargin",
    "ebitdaMargin",
    "netMargin",
    "currentRatio",
    "roe",
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Indicadores Financeiros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {keys.map((key) => {
            const value = indicators[key as keyof typeof indicators] as number | null
            const color = getIndicatorColor(key, value)
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {INDICATOR_LABELS[key]}
                  </p>
                  <p className="font-semibold text-sm tabular-nums">
                    {formatIndicatorValue(key, value)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Evolution Chart ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EvolutionChart({ financials }: { financials: any[] }) {
  if (!financials || financials.length === 0) return null

  const chartData = [...financials]
    .sort((a, b) => a.year - b.year)
    .map((f) => ({
      year: String(f.year),
      grossRevenue: (f.grossRevenue || 0) / 100,
      ebitda: (f.ebitda || 0) / 100,
    }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Evolucao Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="year" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(v: number) =>
                  v >= 1000000
                    ? `${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(0)}K`
                      : String(v)
                }
              />
              <Tooltip
                formatter={(value: unknown) =>
                  Number(value).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                }
              />
              <Legend />
              <Bar
                dataKey="grossRevenue"
                name="Receita Bruta"
                fill="#C9A961"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="ebitda"
                name="EBITDA"
                fill="#8B7355"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Financial Form Dialog ───────────────────────────────

function FinancialFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isLoading,
  isEditing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: FinancialFormData
  setForm: React.Dispatch<React.SetStateAction<FinancialFormData>>
  onSubmit: () => void
  isLoading: boolean
  isEditing: boolean
}) {
  const updateField = <K extends keyof FinancialFormData>(
    key: K,
    value: FinancialFormData[K]
  ) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      // Auto-calculate netDebt when totalDebt or cash changes
      if (key === "totalDebt" || key === "cash") {
        const debt = parseFloat(key === "totalDebt" ? (value as string) : prev.totalDebt) || 0
        const cash = parseFloat(key === "cash" ? (value as string) : prev.cash) || 0
        updated.netDebt = debt > 0 || cash > 0 ? String(debt - cash) : ""
      }
      return updated
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Exercicio Financeiro" : "Novo Exercicio Financeiro"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Periodo */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Periodo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="fin-year">Ano *</Label>
                <Input
                  id="fin-year"
                  type="number"
                  value={form.year}
                  onChange={(e) =>
                    updateField("year", e.target.value ? parseInt(e.target.value) : "")
                  }
                  placeholder="2024"
                />
              </div>
              <div>
                <Label>Periodo</Label>
                <Select
                  value={form.period}
                  onValueChange={(v) => updateField("period", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANUAL">Anual</SelectItem>
                    <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.period === "TRIMESTRAL" && (
                <div>
                  <Label htmlFor="fin-quarter">Trimestre</Label>
                  <Select
                    value={form.quarter ? String(form.quarter) : ""}
                    onValueChange={(v) => updateField("quarter", v ? parseInt(v) : "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1o Trimestre</SelectItem>
                      <SelectItem value="2">2o Trimestre</SelectItem>
                      <SelectItem value="3">3o Trimestre</SelectItem>
                      <SelectItem value="4">4o Trimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* DRE */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              DRE - Demonstracao do Resultado (R$)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="fin-grossRevenue">Receita Bruta</Label>
                <Input
                  id="fin-grossRevenue"
                  type="number"
                  step="0.01"
                  value={form.grossRevenue}
                  onChange={(e) => updateField("grossRevenue", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-netRevenue">Receita Liquida</Label>
                <Input
                  id="fin-netRevenue"
                  type="number"
                  step="0.01"
                  value={form.netRevenue}
                  onChange={(e) => updateField("netRevenue", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-cogs">CMV/CPV</Label>
                <Input
                  id="fin-cogs"
                  type="number"
                  step="0.01"
                  value={form.cogs}
                  onChange={(e) => updateField("cogs", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-grossProfit">Lucro Bruto</Label>
                <Input
                  id="fin-grossProfit"
                  type="number"
                  step="0.01"
                  value={form.grossProfit}
                  onChange={(e) => updateField("grossProfit", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-operatingExpenses">Despesas Operacionais</Label>
                <Input
                  id="fin-operatingExpenses"
                  type="number"
                  step="0.01"
                  value={form.operatingExpenses}
                  onChange={(e) => updateField("operatingExpenses", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-ebitda">EBITDA</Label>
                <Input
                  id="fin-ebitda"
                  type="number"
                  step="0.01"
                  value={form.ebitda}
                  onChange={(e) => updateField("ebitda", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-depreciation">Depreciacao</Label>
                <Input
                  id="fin-depreciation"
                  type="number"
                  step="0.01"
                  value={form.depreciation}
                  onChange={(e) => updateField("depreciation", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-ebit">EBIT</Label>
                <Input
                  id="fin-ebit"
                  type="number"
                  step="0.01"
                  value={form.ebit}
                  onChange={(e) => updateField("ebit", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-financialExpenses">Despesas Financeiras</Label>
                <Input
                  id="fin-financialExpenses"
                  type="number"
                  step="0.01"
                  value={form.financialExpenses}
                  onChange={(e) => updateField("financialExpenses", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-financialIncome">Receitas Financeiras</Label>
                <Input
                  id="fin-financialIncome"
                  type="number"
                  step="0.01"
                  value={form.financialIncome}
                  onChange={(e) => updateField("financialIncome", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-netIncome">Lucro Liquido</Label>
                <Input
                  id="fin-netIncome"
                  type="number"
                  step="0.01"
                  value={form.netIncome}
                  onChange={(e) => updateField("netIncome", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Balance Sheet */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Balanco Patrimonial (R$)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="fin-totalAssets">Ativo Total</Label>
                <Input
                  id="fin-totalAssets"
                  type="number"
                  step="0.01"
                  value={form.totalAssets}
                  onChange={(e) => updateField("totalAssets", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-currentAssets">Circulante</Label>
                <Input
                  id="fin-currentAssets"
                  type="number"
                  step="0.01"
                  value={form.currentAssets}
                  onChange={(e) => updateField("currentAssets", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-nonCurrentAssets">Nao Circulante</Label>
                <Input
                  id="fin-nonCurrentAssets"
                  type="number"
                  step="0.01"
                  value={form.nonCurrentAssets}
                  onChange={(e) => updateField("nonCurrentAssets", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-totalLiabilities">Passivo Total</Label>
                <Input
                  id="fin-totalLiabilities"
                  type="number"
                  step="0.01"
                  value={form.totalLiabilities}
                  onChange={(e) => updateField("totalLiabilities", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-currentLiabilities">Circulante</Label>
                <Input
                  id="fin-currentLiabilities"
                  type="number"
                  step="0.01"
                  value={form.currentLiabilities}
                  onChange={(e) => updateField("currentLiabilities", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-nonCurrentLiabilities">Nao Circulante</Label>
                <Input
                  id="fin-nonCurrentLiabilities"
                  type="number"
                  step="0.01"
                  value={form.nonCurrentLiabilities}
                  onChange={(e) => updateField("nonCurrentLiabilities", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-equity">Patrimonio Liquido</Label>
                <Input
                  id="fin-equity"
                  type="number"
                  step="0.01"
                  value={form.equity}
                  onChange={(e) => updateField("equity", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-cash">Caixa</Label>
                <Input
                  id="fin-cash"
                  type="number"
                  step="0.01"
                  value={form.cash}
                  onChange={(e) => updateField("cash", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Debt */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Endividamento (R$)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="fin-totalDebt">Divida Total</Label>
                <Input
                  id="fin-totalDebt"
                  type="number"
                  step="0.01"
                  value={form.totalDebt}
                  onChange={(e) => updateField("totalDebt", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-shortTermDebt">Curto Prazo</Label>
                <Input
                  id="fin-shortTermDebt"
                  type="number"
                  step="0.01"
                  value={form.shortTermDebt}
                  onChange={(e) => updateField("shortTermDebt", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-longTermDebt">Longo Prazo</Label>
                <Input
                  id="fin-longTermDebt"
                  type="number"
                  step="0.01"
                  value={form.longTermDebt}
                  onChange={(e) => updateField("longTermDebt", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-netDebt">Divida Liquida (auto)</Label>
                <Input
                  id="fin-netDebt"
                  type="number"
                  step="0.01"
                  value={form.netDebt}
                  readOnly
                  className="bg-muted"
                  placeholder="Divida Total - Caixa"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Cash Flow */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Fluxo de Caixa (R$)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="fin-operatingCashFlow">Operacional</Label>
                <Input
                  id="fin-operatingCashFlow"
                  type="number"
                  step="0.01"
                  value={form.operatingCashFlow}
                  onChange={(e) => updateField("operatingCashFlow", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-investingCashFlow">Investimento</Label>
                <Input
                  id="fin-investingCashFlow"
                  type="number"
                  step="0.01"
                  value={form.investingCashFlow}
                  onChange={(e) => updateField("investingCashFlow", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="fin-financingCashFlow">Financiamento</Label>
                <Input
                  id="fin-financingCashFlow"
                  type="number"
                  step="0.01"
                  value={form.financingCashFlow}
                  onChange={(e) => updateField("financingCashFlow", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Source */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Fonte e Documento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Fonte</Label>
                <Select
                  value={SOURCE_OPTIONS.includes(form.source) ? form.source : "__custom__"}
                  onValueChange={(v) => {
                    if (v === "__custom__") {
                      updateField("source", "")
                    } else {
                      updateField("source", v)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Outra...</SelectItem>
                  </SelectContent>
                </Select>
                {!SOURCE_OPTIONS.includes(form.source) && form.source !== "" && (
                  <Input
                    className="mt-2"
                    value={form.source}
                    onChange={(e) => updateField("source", e.target.value)}
                    placeholder="Especifique a fonte"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="fin-documentUrl">URL do Documento</Label>
                <Input
                  id="fin-documentUrl"
                  value={form.documentUrl}
                  onChange={(e) => updateField("documentUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="fin-notes">Observacoes</Label>
                <Textarea
                  id="fin-notes"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Observacoes sobre os dados financeiros..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading || !form.year}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            {isLoading
              ? "Salvando..."
              : isEditing
                ? "Salvar Alteracoes"
                : "Criar Exercicio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────

export function PatrimonyFinancialTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils()

  // ---- State ----
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FinancialFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ---- Queries ----
  const financialsQuery = trpc.patrimony.financials.list.useQuery({ clientId })
  const financials = financialsQuery.data ?? []

  // Set default selected year to latest
  const years = financials.map((f) => f.year).sort((a, b) => b - a)
  const effectiveYear = selectedYear ?? (years.length > 0 ? years[0] : null)

  const indicatorsQuery = trpc.patrimony.financials.getIndicators.useQuery(
    { clientId, year: effectiveYear! },
    { enabled: !!effectiveYear }
  )

  // Find the data for the selected year
  const selectedData = effectiveYear
    ? financials.find((f) => f.year === effectiveYear)
    : null

  // ---- Mutations ----
  const createMutation = trpc.patrimony.financials.create.useMutation({
    onSuccess: () => {
      utils.patrimony.financials.list.invalidate({ clientId })
      if (effectiveYear) {
        utils.patrimony.financials.getIndicators.invalidate({
          clientId,
          year: effectiveYear,
        })
      }
      setFormOpen(false)
      resetForm()
    },
  })

  const updateMutation = trpc.patrimony.financials.update.useMutation({
    onSuccess: () => {
      utils.patrimony.financials.list.invalidate({ clientId })
      if (effectiveYear) {
        utils.patrimony.financials.getIndicators.invalidate({
          clientId,
          year: effectiveYear,
        })
      }
      setFormOpen(false)
      resetForm()
    },
  })

  const deleteMutation = trpc.patrimony.financials.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.financials.list.invalidate({ clientId })
      setSelectedYear(null)
    },
  })

  // ---- Handlers ----
  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function handleNew() {
    resetForm()
    setFormOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEdit(record: any) {
    setEditingId(record.id)
    setForm({
      year: record.year,
      period: record.period || "ANUAL",
      quarter: record.quarter || "",
      grossRevenue: centsToReais(record.grossRevenue),
      netRevenue: centsToReais(record.netRevenue),
      cogs: centsToReais(record.cogs),
      grossProfit: centsToReais(record.grossProfit),
      operatingExpenses: centsToReais(record.operatingExpenses),
      ebitda: centsToReais(record.ebitda),
      depreciation: centsToReais(record.depreciation),
      ebit: centsToReais(record.ebit),
      financialExpenses: centsToReais(record.financialExpenses),
      financialIncome: centsToReais(record.financialIncome),
      netIncome: centsToReais(record.netIncome),
      totalAssets: centsToReais(record.totalAssets),
      currentAssets: centsToReais(record.currentAssets),
      nonCurrentAssets: centsToReais(record.nonCurrentAssets),
      totalLiabilities: centsToReais(record.totalLiabilities),
      currentLiabilities: centsToReais(record.currentLiabilities),
      nonCurrentLiabilities: centsToReais(record.nonCurrentLiabilities),
      equity: centsToReais(record.equity),
      cash: centsToReais(record.cash),
      totalDebt: centsToReais(record.totalDebt),
      shortTermDebt: centsToReais(record.shortTermDebt),
      longTermDebt: centsToReais(record.longTermDebt),
      netDebt: centsToReais(record.netDebt),
      operatingCashFlow: centsToReais(record.operatingCashFlow),
      investingCashFlow: centsToReais(record.investingCashFlow),
      financingCashFlow: centsToReais(record.financingCashFlow),
      source: record.source || "",
      documentUrl: record.documentUrl || "",
      notes: record.notes || "",
    })
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este exercicio financeiro?")) return
    deleteMutation.mutate({ id })
  }

  function handleFormSubmit() {
    const payload = {
      clientId,
      year: form.year as number,
      period: form.period || undefined,
      quarter: form.period === "TRIMESTRAL" && form.quarter ? (form.quarter as number) : undefined,
      grossRevenue: reaisToCents(form.grossRevenue),
      netRevenue: reaisToCents(form.netRevenue),
      cogs: reaisToCents(form.cogs),
      grossProfit: reaisToCents(form.grossProfit),
      operatingExpenses: reaisToCents(form.operatingExpenses),
      ebitda: reaisToCents(form.ebitda),
      depreciation: reaisToCents(form.depreciation),
      ebit: reaisToCents(form.ebit),
      financialExpenses: reaisToCents(form.financialExpenses),
      financialIncome: reaisToCents(form.financialIncome),
      netIncome: reaisToCents(form.netIncome),
      totalAssets: reaisToCents(form.totalAssets),
      currentAssets: reaisToCents(form.currentAssets),
      nonCurrentAssets: reaisToCents(form.nonCurrentAssets),
      totalLiabilities: reaisToCents(form.totalLiabilities),
      currentLiabilities: reaisToCents(form.currentLiabilities),
      nonCurrentLiabilities: reaisToCents(form.nonCurrentLiabilities),
      equity: reaisToCents(form.equity),
      cash: reaisToCents(form.cash),
      totalDebt: reaisToCents(form.totalDebt),
      shortTermDebt: reaisToCents(form.shortTermDebt),
      longTermDebt: reaisToCents(form.longTermDebt),
      netDebt: reaisToCents(form.netDebt),
      operatingCashFlow: reaisToCents(form.operatingCashFlow),
      investingCashFlow: reaisToCents(form.investingCashFlow),
      financingCashFlow: reaisToCents(form.financingCashFlow),
      source: form.source || undefined,
      documentUrl: form.documentUrl || undefined,
      notes: form.notes || undefined,
    }

    if (editingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateMutation.mutate({ id: editingId, ...payload } as any)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMutation.mutate(payload as any)
    }
  }

  // ---- Loading ----
  if (financialsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header with year selector and actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Financeiro</h3>
          {years.length > 0 && (
            <Select
              value={effectiveYear ? String(effectiveYear) : ""}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedData && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(selectedData)}
              >
                <Pencil className="size-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(selectedData.id)}
              >
                <Trash2 className="size-4 mr-1" />
                Excluir
              </Button>
            </>
          )}
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4 mr-1" />
            Novo Exercicio
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {financials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhum exercicio financeiro cadastrado
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione dados financeiros para visualizar a DRE, balanco e indicadores.
          </p>
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4 mr-1" />
            Adicionar Primeiro Exercicio
          </Button>
        </div>
      )}

      {/* DRE */}
      {selectedData && <DreStatement data={selectedData} />}

      {/* Balance Sheet */}
      {selectedData && <BalanceSheet data={selectedData} />}

      {/* Indicators */}
      {indicatorsQuery.data && <IndicatorsGrid indicators={indicatorsQuery.data} />}

      {/* Evolution Chart */}
      {financials.length > 0 && <EvolutionChart financials={financials} />}

      {/* Form Dialog */}
      <FinancialFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) resetForm()
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEditing={!!editingId}
      />
    </div>
  )
}
