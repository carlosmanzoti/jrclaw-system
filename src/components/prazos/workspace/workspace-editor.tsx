"use client"

import { useCallback, useRef, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Minus, Undo, Redo, Code,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

// ─── Toolbar ──────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), tooltip: "Negrito" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), tooltip: "Itálico" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), tooltip: "Tachado" },
    { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), tooltip: "Código" },
    "sep",
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), tooltip: "Título 1" },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), tooltip: "Título 2" },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), tooltip: "Título 3" },
    "sep",
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), tooltip: "Lista" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), tooltip: "Lista numerada" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), tooltip: "Citação" },
    { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, tooltip: "Linha" },
    "sep",
    { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, tooltip: "Desfazer" },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, tooltip: "Refazer" },
  ] as const

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {tools.map((tool, idx) => {
        if (tool === "sep") return <Separator key={idx} orientation="vertical" className="h-6 mx-1" />
        return (
          <Button
            key={idx}
            type="button"
            variant="ghost"
            size="icon"
            className={`size-7 ${tool.active ? "bg-gray-200" : ""}`}
            onClick={tool.action}
            title={tool.tooltip}
          >
            <tool.icon className="size-3.5" />
          </Button>
        )
      })}
    </div>
  )
}

// ─── Editor Component ──────────────────────────────────────
interface WorkspaceEditorProps {
  initialContent: string | null
  onSave: (json: string, html: string, wordCount: number, charCount: number) => void
  readOnly?: boolean
}

export function WorkspaceEditor({ initialContent, onSave, readOnly }: WorkspaceEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
    ],
    content: initialContent ? (() => {
      try { return JSON.parse(initialContent) } catch { return initialContent }
    })() : "<p></p>",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none p-6 min-h-full focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      // Auto-save with debounce
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const json = JSON.stringify(e.getJSON())
        const html = e.getHTML()
        const text = e.getText()
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const charCount = text.length
        onSave(json, html, wordCount, charCount)
      }, 2000)
    },
  })

  // Keyboard shortcut: Ctrl+S for manual save
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      if (editor) {
        const json = JSON.stringify(editor.getJSON())
        const html = editor.getHTML()
        const text = editor.getText()
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const charCount = text.length
        onSave(json, html, wordCount, charCount)
      }
    }
  }, [editor, onSave])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length || 0
  const charCount = editor?.getText().length || 0

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <div className="shrink-0 border-b px-4 py-2 bg-white">
          <EditorToolbar editor={editor} />
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} className="min-h-full" />
      </div>

      {/* Status bar */}
      <div className="shrink-0 border-t px-4 py-1.5 bg-gray-50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{wordCount} palavras</span>
          <span>{charCount} caracteres</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 300))} página(s)</span>
        </div>
        <div>
          {readOnly && <span className="text-red-500 font-medium">Somente leitura</span>}
          {!readOnly && <span>Ctrl+S para salvar</span>}
        </div>
      </div>
    </div>
  )
}
