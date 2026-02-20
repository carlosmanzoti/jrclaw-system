"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Heart,
  Plus,
} from "lucide-react"

// Tab components (to be created separately)
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
import { EquipeWellbeingTab } from "@/components/equipe/tabs/wellbeing-tab"

export default function EquipePage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "painel"
  const [activeTab, setActiveTab] = useState(defaultTab)

  const tabs = [
    { value: "painel", label: "Painel", icon: BarChart3 },
    { value: "okrs", label: "OKRs", icon: Target },
    { value: "kpis", label: "KPIs", icon: TrendingUp },
    { value: "feedback", label: "Feedback", icon: MessageSquare },
    { value: "360", label: "360°", icon: RefreshCcw },
    { value: "one-on-one", label: "1:1s", icon: Users },
    { value: "pdi", label: "PDI", icon: Map },
    { value: "surveys", label: "Surveys", icon: ClipboardList },
    { value: "nps", label: "NPS", icon: Star },
    { value: "ouvidoria", label: "Ouvidoria", icon: Shield },
    { value: "recognition", label: "Reconhec.", icon: Award },
    { value: "wellbeing", label: "Bem-Estar", icon: Heart },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#374151]">Gestão de Equipe</h1>
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
            <DropdownMenuItem>Check-in Bem-Estar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content with vertical tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 overflow-hidden">
        <TabsList className="flex flex-col h-full w-44 shrink-0 rounded-none border-r border-gray-200 bg-gray-50 p-2 gap-1 justify-start">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="w-full justify-start gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#C9A84C] data-[state=active]:border-l-4 data-[state=active]:border-l-[#C9A84C] data-[state=active]:shadow-none"
              >
                <Icon className="size-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="painel" className="mt-0">
            <EquipePainelTab />
          </TabsContent>
          <TabsContent value="okrs" className="mt-0">
            <EquipeOKRsTab />
          </TabsContent>
          <TabsContent value="kpis" className="mt-0">
            <EquipeKPIsTab />
          </TabsContent>
          <TabsContent value="feedback" className="mt-0">
            <EquipeFeedbackTab />
          </TabsContent>
          <TabsContent value="360" className="mt-0">
            <Equipe360Tab />
          </TabsContent>
          <TabsContent value="one-on-one" className="mt-0">
            <EquipeOneOnOneTab />
          </TabsContent>
          <TabsContent value="pdi" className="mt-0">
            <EquipePDITab />
          </TabsContent>
          <TabsContent value="surveys" className="mt-0">
            <EquipeSurveysTab />
          </TabsContent>
          <TabsContent value="nps" className="mt-0">
            <EquipeNPSTab />
          </TabsContent>
          <TabsContent value="ouvidoria" className="mt-0">
            <EquipeOuvidoriaTab />
          </TabsContent>
          <TabsContent value="recognition" className="mt-0">
            <EquipeRecognitionTab />
          </TabsContent>
          <TabsContent value="wellbeing" className="mt-0">
            <EquipeWellbeingTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
