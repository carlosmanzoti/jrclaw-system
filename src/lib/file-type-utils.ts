export type FileCategory = "pdf" | "docx" | "xlsx" | "txt" | "md" | "image" | "csv" | "rtf" | "unknown"

const EXT_MAP: Record<string, FileCategory> = {
  pdf: "pdf",
  docx: "docx",
  doc: "docx",
  xlsx: "xlsx",
  xls: "xlsx",
  txt: "txt",
  md: "md",
  csv: "csv",
  rtf: "rtf",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
}

const MIME_MAP: Record<string, FileCategory> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
}

export function getFileCategory(arquivoTipo?: string | null, arquivoUrl?: string | null): FileCategory {
  if (arquivoTipo) {
    const lower = arquivoTipo.toLowerCase()
    if (EXT_MAP[lower]) return EXT_MAP[lower]
    if (MIME_MAP[lower]) return MIME_MAP[lower]
  }

  if (arquivoUrl) {
    const ext = arquivoUrl.split(".").pop()?.toLowerCase().split("?")[0]
    if (ext && EXT_MAP[ext]) return EXT_MAP[ext]
  }

  return "unknown"
}

const CATEGORY_LABELS: Record<FileCategory, string> = {
  pdf: "PDF",
  docx: "DOCX",
  xlsx: "Excel",
  txt: "Texto",
  md: "Markdown",
  image: "Imagem",
  csv: "CSV",
  rtf: "RTF",
  unknown: "Arquivo",
}

export function getFileCategoryLabel(cat: FileCategory): string {
  return CATEGORY_LABELS[cat]
}

const CATEGORY_COLORS: Record<FileCategory, string> = {
  pdf: "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  xlsx: "bg-green-100 text-green-700",
  txt: "bg-gray-100 text-gray-700",
  md: "bg-purple-100 text-purple-700",
  image: "bg-amber-100 text-amber-700",
  csv: "bg-emerald-100 text-emerald-700",
  rtf: "bg-orange-100 text-orange-700",
  unknown: "bg-gray-100 text-gray-500",
}

export function getFileCategoryColor(cat: FileCategory): string {
  return CATEGORY_COLORS[cat]
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function canViewInApp(cat: FileCategory): boolean {
  return cat !== "unknown" && cat !== "rtf"
}

export function highlightInHtml(html: string, query: string): string {
  if (!query || !html) return html
  const terms = query.split(/\s+/).filter((t) => t.length >= 2)
  if (terms.length === 0) return html

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi")

  // Split by HTML tags, only replace in text nodes
  const parts = html.split(/(<[^>]*>)/)
  return parts
    .map((part) => {
      if (part.startsWith("<")) return part
      return part.replace(pattern, "<mark>$1</mark>")
    })
    .join("")
}
