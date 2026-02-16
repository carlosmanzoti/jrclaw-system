"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Undo, Redo } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
}

export function TiptapEditor({ content, onChange, placeholder, editable = true }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[80px] px-3 py-2 focus:outline-none",
      },
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-md border">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1 py-1">
          <Button
            type="button"
            size="icon"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            className="size-7"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            className="size-7"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            className="size-7"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            className="size-7"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            className="size-7"
            onClick={() => {
              const url = window.prompt("URL:")
              if (url) editor.chain().focus().setLink({ href: url }).run()
              else editor.chain().focus().unsetLink().run()
            }}
          >
            <LinkIcon className="size-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="size-3.5" />
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

export function TiptapViewer({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
