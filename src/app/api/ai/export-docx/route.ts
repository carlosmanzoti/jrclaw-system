import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  BorderStyle,
} from "docx"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { html, documentType } = await req.json()

    if (!html) {
      return NextResponse.json({ error: "Conteudo vazio" }, { status: 400 })
    }

    const blocks = parseHtmlToBlocks(html)
    const children = blocks.map((block) => blockToParagraph(block))

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 26, // 13pt
            },
            paragraph: {
              spacing: { line: 360, after: 120 },
              alignment: AlignmentType.JUSTIFIED,
            },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 28, bold: true, font: "Times New Roman", allCaps: true },
            paragraph: {
              spacing: { before: 360, after: 240 },
              alignment: AlignmentType.CENTER,
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 26, bold: true, font: "Times New Roman" },
            paragraph: {
              spacing: { before: 240, after: 120 },
              alignment: AlignmentType.LEFT,
            },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 26, bold: true, italics: true, font: "Times New Roman" },
            paragraph: {
              spacing: { before: 120, after: 60 },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 }, // A4
              margin: {
                top: 1701, // 3cm
                right: 1134, // 2cm
                bottom: 1134, // 2cm
                left: 1701, // 3cm
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      font: "Times New Roman",
                      size: 18,
                      color: "999999",
                      text: documentType || "Documento Juridico",
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: {
                    top: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "CCCCCC",
                      space: 4,
                    },
                  },
                  children: [
                    new TextRun({
                      font: "Times New Roman",
                      size: 18,
                      color: "999999",
                      text: "Pagina ",
                    }),
                    new TextRun({
                      font: "Times New Roman",
                      size: 18,
                      color: "999999",
                      children: [PageNumber.CURRENT],
                    }),
                    new TextRun({
                      font: "Times New Roman",
                      size: 18,
                      color: "999999",
                      text: " de ",
                    }),
                    new TextRun({
                      font: "Times New Roman",
                      size: 18,
                      color: "999999",
                      children: [PageNumber.TOTAL_PAGES],
                    }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${(documentType || "documento").replace(/\s+/g, "_")}.docx"`,
      },
    })
  } catch (error: unknown) {
    console.error("Erro ao gerar DOCX:", error)
    const message = error instanceof Error ? error.message : "Erro ao gerar DOCX"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML → Structured blocks parser
// ═══════════════════════════════════════════════════════════════

interface Block {
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "list-item" | "hr"
  runs: RunInfo[]
  align?: "left" | "center" | "right" | "justify"
  listType?: "bullet" | "ordered"
  listIndex?: number
}

interface RunInfo {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

function parseHtmlToBlocks(html: string): Block[] {
  const blocks: Block[] = []

  // Clean HTML entities
  let clean = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ordm;/gi, "\u00BA")
    .replace(/&ordf;/gi, "\u00AA")

  // Mark list boundaries
  clean = clean.replace(/<ul[^>]*>/gi, "<!--LIST_BULLET-->")
  clean = clean.replace(/<\/ul>/gi, "<!--/LIST-->")
  clean = clean.replace(/<ol[^>]*>/gi, "<!--LIST_ORDERED-->")
  clean = clean.replace(/<\/ol>/gi, "<!--/LIST-->")

  const parts = clean.split(/(<!--LIST_(?:BULLET|ORDERED)-->|<!--\/LIST-->)/)

  let currentListType: "bullet" | "ordered" | null = null
  let listCounter = 0

  for (const part of parts) {
    if (part === "<!--LIST_BULLET-->") {
      currentListType = "bullet"
      listCounter = 0
      continue
    }
    if (part === "<!--LIST_ORDERED-->") {
      currentListType = "ordered"
      listCounter = 0
      continue
    }
    if (part === "<!--/LIST-->") {
      currentListType = null
      continue
    }

    // Extract text-align from style attribute
    const innerRegex =
      /<(h[1-3]|p|li|hr)[^>]*?(?:style="[^"]*text-align:\s*(left|center|right|justify)[^"]*")?[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi
    let innerMatch

    while ((innerMatch = innerRegex.exec(part)) !== null) {
      const fullMatch = innerMatch[0]

      if (fullMatch.match(/^<hr/i)) {
        blocks.push({ type: "hr", runs: [] })
        continue
      }

      const tag = innerMatch[1]?.toLowerCase()
      const align = innerMatch[2] as Block["align"]
      const content = innerMatch[3] || ""

      if (!content.trim()) continue

      const runs = parseInlineFormatting(content)

      if (tag === "h1") {
        blocks.push({ type: "heading1", runs, align })
      } else if (tag === "h2") {
        blocks.push({ type: "heading2", runs, align })
      } else if (tag === "h3") {
        blocks.push({ type: "heading3", runs, align })
      } else if (tag === "li") {
        listCounter++
        blocks.push({
          type: "list-item",
          runs,
          listType: currentListType || "bullet",
          listIndex: listCounter,
        })
      } else {
        // Paragraphs: split on \n for multi-line content
        const lines = content.split("\n").filter((l) => l.trim())
        for (const line of lines) {
          const lineRuns = parseInlineFormatting(line)
          if (lineRuns.some((r) => r.text.trim())) {
            blocks.push({ type: "paragraph", runs: lineRuns, align })
          }
        }
      }
    }
  }

  // Fallback: if no blocks extracted, treat as plain paragraphs
  if (blocks.length === 0 && html.trim()) {
    const plainText = html.replace(/<[^>]+>/g, "").trim()
    const paragraphs = plainText.split(/\n\n+/)
    for (const p of paragraphs) {
      if (p.trim()) {
        blocks.push({ type: "paragraph", runs: [{ text: p.trim() }] })
      }
    }
  }

  return blocks
}

function parseInlineFormatting(html: string): RunInfo[] {
  const runs: RunInfo[] = []

  // Remove residual block tags
  const text = html.replace(/<\/?(?:p|div|span)[^>]*>/gi, "")

  // Match inline formatting tags or plain text
  const inlineRegex = /<(strong|b|em|i|u|mark)>([\s\S]*?)<\/\1>|([^<]+)/gi
  let match

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match[3]) {
      // Plain text
      const cleanText = match[3].replace(/<[^>]+>/g, "")
      if (cleanText) runs.push({ text: cleanText })
    } else {
      const tag = match[1]?.toLowerCase()
      const innerText = match[2]?.replace(/<[^>]+>/g, "") || ""

      if (!innerText) continue

      const run: RunInfo = { text: innerText }
      if (tag === "strong" || tag === "b") run.bold = true
      if (tag === "em" || tag === "i") run.italic = true
      if (tag === "u") run.underline = true
      runs.push(run)
    }
  }

  if (runs.length === 0 && html.trim()) {
    runs.push({ text: html.replace(/<[^>]+>/g, "") })
  }

  return runs
}

// ═══════════════════════════════════════════════════════════════
// Block → docx Paragraph
// ═══════════════════════════════════════════════════════════════

function blockToParagraph(block: Block): Paragraph {
  const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  }

  if (block.type === "hr") {
    return new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: "CCCCCC",
          space: 1,
        },
      },
      spacing: { before: 200, after: 200 },
      children: [],
    })
  }

  const textRuns = block.runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold || block.type === "heading1" || block.type === "heading2",
        italics: run.italic || block.type === "heading3",
        underline: run.underline ? {} : undefined,
        allCaps: block.type === "heading1" || undefined,
        font: "Times New Roman",
        size:
          block.type === "heading1"
            ? 28
            : block.type === "heading2"
              ? 26
              : block.type === "heading3"
                ? 26
                : 26,
      })
  )

  if (block.type === "heading1") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: alignMap[block.align || "center"] || AlignmentType.CENTER,
      spacing: { before: 360, after: 240 },
      children: textRuns,
    })
  }

  if (block.type === "heading2") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: alignMap[block.align || "left"] || AlignmentType.LEFT,
      spacing: { before: 240, after: 120 },
      children: textRuns,
    })
  }

  if (block.type === "heading3") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      alignment: alignMap[block.align || "left"] || AlignmentType.LEFT,
      spacing: { before: 120, after: 60 },
      children: textRuns,
    })
  }

  if (block.type === "list-item") {
    const prefix = block.listType === "ordered" ? `${block.listIndex}. ` : "\u2022 "
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { left: 720, hanging: 360 },
      spacing: { after: 60 },
      children: [
        new TextRun({ text: prefix, font: "Times New Roman", size: 26 }),
        ...textRuns,
      ],
    })
  }

  // Regular paragraph — justified with first-line indent (Brazilian legal standard)
  return new Paragraph({
    alignment: alignMap[block.align || "justify"] || AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 },
    indent: { firstLine: 851 }, // 1.5cm
    children: textRuns,
  })
}
