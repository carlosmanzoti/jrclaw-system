"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useCallback, useRef } from "react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  FileDown,
  Copy,
  Pilcrow,
  Check,
} from "lucide-react"

interface DocumentEditorProps {
  content: string
  isGenerating?: boolean
  documentType?: string
  onContentChange?: (html: string) => void
}

/** Convert markdown to HTML (handles AI streaming output) */
function markdownToHtml(md: string): string {
  if (!md) return ""

  // If it already starts with an HTML tag, return as-is
  if (md.trim().startsWith("<")) return md

  let html = md
    // Headings (must come before bold since ## can contain **)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Ordered list items
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, "<ul>$1</ul>")

  // Double newlines → paragraph breaks
  html = html.replace(/\n\n+/g, "</p><p>")
  // Single newlines → <br>
  html = html.replace(/\n/g, "<br>")

  // Wrap in paragraph if not starting with block element
  if (!html.match(/^<(?:h[1-3]|p|ul|ol|hr|blockquote)/)) {
    html = "<p>" + html + "</p>"
  }

  return html
}

export default function DocumentEditor({
  content,
  isGenerating,
  documentType,
  onContentChange,
}: DocumentEditorProps) {
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const prevContentRef = useRef("")

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "O documento gerado aparecera aqui...",
      }),
    ],
    content: "",
    editable: true,
    onUpdate: ({ editor: ed }) => {
      onContentChange?.(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6 tiptap",
        style:
          'font-family: "Times New Roman", Georgia, serif; font-size: 13pt; line-height: 1.8;',
      },
    },
  })

  // Update editor content when AI generates (streaming)
  useEffect(() => {
    if (!editor || !content) return
    // Skip if content hasn't actually changed
    if (content === prevContentRef.current) return
    prevContentRef.current = content

    const html = markdownToHtml(content)
    // During streaming, force-set content and scroll to end
    if (isGenerating) {
      editor.commands.setContent(html, { emitUpdate: false })
      // Scroll to bottom of editor
      requestAnimationFrame(() => {
        const editorEl = document.querySelector(".tiptap")
        if (editorEl) {
          const scrollParent = editorEl.closest(".overflow-y-auto")
          if (scrollParent) {
            scrollParent.scrollTop = scrollParent.scrollHeight
          }
        }
      })
    } else {
      // Final content — set once
      const currentHtml = editor.getHTML()
      if (html !== currentHtml) {
        editor.commands.setContent(html, { emitUpdate: false })
      }
    }
  }, [content, editor, isGenerating])

  // Export DOCX
  const handleExportDocx = useCallback(async () => {
    if (!editor) return

    const htmlContent = editor.getHTML()

    try {
      const response = await fetch("/api/ai/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: htmlContent,
          documentType: documentType || "Documento Juridico",
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao gerar DOCX")
      }

      const blob = await response.blob()
      const { saveAs } = await import("file-saver")
      const fileName = `${(documentType || "documento").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.docx`
      saveAs(blob, fileName)
    } catch (error: unknown) {
      console.error("Erro export DOCX:", error)
      const msg = error instanceof Error ? error.message : "Erro ao exportar DOCX"
      alert(msg)
    }
  }, [editor, documentType])

  // Copy formatted (HTML + plain text)
  const handleCopyFormatted = useCallback(async () => {
    if (!editor) return

    const html = editor.getHTML()
    const text = editor.getText()

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ])
      // Visual feedback
      if (copyBtnRef.current) {
        copyBtnRef.current.dataset.copied = "true"
        setTimeout(() => {
          if (copyBtnRef.current) copyBtnRef.current.dataset.copied = ""
        }, 2000)
      }
    } catch {
      // Fallback: copy plain text
      await navigator.clipboard.writeText(text).catch(() => {})
    }
  }, [editor])

  if (!editor) return null

  // Toolbar button helper
  const ToolbarBtn = ({
    onClick,
    isActive,
    children,
    title,
    disabled,
  }: {
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? "bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30"
          : "text-[#666666] hover:bg-[#F7F3F1] hover:text-[#2A2A2A]"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )

  const iconSize = 16
  const wordCount = editor.getText().split(/\s+/).filter(Boolean).length
  const charCount = editor.getText().length
  const pageEstimate = Math.max(1, Math.ceil(wordCount / 250))

  return (
    <div className="border border-[#E0E0E0] rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#E0E0E0] bg-[#F7F3F1]">
        {/* Text formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Negrito (Ctrl+B)"
        >
          <Bold size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italico (Ctrl+I)"
        >
          <Italic size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon size={iconSize} />
        </ToolbarBtn>

        <div className="w-px h-5 bg-[#E0E0E0] mx-1" />

        {/* Headings */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Titulo 1"
        >
          <Heading1 size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Titulo 2"
        >
          <Heading2 size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Titulo 3"
        >
          <Heading3 size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive("paragraph")}
          title="Paragrafo"
        >
          <Pilcrow size={iconSize} />
        </ToolbarBtn>

        <div className="w-px h-5 bg-[#E0E0E0] mx-1" />

        {/* Alignment */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Alinhar a esquerda"
        >
          <AlignLeft size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Centralizar"
        >
          <AlignCenter size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Justificar"
        >
          <AlignJustify size={iconSize} />
        </ToolbarBtn>

        <div className="w-px h-5 bg-[#E0E0E0] mx-1" />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Lista com marcadores"
        >
          <List size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered size={iconSize} />
        </ToolbarBtn>

        <div className="w-px h-5 bg-[#E0E0E0] mx-1" />

        {/* Undo/Redo */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          title="Desfazer (Ctrl+Z)"
          disabled={!editor.can().undo()}
        >
          <Undo size={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          title="Refazer (Ctrl+Y)"
          disabled={!editor.can().redo()}
        >
          <Redo size={iconSize} />
        </ToolbarBtn>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <button
          ref={copyBtnRef}
          onClick={handleCopyFormatted}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2A2A2A] bg-white border border-[#E0E0E0] rounded-md hover:bg-[#F7F3F1] transition-colors group"
          title="Copiar com formatacao (cola no Word mantendo negrito, titulos, etc.)"
          data-copied=""
        >
          <span className="group-data-[copied=true]:hidden flex items-center gap-1.5">
            <Copy size={14} />
            Copiar Formatado
          </span>
          <span className="hidden group-data-[copied=true]:flex items-center gap-1.5 text-green-600">
            <Check size={14} />
            Copiado!
          </span>
        </button>

        <button
          onClick={handleExportDocx}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2A2A2A] bg-[#C9A961] rounded-md hover:bg-[#C9A961]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          title="Baixar como arquivo Word (.docx) com formatacao profissional"
        >
          <FileDown size={14} />
          Baixar DOCX
        </button>
      </div>

      {/* Editor area (A4 simulation) */}
      <div className="bg-[#E0E0E0]/30 p-4 max-h-[70vh] overflow-y-auto">
        <div
          className="max-w-[210mm] mx-auto bg-white shadow-md rounded-sm"
          style={{ minHeight: "297mm", padding: "25mm 20mm" }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#F7F3F1] border-t border-[#E0E0E0] text-xs text-[#666666]">
        <span>
          {charCount.toLocaleString("pt-BR")} caracteres
          {" · "}
          {wordCount.toLocaleString("pt-BR")} palavras
          {" · "}
          ~{pageEstimate} {pageEstimate === 1 ? "pagina" : "paginas"}
        </span>
        <span>
          {isGenerating ? (
            <span className="flex items-center gap-1.5 text-[#C9A961]">
              <span className="animate-pulse">●</span> Gerando...
            </span>
          ) : (
            <span className="text-green-600">Pronto para edicao</span>
          )}
        </span>
      </div>
    </div>
  )
}
