"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PersonCombobox } from "@/components/pessoas/person-combobox"
import { trpc } from "@/lib/trpc"

type CamposEspecificos = Record<string, unknown>

interface EventTypeFieldsProps {
  tipoEvento: string
  value: CamposEspecificos
  onChange: (value: CamposEspecificos) => void
  isEdit?: boolean
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function UserSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const { data: users } = trpc.users.list.useQuery()
  return (
    <Field label={label}>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          {users?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function ReuniaoFields({
  value,
  onChange,
  isEdit,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
  isEdit?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })
  const tipoReuniao = (value.tipo_reuniao as string) || ""

  return (
    <>
      <Field label="Tipo de reunião">
        <Select value={tipoReuniao} onValueChange={(v) => set("tipo_reuniao", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Presencial">Presencial</SelectItem>
            <SelectItem value="Virtual">Virtual</SelectItem>
            <SelectItem value="Hibrida">Híbrida</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {(tipoReuniao === "Presencial" || tipoReuniao === "Hibrida") && (
        <Field label="Local">
          <Input
            value={(value.local as string) || ""}
            onChange={(e) => set("local", e.target.value)}
          />
        </Field>
      )}
      {(tipoReuniao === "Virtual" || tipoReuniao === "Hibrida") && (
        <Field label="Link virtual">
          <Input
            value={(value.link_virtual as string) || ""}
            onChange={(e) => set("link_virtual", e.target.value)}
          />
        </Field>
      )}
      <Field label="Pauta">
        <Textarea
          value={(value.pauta as string) || ""}
          onChange={(e) => set("pauta", e.target.value)}
          rows={2}
        />
      </Field>
      <Field label="Objetivo">
        <Input
          value={(value.objetivo as string) || ""}
          onChange={(e) => set("objetivo", e.target.value)}
        />
      </Field>
      {isEdit && (
        <>
          <Field label="Ata">
            <Textarea
              value={(value.ata as string) || ""}
              onChange={(e) => set("ata", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Follow-up">
            <Textarea
              value={(value.followup as string) || ""}
              onChange={(e) => set("followup", e.target.value)}
              rows={2}
            />
          </Field>
        </>
      )}
    </>
  )
}

function AudienciaFields({
  value,
  onChange,
  isEdit,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
  isEdit?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Tipo de audiência">
        <Select
          value={(value.tipo_audiencia as string) || ""}
          onValueChange={(v) => set("tipo_audiencia", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Instrucao">Instrução</SelectItem>
            <SelectItem value="Conciliacao">Conciliação</SelectItem>
            <SelectItem value="Una">Una</SelectItem>
            <SelectItem value="Justificacao">Justificação</SelectItem>
            <SelectItem value="Outra">Outra</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vara">
          <Input
            value={(value.vara as string) || ""}
            onChange={(e) => set("vara", e.target.value)}
          />
        </Field>
        <Field label="Comarca">
          <Input
            value={(value.comarca as string) || ""}
            onChange={(e) => set("comarca", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Juiz">
        <PersonCombobox
          value={(value.juiz_id as string) || undefined}
          onSelect={(id) => set("juiz_id", id)}
          tipo="JUIZ"
          placeholder="Selecionar juiz..."
        />
      </Field>
      <Field label="Documentos necessários">
        <Textarea
          value={(value.documentos_necessarios as string) || ""}
          onChange={(e) => set("documentos_necessarios", e.target.value)}
          rows={2}
        />
      </Field>
      <Field label="Preparação">
        <Textarea
          value={(value.preparacao as string) || ""}
          onChange={(e) => set("preparacao", e.target.value)}
          rows={2}
        />
      </Field>
      {isEdit && (
        <Field label="Resultado">
          <Textarea
            value={(value.resultado as string) || ""}
            onChange={(e) => set("resultado", e.target.value)}
            rows={3}
          />
        </Field>
      )}
    </>
  )
}

function SustentacaoOralFields({
  value,
  onChange,
  isEdit,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
  isEdit?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tribunal">
          <Input
            value={(value.tribunal as string) || ""}
            onChange={(e) => set("tribunal", e.target.value)}
          />
        </Field>
        <Field label="Turma / Câmara">
          <Input
            value={(value.turma_camara as string) || ""}
            onChange={(e) => set("turma_camara", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Relator">
        <PersonCombobox
          value={(value.relator_id as string) || undefined}
          onSelect={(id) => set("relator_id", id)}
          tipo="DESEMBARGADOR"
          placeholder="Selecionar relator..."
        />
      </Field>
      <Field label="Tempo de sustentação (minutos)">
        <Input
          type="number"
          value={(value.tempo_sustentacao as string) || ""}
          onChange={(e) => set("tempo_sustentacao", e.target.value)}
        />
      </Field>
      <Field label="Teses principais">
        <Textarea
          value={(value.teses_principais as string) || ""}
          onChange={(e) => set("teses_principais", e.target.value)}
          rows={3}
        />
      </Field>
      <Field label="Pedidos">
        <Textarea
          value={(value.pedidos as string) || ""}
          onChange={(e) => set("pedidos", e.target.value)}
          rows={2}
        />
      </Field>
      {isEdit && (
        <Field label="Resultado do julgamento">
          <Textarea
            value={(value.resultado_julgamento as string) || ""}
            onChange={(e) => set("resultado_julgamento", e.target.value)}
            rows={3}
          />
        </Field>
      )}
    </>
  )
}

function DespachoOralFields({
  value,
  onChange,
  isEdit,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
  isEdit?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Juiz">
        <PersonCombobox
          value={(value.juiz_id as string) || undefined}
          onSelect={(id) => set("juiz_id", id)}
          tipo="JUIZ"
          placeholder="Selecionar juiz..."
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vara / Gabinete">
          <Input
            value={(value.vara_gabinete as string) || ""}
            onChange={(e) => set("vara_gabinete", e.target.value)}
          />
        </Field>
        <Field label="Comarca">
          <Input
            value={(value.comarca as string) || ""}
            onChange={(e) => set("comarca", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Assunto">
        <Textarea
          value={(value.assunto as string) || ""}
          onChange={(e) => set("assunto", e.target.value)}
          rows={2}
        />
      </Field>
      {isEdit && (
        <>
          <Field label="Resultado">
            <Textarea
              value={(value.resultado as string) || ""}
              onChange={(e) => set("resultado", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="Encaminhamentos">
            <Textarea
              value={(value.encaminhamentos as string) || ""}
              onChange={(e) => set("encaminhamentos", e.target.value)}
              rows={2}
            />
          </Field>
        </>
      )}
    </>
  )
}

function PesquisaJuridicaFields({
  value,
  onChange,
  isEdit,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
  isEdit?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Tema">
        <Input
          value={(value.tema as string) || ""}
          onChange={(e) => set("tema", e.target.value)}
        />
      </Field>
      <UserSelect
        label="Solicitante"
        value={(value.solicitante_id as string) || ""}
        onChange={(v) => set("solicitante_id", v)}
      />
      <UserSelect
        label="Pesquisador"
        value={(value.pesquisador_id as string) || ""}
        onChange={(v) => set("pesquisador_id", v)}
      />
      <Field label="Prazo de entrega">
        <Input
          type="date"
          value={(value.prazo_entrega as string) || ""}
          onChange={(e) => set("prazo_entrega", e.target.value)}
        />
      </Field>
      <Field label="Fontes a consultar">
        <Textarea
          value={(value.fontes_consultar as string) || ""}
          onChange={(e) => set("fontes_consultar", e.target.value)}
          rows={2}
        />
      </Field>
      {isEdit && (
        <>
          <Field label="Fontes consultadas">
            <Textarea
              value={(value.fontes_consultadas as string) || ""}
              onChange={(e) => set("fontes_consultadas", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="Status da pesquisa">
            <Select
              value={(value.status_pesquisa as string) || ""}
              onValueChange={(v) => set("status_pesquisa", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
    </>
  )
}

function AnaliseCasoFields({
  value,
  onChange,
  isEdit,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
  isEdit?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Tipo de análise">
        <Select
          value={(value.tipo_analise as string) || ""}
          onValueChange={(v) => set("tipo_analise", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Viabilidade">Viabilidade</SelectItem>
            <SelectItem value="Risco">Risco</SelectItem>
            <SelectItem value="Estrategia">Estratégia</SelectItem>
            <SelectItem value="Parecer">Parecer</SelectItem>
            <SelectItem value="Due Diligence">Due Diligence</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Elementos de análise">
        <Textarea
          value={(value.elementos_analise as string) || ""}
          onChange={(e) => set("elementos_analise", e.target.value)}
          rows={3}
        />
      </Field>
      {isEdit && (
        <>
          <Field label="Conclusão">
            <Textarea
              value={(value.conclusao as string) || ""}
              onChange={(e) => set("conclusao", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="Recomendação">
            <Textarea
              value={(value.recomendacao as string) || ""}
              onChange={(e) => set("recomendacao", e.target.value)}
              rows={2}
            />
          </Field>
        </>
      )}
    </>
  )
}

function PrazoAntecipadoFields({
  value,
  onChange,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Data de cumprimento planejada">
        <Input
          type="date"
          value={(value.data_cumprimento_planejada as string) || ""}
          onChange={(e) => set("data_cumprimento_planejada", e.target.value)}
        />
      </Field>
      <Field label="Motivo da antecipação">
        <Textarea
          value={(value.motivo_antecipacao as string) || ""}
          onChange={(e) => set("motivo_antecipacao", e.target.value)}
          rows={2}
        />
      </Field>
      <Field label="Peça a elaborar">
        <Input
          value={(value.peca_elaborar as string) || ""}
          onChange={(e) => set("peca_elaborar", e.target.value)}
        />
      </Field>
      <UserSelect
        label="Responsável pela elaboração"
        value={(value.responsavel_elaboracao_id as string) || ""}
        onChange={(v) => set("responsavel_elaboracao_id", v)}
      />
      <UserSelect
        label="Responsável pela revisão"
        value={(value.responsavel_revisao_id as string) || ""}
        onChange={(v) => set("responsavel_revisao_id", v)}
      />
      <Field label="Status do prazo">
        <Select
          value={(value.status_prazo as string) || ""}
          onValueChange={(v) => set("status_prazo", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Planejado">Planejado</SelectItem>
            <SelectItem value="Em elaboracao">Em elaboração</SelectItem>
            <SelectItem value="Em revisao">Em revisão</SelectItem>
            <SelectItem value="Cumprido">Cumprido</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  )
}

function PrazoFatalFields({
  value,
  onChange,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        Prazo fatal — atenção redobrada ao cumprimento
      </div>
      <Field label="Peça a elaborar">
        <Input
          value={(value.peca_elaborar as string) || ""}
          onChange={(e) => set("peca_elaborar", e.target.value)}
        />
      </Field>
      <UserSelect
        label="Responsável pela elaboração"
        value={(value.responsavel_elaboracao_id as string) || ""}
        onChange={(v) => set("responsavel_elaboracao_id", v)}
      />
      <UserSelect
        label="Responsável pela revisão"
        value={(value.responsavel_revisao_id as string) || ""}
        onChange={(v) => set("responsavel_revisao_id", v)}
      />
    </>
  )
}

function RetornoEmailFields({
  value,
  onChange,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Destinatário">
        <PersonCombobox
          value={(value.destinatario_id as string) || undefined}
          onSelect={(id) => set("destinatario_id", id)}
          placeholder="Selecionar destinatário..."
        />
      </Field>
      <Field label="Assunto do e-mail">
        <Input
          value={(value.assunto_email as string) || ""}
          onChange={(e) => set("assunto_email", e.target.value)}
        />
      </Field>
      <Field label="Prioridade">
        <Select
          value={(value.prioridade as string) || ""}
          onValueChange={(v) => set("prioridade", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Media">Média</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Status do e-mail">
        <Select
          value={(value.status_email as string) || ""}
          onValueChange={(v) => set("status_email", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Enviado">Enviado</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  )
}

function AtividadeGeralFields({
  value,
  onChange,
}: {
  value: CamposEspecificos
  onChange: (v: CamposEspecificos) => void
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  return (
    <>
      <Field label="Categoria">
        <Select
          value={(value.categoria as string) || ""}
          onValueChange={(v) => set("categoria", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Administrativa">Administrativa</SelectItem>
            <SelectItem value="Comercial">Comercial</SelectItem>
            <SelectItem value="Institucional">Institucional</SelectItem>
            <SelectItem value="Pessoal">Pessoal</SelectItem>
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Detalhes">
        <Textarea
          value={(value.detalhes as string) || ""}
          onChange={(e) => set("detalhes", e.target.value)}
          rows={3}
        />
      </Field>
    </>
  )
}

export function EventTypeFields({
  tipoEvento,
  value,
  onChange,
  isEdit,
}: EventTypeFieldsProps) {
  if (!tipoEvento) return null

  const props = { value, onChange, isEdit }

  switch (tipoEvento) {
    case "REUNIAO":
      return <ReuniaoFields {...props} />
    case "AUDIENCIA":
      return <AudienciaFields {...props} />
    case "SUSTENTACAO_ORAL":
      return <SustentacaoOralFields {...props} />
    case "DESPACHO_ORAL":
      return <DespachoOralFields {...props} />
    case "PESQUISA_JURIDICA":
      return <PesquisaJuridicaFields {...props} />
    case "ANALISE_CASO":
      return <AnaliseCasoFields {...props} />
    case "PRAZO_ANTECIPADO":
      return <PrazoAntecipadoFields value={value} onChange={onChange} />
    case "PRAZO_FATAL":
      return <PrazoFatalFields value={value} onChange={onChange} />
    case "RETORNO_EMAIL":
      return <RetornoEmailFields value={value} onChange={onChange} />
    case "ATIVIDADE_GERAL":
      return <AtividadeGeralFields value={value} onChange={onChange} />
    default:
      return null
  }
}
