"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  BarChart3,
  Target,
  TrendingUp,
  MessageSquare,
  RefreshCcw,
  Users,
  Map,
  ClipboardList,
  Star,
  Shield,
  Award,
  Plus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Tab components
import { EquipePainelTab } from "@/components/equipe/tabs/painel-tab"
import { EquipeOKRsTab } from "@/components/equipe/tabs/okrs-tab"
import { EquipeKPIsTab } from "@/components/equipe/tabs/kpis-tab"
import { EquipeFeedbackTab } from "@/components/equipe/tabs/feedback-tab"
import { Equipe360Tab } from "@/components/equipe/tabs/review360-tab"
import { EquipeOneOnOneTab } from "@/components/equipe/tabs/one-on-one-tab"
import { EquipePDITab } from "@/components/equipe/tabs/pdi-tab"
import { EquipeSurveysTab } from "@/components/equipe/tabs/surveys-tab"
import { EquipeNPSTab } from "@/components/equipe/tabs/nps-tab"
import { EquipeOuvidoriaTab } from "@/components/equipe/tabs/ouvidoria-tab"
import { EquipeRecognitionTab } from "@/components/equipe/tabs/recognition-tab"

// ════════════════════════════════════════
// Tab definitions (Bem-Estar removed)
// ════════════════════════════════════════
const TABS = [
  { id: "painel",        label: "Painel",      icon: BarChart3 },
  { id: "okrs",          label: "OKRs",        icon: Target },
  { id: "kpis",          label: "KPIs",        icon: TrendingUp },
  { id: "feedback",      label: "Feedback",    icon: MessageSquare },
  { id: "360",           label: "360°",        icon: RefreshCcw },
  { id: "one-on-one",    label: "1:1s",        icon: Users },
  { id: "pdi",           label: "PDI",         icon: Map },
  { id: "surveys",       label: "Surveys",     icon: ClipboardList },
  { id: "nps",           label: "NPS",         icon: Star },
  { id: "ouvidoria",     label: "Ouvidoria",   icon: Shield },
  { id: "reconhecimento", label: "Reconhec.",  icon: Award },
] as const

type TabId = (typeof TABS)[number]["id"]

const VALID_TAB_IDS = new Set<string>(TABS.map((t) => t.id))

export default function EquipePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabFromUrl = searchParams.get("tab")
  const initialTab: TabId =
    tabFromUrl && VALID_TAB_IDS.has(tabFromUrl) ? (tabFromUrl as TabId) : "painel"

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Sync when URL searchParam changes (e.g. sidebar global click)
  useEffect(() => {
    if (tabFromUrl && VALID_TAB_IDS.has(tabFromUrl)) {
      setActiveTab(tabFromUrl as TabId)
    }
  }, [tabFromUrl])

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    router.replace(`/equipe?tab=${tabId}`, { scroll: false })
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            People Analytics, OKRs, Feedback e Desenvolvimento
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-[#C9A84C] hover:bg-[#B8963F] text-white">
              <Plus className="size-4 mr-2" /> Novo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Novo OKR</DropdownMenuItem>
            <DropdownMenuItem>Dar Feedback</DropdownMenuItem>
            <DropdownMenuItem>Agendar 1:1</DropdownMenuItem>
            <DropdownMenuItem>Dar Reconhecimento</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar de Abas (fixa à esquerda) ── */}
        <nav className="w-48 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm
                    transition-all duration-150 border-l-[3px]
                    ${
                      isActive
                        ? "bg-amber-50 text-amber-800 border-l-[#C9A84C] font-medium"
                        : "text-gray-600 border-l-transparent hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon
                    size={16}
                    className={isActive ? "text-[#C9A84C]" : "text-gray-400"}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ── Conteúdo da aba selecionada ── */}
        <main className="flex-1 overflow-y-auto bg-white p-6">
          {activeTab === "painel" && <EquipePainelTab />}
          {activeTab === "okrs" && <EquipeOKRsTab />}
          {activeTab === "kpis" && <EquipeKPIsTab />}
          {activeTab === "feedback" && <EquipeFeedbackTab />}
          {activeTab === "360" && <Equipe360Tab />}
          {activeTab === "one-on-one" && <EquipeOneOnOneTab />}
          {activeTab === "pdi" && <EquipePDITab />}
          {activeTab === "surveys" && <EquipeSurveysTab />}
          {activeTab === "nps" && <EquipeNPSTab />}
          {activeTab === "ouvidoria" && <EquipeOuvidoriaTab />}
          {activeTab === "reconhecimento" && <EquipeRecognitionTab />}
        </main>
      </div>
    </div>
  )
}
