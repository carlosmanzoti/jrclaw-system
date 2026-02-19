"use client"

/**
 * Part 22 — AI Configuration Panel
 * User-configurable AI settings for workspace behavior.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Settings2,
  Brain,
  Zap,
  Bell,
  Palette,
  Save,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export interface WorkspaceAIConfig {
  // Auto-analysis toggles
  autoClassifyDocuments: boolean
  autoCheckSections: boolean
  autoSuggestTheses: boolean
  generateBriefingOnCreate: boolean

  // Predictive alerts
  showRiskAlerts: boolean
  showGapAlerts: boolean
  showActionSuggestions: boolean

  // Personalization
  tone: "formal" | "tecnico-neutro" | "acessivel"
  detailLevel: "resumido" | "padrao" | "detalhado"

  // Notifications
  notifyOnAutoCheck: boolean
  notifyOnRiskChange: boolean
}

const DEFAULT_CONFIG: WorkspaceAIConfig = {
  autoClassifyDocuments: true,
  autoCheckSections: true,
  autoSuggestTheses: true,
  generateBriefingOnCreate: true,
  showRiskAlerts: true,
  showGapAlerts: true,
  showActionSuggestions: true,
  tone: "tecnico-neutro",
  detailLevel: "padrao",
  notifyOnAutoCheck: true,
  notifyOnRiskChange: true,
}

const STORAGE_KEY = "workspace-ai-config"

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkspaceAIConfig(): {
  config: WorkspaceAIConfig
  updateConfig: (updates: Partial<WorkspaceAIConfig>) => void
  resetConfig: () => void
} {
  const [config, setConfig] = useState<WorkspaceAIConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) })
      }
    } catch { /* use defaults */ }
  }, [])

  const updateConfig = (updates: Partial<WorkspaceAIConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* */ }
      return next
    })
  }

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
  }

  return { config, updateConfig, resetConfig }
}

// ---------------------------------------------------------------------------
// Toggle Row
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
        onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Select Row
// ---------------------------------------------------------------------------

function SelectRow<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string
  description: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex gap-2">
        {options.map(opt => (
          <Badge
            key={opt.value}
            variant={value === opt.value ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              value === opt.value && "bg-primary text-primary-foreground"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Config Panel Component
// ---------------------------------------------------------------------------

interface WorkspaceAIConfigPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkspaceAIConfigPanel({ open, onOpenChange }: WorkspaceAIConfigPanelProps) {
  const { config, updateConfig, resetConfig } = useWorkspaceAIConfig()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurações da IA
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section: Auto-Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Análise Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ToggleRow
                label="Classificar documentos"
                description="IA classifica documentos ao upload e marca itens do checklist"
                checked={config.autoClassifyDocuments}
                onChange={v => updateConfig({ autoClassifyDocuments: v })}
              />
              <ToggleRow
                label="Detectar seções"
                description="Auto-verifica seções da minuta e marca o checklist"
                checked={config.autoCheckSections}
                onChange={v => updateConfig({ autoCheckSections: v })}
              />
              <ToggleRow
                label="Sugerir teses"
                description="IA sugere teses jurídicas ao criar o workspace"
                checked={config.autoSuggestTheses}
                onChange={v => updateConfig({ autoSuggestTheses: v })}
              />
              <ToggleRow
                label="Briefing inicial"
                description="Gera briefing automático ao criar novo workspace"
                checked={config.generateBriefingOnCreate}
                onChange={v => updateConfig({ generateBriefingOnCreate: v })}
              />
            </CardContent>
          </Card>

          {/* Section: Predictive Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                Alertas Preditivos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ToggleRow
                label="Alertas de risco"
                description="Mostra indicadores de risco do prazo baseados em progresso"
                checked={config.showRiskAlerts}
                onChange={v => updateConfig({ showRiskAlerts: v })}
              />
              <ToggleRow
                label="Lacunas argumentativas"
                description="Detecta teses sem suporte ou seções faltantes"
                checked={config.showGapAlerts}
                onChange={v => updateConfig({ showGapAlerts: v })}
              />
              <ToggleRow
                label="Sugestões de ação"
                description="Sugere próximas ações baseadas na fase atual"
                checked={config.showActionSuggestions}
                onChange={v => updateConfig({ showActionSuggestions: v })}
              />
            </CardContent>
          </Card>

          {/* Section: Personalization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-500" />
                Personalização
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SelectRow
                label="Tom das respostas"
                description="Estilo de linguagem da IA"
                value={config.tone}
                options={[
                  { value: "formal", label: "Formal" },
                  { value: "tecnico-neutro", label: "Técnico" },
                  { value: "acessivel", label: "Acessível" },
                ]}
                onChange={v => updateConfig({ tone: v })}
              />
              <SelectRow
                label="Nível de detalhe"
                description="Quantidade de informação nas respostas"
                value={config.detailLevel}
                options={[
                  { value: "resumido", label: "Resumido" },
                  { value: "padrao", label: "Padrão" },
                  { value: "detalhado", label: "Detalhado" },
                ]}
                onChange={v => updateConfig({ detailLevel: v })}
              />
            </CardContent>
          </Card>

          {/* Section: Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-green-500" />
                Notificações IA
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ToggleRow
                label="Auto-check do checklist"
                description="Notificar quando a IA marcar itens automaticamente"
                checked={config.notifyOnAutoCheck}
                onChange={v => updateConfig({ notifyOnAutoCheck: v })}
              />
              <ToggleRow
                label="Mudança de risco"
                description="Alertar quando o nível de risco do prazo mudar"
                checked={config.notifyOnRiskChange}
                onChange={v => updateConfig({ notifyOnRiskChange: v })}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 pt-2 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetConfig}
              className="flex-1"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Restaurar padrões
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Fechar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
