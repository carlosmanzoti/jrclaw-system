"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload, FileText, Sparkles, AlertCircle, Crown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MODEL_DISPLAY } from "@/lib/ai-model-map"

interface ConfeccaoReviewProps {
  caseId: string
  projectId: string
}

export function ConfeccaoReview({ caseId, projectId }: ConfeccaoReviewProps) {
  const [documentContent, setDocumentContent] = useState("")
  const [reviewType, setReviewType] = useState("completa")
  const [reviewResult, setReviewResult] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [error, setError] = useState("")
  const [useOpus, setUseOpus] = useState(false)

  const handleReview = useCallback(async () => {
    if (!documentContent.trim()) return
    setIsReviewing(true)
    setError("")
    setReviewResult("")

    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContent,
          reviewType,
          caseId: caseId && caseId !== "none" ? caseId : undefined,
          projectId: projectId && projectId !== "none" ? projectId : undefined,
          useOpus,
        }),
      })

      if (!res.ok) throw new Error("Erro ao revisar documento")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")

      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setReviewResult(accumulated)
      }
    } catch (err: any) {
      setError(err.message || "Erro ao revisar")
    } finally {
      setIsReviewing(false)
    }
  }, [documentContent, reviewType, caseId, projectId, useOpus])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text()
      setDocumentContent(text)
    } else {
      setError("Suporte apenas para arquivos .txt por enquanto. PDF/DOCX em breve.")
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {!reviewResult ? (
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="size-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                Arraste um arquivo ou cole o texto abaixo
              </p>
              <p className="text-xs text-muted-foreground mt-1">TXT (PDF/DOCX em breve)</p>
            </div>

            {/* Text input */}
            <div className="space-y-1.5">
              <Label>Conteúdo do documento</Label>
              <Textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                placeholder="Cole aqui o texto do documento que deseja revisar..."
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            {/* Review type */}
            <div className="space-y-1.5">
              <Label>Tipo de revisão</Label>
              <Select value={reviewType} onValueChange={setReviewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa (5 aspectos)</SelectItem>
                  <SelectItem value="gramatical">Gramatical</SelectItem>
                  <SelectItem value="juridica">Fundamentação Jurídica</SelectItem>
                  <SelectItem value="estrategica">Estratégica</SelectItem>
                  <SelectItem value="risco">Riscos</SelectItem>
                  <SelectItem value="contrato">Revisão de Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opus toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={useOpus} onCheckedChange={setUseOpus} />
              <Label className="text-xs flex items-center gap-1">
                <Crown className="size-3" />
                Revisar com Opus 4.6
              </Label>
              {useOpus && (
                <Badge variant="outline" className={`text-[10px] ${MODEL_DISPLAY.premium.badgeClass}`}>
                  Premium
                </Badge>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded">
                <AlertCircle className="size-4" />
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleReview}
              disabled={!documentContent.trim() || isReviewing}
            >
              {isReviewing ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Revisando{useOpus ? " com Opus 4.6" : ""}...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Revisar Documento
                </>
              )}
            </Button>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 divide-x">
          {/* Original */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-2 border-b bg-muted/30">
              <Badge variant="outline" className="text-xs">
                <FileText className="size-3 mr-1" />
                Original
              </Badge>
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono">{documentContent}</pre>
            </ScrollArea>
          </div>

          {/* Review */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="size-3 mr-1" />
                Revisão IA
              </Badge>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setReviewResult("")}
              >
                Nova Revisão
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reviewResult}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}
