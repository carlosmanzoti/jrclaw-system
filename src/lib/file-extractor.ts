export interface ExtractedFile {
  filename: string
  text: string
  chars: number
  label: string
}

export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  const name = file.name.toLowerCase()

  // Client-side extraction for plain text files
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const text = await file.text()
    return { filename: file.name, text, chars: text.length, label: "" }
  }

  // Image files: allow upload but no text extraction
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp")) {
    return { filename: file.name, text: "", chars: 0, label: "" }
  }

  // For PDF/DOCX/XLSX/CSV/RTF, send to server
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/extract-text", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(data.error || "Erro ao extrair texto do arquivo")
  }

  const data = await res.json()
  return { filename: data.filename, text: data.text, chars: data.chars, label: "" }
}

export const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".txt", ".xlsx", ".xls", ".csv", ".rtf", ".md",
  ".jpg", ".jpeg", ".png",
]

export function isFileSupported(file: File): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  )
}

export const FILE_LABELS = [
  "Decisão recorrida",
  "Contrato em análise",
  "Sentença",
  "Acórdão",
  "Petição da parte contrária",
  "Laudo pericial",
  "Parecer técnico",
  "Procuração",
  "Legislação",
  "Outro",
]
