"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { PROJECT_CATEGORY_LABELS, PROJECT_TASK_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────

interface DefaultTask {
  titulo: string;
  tipo?: string;
  descricao?: string;
}

interface DefaultPhase {
  titulo: string;
  descricao?: string;
  ordem: number;
  tarefas_padrao?: DefaultTask[];
}

interface DefaultMilestone {
  titulo: string;
  descricao?: string;
  offset_dias: number;
}

interface TemplateFormData {
  titulo: string;
  categoria: string;
  descricao: string;
  ativo: boolean;
  fases_padrao: DefaultPhase[];
  marcos_padrao: DefaultMilestone[];
}

const EMPTY_FORM: TemplateFormData = {
  titulo: "",
  categoria: "",
  descricao: "",
  ativo: true,
  fases_padrao: [],
  marcos_padrao: [],
};

// ─── Helper: parse JSON fields from DB ──────────────────

function parsePhases(raw: unknown): DefaultPhase[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as DefaultPhase[];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseMilestones(raw: unknown): DefaultMilestone[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as DefaultMilestone[];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Main Page Component ────────────────────────────────

export default function TemplatesProjetoPage() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.projects.allTemplates.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormData>({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const createMutation = trpc.projects.createTemplate.useMutation({
    onSuccess: () => {
      utils.projects.allTemplates.invalidate();
      handleCloseDialog();
    },
  });

  const updateMutation = trpc.projects.updateTemplate.useMutation({
    onSuccess: () => {
      utils.projects.allTemplates.invalidate();
      handleCloseDialog();
    },
  });

  const deleteMutation = trpc.projects.deleteTemplate.useMutation({
    onSuccess: () => {
      utils.projects.allTemplates.invalidate();
      setDeleteConfirmId(null);
    },
  });

  const toggleActiveMutation = trpc.projects.updateTemplate.useMutation({
    onSuccess: () => {
      utils.projects.allTemplates.invalidate();
    },
  });

  // ─── Dialog handlers ─────────────────────────────────

  const handleOpenNew = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (template: any) => {
      setEditingId(template.id);
      setForm({
        titulo: template.titulo || "",
        categoria: template.categoria || "",
        descricao: template.descricao || "",
        ativo: template.ativo ?? true,
        fases_padrao: parsePhases(template.fases_padrao),
        marcos_padrao: parseMilestones(template.marcos_padrao),
      });
      setDialogOpen(true);
    },
    []
  );

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }, []);

  const handleSave = useCallback(() => {
    if (!form.titulo.trim() || !form.categoria) return;

    // Re-calculate ordem from position index before saving
    const fasesWithOrdem = form.fases_padrao.map((f, i) => ({
      ...f,
      ordem: i + 1,
    }));

    const payload = {
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
      fases_padrao: fasesWithOrdem.length > 0 ? fasesWithOrdem : null,
      marcos_padrao: form.marcos_padrao.length > 0 ? form.marcos_padrao : null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }, [form, editingId, createMutation, updateMutation]);

  const handleToggleActive = useCallback(
    (id: string, ativo: boolean) => {
      toggleActiveMutation.mutate({ id, ativo });
    },
    [toggleActiveMutation]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Phase management ────────────────────────────────

  const addPhase = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      fases_padrao: [
        ...prev.fases_padrao,
        {
          titulo: "",
          descricao: "",
          ordem: prev.fases_padrao.length + 1,
          tarefas_padrao: [],
        },
      ],
    }));
  }, []);

  const updatePhase = useCallback(
    (index: number, field: keyof DefaultPhase, value: string | number) => {
      setForm((prev) => {
        const updated = [...prev.fases_padrao];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, fases_padrao: updated };
      });
    },
    []
  );

  const removePhase = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      fases_padrao: prev.fases_padrao.filter((_, i) => i !== index),
    }));
  }, []);

  // ─── Task management (within phases) ─────────────────

  const addTaskToPhase = useCallback((phaseIndex: number) => {
    setForm((prev) => {
      const updated = [...prev.fases_padrao];
      const phase = { ...updated[phaseIndex] };
      phase.tarefas_padrao = [
        ...(phase.tarefas_padrao || []),
        { titulo: "", tipo: "OUTRO", descricao: "" },
      ];
      updated[phaseIndex] = phase;
      return { ...prev, fases_padrao: updated };
    });
  }, []);

  const updateTask = useCallback(
    (
      phaseIndex: number,
      taskIndex: number,
      field: keyof DefaultTask,
      value: string
    ) => {
      setForm((prev) => {
        const updatedPhases = [...prev.fases_padrao];
        const phase = { ...updatedPhases[phaseIndex] };
        const tasks = [...(phase.tarefas_padrao || [])];
        tasks[taskIndex] = { ...tasks[taskIndex], [field]: value };
        phase.tarefas_padrao = tasks;
        updatedPhases[phaseIndex] = phase;
        return { ...prev, fases_padrao: updatedPhases };
      });
    },
    []
  );

  const removeTask = useCallback((phaseIndex: number, taskIndex: number) => {
    setForm((prev) => {
      const updatedPhases = [...prev.fases_padrao];
      const phase = { ...updatedPhases[phaseIndex] };
      phase.tarefas_padrao = (phase.tarefas_padrao || []).filter(
        (_, i) => i !== taskIndex
      );
      updatedPhases[phaseIndex] = phase;
      return { ...prev, fases_padrao: updatedPhases };
    });
  }, []);

  // ─── Milestone management ────────────────────────────

  const addMilestone = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      marcos_padrao: [
        ...prev.marcos_padrao,
        { titulo: "", descricao: "", offset_dias: 0 },
      ],
    }));
  }, []);

  const updateMilestone = useCallback(
    (
      index: number,
      field: keyof DefaultMilestone,
      value: string | number
    ) => {
      setForm((prev) => {
        const updated = [...prev.marcos_padrao];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, marcos_padrao: updated };
      });
    },
    []
  );

  const removeMilestone = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      marcos_padrao: prev.marcos_padrao.filter((_, i) => i !== index),
    }));
  }, []);

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Templates de Projeto
            </h1>
            <p className="text-muted-foreground">
              Modelos reutilizaveis para criacao rapida de projetos com fases,
              tarefas e marcos pre-definidos.
            </p>
          </div>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 size-4" />
          Novo Template
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              Carregando templates...
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <FileText className="size-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum template cadastrado
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Crie um template para agilizar a criacao de novos projetos.
              </p>
              <Button onClick={handleOpenNew} className="mt-4">
                <Plus className="mr-2 size-4" />
                Criar primeiro template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Titulo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Fases</TableHead>
                  <TableHead className="text-center">Marcos</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const phases = parsePhases(template.fases_padrao);
                  const milestones = parseMilestones(template.marcos_padrao);

                  return (
                    <TableRow
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenEdit(template)}
                    >
                      <TableCell className="font-medium">
                        {template.titulo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PROJECT_CATEGORY_LABELS[template.categoria] ||
                            template.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {phases.length}
                      </TableCell>
                      <TableCell className="text-center">
                        {milestones.length}
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Switch
                          checked={template.ativo}
                          onCheckedChange={(checked) =>
                            handleToggleActive(template.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(template.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Create/Edit Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Titulo *</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  placeholder="Ex: Recuperacao de Credito"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, categoria: val }))
                  }
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_CATEGORY_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descricao: e.target.value }))
                }
                placeholder="Descreva o objetivo e escopo deste template..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, ativo: checked }))
                }
              />
              <Label htmlFor="ativo">Template ativo</Label>
            </div>

            {/* ─── Phases Section ──────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fases Padrao</h3>
                <Button variant="outline" size="sm" onClick={addPhase}>
                  <Plus className="mr-1 size-3" />
                  Adicionar Fase
                </Button>
              </div>

              {form.fases_padrao.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  Nenhuma fase adicionada. Clique em &quot;Adicionar Fase&quot;
                  para comecar.
                </p>
              )}

              {form.fases_padrao.map((phase, phaseIdx) => (
                <PhaseEditor
                  key={phaseIdx}
                  phase={phase}
                  index={phaseIdx}
                  onUpdatePhase={updatePhase}
                  onRemovePhase={removePhase}
                  onAddTask={addTaskToPhase}
                  onUpdateTask={updateTask}
                  onRemoveTask={removeTask}
                />
              ))}
            </div>

            {/* ─── Milestones Section ─────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Marcos Padrao</h3>
                <Button variant="outline" size="sm" onClick={addMilestone}>
                  <Plus className="mr-1 size-3" />
                  Adicionar Marco
                </Button>
              </div>

              {form.marcos_padrao.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  Nenhum marco adicionado. Clique em &quot;Adicionar Marco&quot;
                  para comecar.
                </p>
              )}

              {form.marcos_padrao.map((milestone, milestoneIdx) => (
                <Card key={milestoneIdx} className="border-muted">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <GripVertical className="size-4 mt-2.5 text-muted-foreground/50 shrink-0" />
                      <div className="grid grid-cols-[1fr_1fr_120px] gap-3 flex-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Titulo</Label>
                          <Input
                            value={milestone.titulo}
                            onChange={(e) =>
                              updateMilestone(
                                milestoneIdx,
                                "titulo",
                                e.target.value
                              )
                            }
                            placeholder="Ex: Acordo formalizado"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descricao</Label>
                          <Input
                            value={milestone.descricao || ""}
                            onChange={(e) =>
                              updateMilestone(
                                milestoneIdx,
                                "descricao",
                                e.target.value
                              )
                            }
                            placeholder="Descricao opcional"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Offset (dias)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={milestone.offset_dias}
                            onChange={(e) =>
                              updateMilestone(
                                milestoneIdx,
                                "offset_dias",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0 mt-5"
                        onClick={() => removeMilestone(milestoneIdx)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.titulo.trim() || !form.categoria}
            >
              {isSaving ? "Salvando..." : editingId ? "Salvar Alteracoes" : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─────────────────── */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este template? Esta acao nao pode ser
            desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate({ id: deleteConfirmId });
                }
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Phase Editor Sub-Component ─────────────────────────

interface PhaseEditorProps {
  phase: DefaultPhase;
  index: number;
  onUpdatePhase: (
    index: number,
    field: keyof DefaultPhase,
    value: string | number
  ) => void;
  onRemovePhase: (index: number) => void;
  onAddTask: (phaseIndex: number) => void;
  onUpdateTask: (
    phaseIndex: number,
    taskIndex: number,
    field: keyof DefaultTask,
    value: string
  ) => void;
  onRemoveTask: (phaseIndex: number, taskIndex: number) => void;
}

function PhaseEditor({
  phase,
  index,
  onUpdatePhase,
  onRemovePhase,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
}: PhaseEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const tasks = phase.tarefas_padrao || [];

  return (
    <Card className="border-muted">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground/50 shrink-0" />
          <Badge variant="secondary" className="shrink-0">
            Fase {index + 1}
          </Badge>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            {phase.titulo || "(sem titulo)"}
            {tasks.length > 0 && (
              <span className="text-xs ml-1">
                ({tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"})
              </span>
            )}
          </button>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive size-8"
              onClick={() => onRemovePhase(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-3">
          <div className="grid grid-cols-[1fr_1fr] gap-3 pl-6">
            <div className="space-y-1">
              <Label className="text-xs">Titulo da fase</Label>
              <Input
                value={phase.titulo}
                onChange={(e) =>
                  onUpdatePhase(index, "titulo", e.target.value)
                }
                placeholder="Ex: Analise do credito"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descricao</Label>
              <Input
                value={phase.descricao || ""}
                onChange={(e) =>
                  onUpdatePhase(index, "descricao", e.target.value)
                }
                placeholder="Descricao opcional"
              />
            </div>
          </div>

          {/* Tasks within phase */}
          <div className="pl-6 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tarefas Padrao
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAddTask(index)}
              >
                <Plus className="mr-1 size-3" />
                Adicionar Tarefa
              </Button>
            </div>

            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">
                Nenhuma tarefa nesta fase.
              </p>
            )}

            {tasks.map((task, taskIdx) => (
              <div
                key={taskIdx}
                className="grid grid-cols-[1fr_160px_1fr_auto] gap-2 items-start"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Titulo</Label>
                  <Input
                    value={task.titulo}
                    onChange={(e) =>
                      onUpdateTask(index, taskIdx, "titulo", e.target.value)
                    }
                    placeholder="Titulo da tarefa"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={task.tipo || "OUTRO"}
                    onValueChange={(val) =>
                      onUpdateTask(index, taskIdx, "tipo", val)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_TASK_TYPE_LABELS).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descricao</Label>
                  <Input
                    value={task.descricao || ""}
                    onChange={(e) =>
                      onUpdateTask(
                        index,
                        taskIdx,
                        "descricao",
                        e.target.value
                      )
                    }
                    placeholder="Descricao opcional"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8 mt-5"
                  onClick={() => onRemoveTask(index, taskIdx)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
