// Polyfill DOMMatrix for pdf-parse (pdfjs-dist requires it but it only exists in browsers)
if (typeof globalThis.DOMMatrix === "undefined") {
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    m11=1;m12=0;m13=0;m14=0;m21=0;m22=1;m23=0;m24=0;
    m31=0;m32=0;m33=1;m34=0;m41=0;m42=0;m43=0;m44=1;
    a=1;b=0;c=0;d=1;e=0;f=0;is2D=true;isIdentity=true;
    constructor(..._args: any[]) {}
    transformPoint() { return { x: 0, y: 0, z: 0, w: 1 } }
    multiply() { return new DOMMatrix() }
    inverse() { return new DOMMatrix() }
    translate() { return new DOMMatrix() }
    scale() { return new DOMMatrix() }
    rotate() { return new DOMMatrix() }
    toString() { return "matrix(1,0,0,1,0,0)" }
    static fromMatrix() { return new DOMMatrix() }
    static fromFloat32Array() { return new DOMMatrix() }
    static fromFloat64Array() { return new DOMMatrix() }
  }
}

import { generateText } from "ai"
import { anthropic } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const maxDuration = 120

const ANALYSIS_PROMPT = `Você é um advogado sênior especialista em direito empresarial brasileiro. Analise a peça processual abaixo e produza um JSON com a seguinte estrutura exata:

{
  "resumo_executivo": "string — máximo 5 parágrafos com: tipo da peça e contexto processual, partes envolvidas e valores, principais argumentos apresentados, pedidos formulados, pontos de atenção para o revisor",
  "teses": [
    {
      "titulo": "string — título da tese",
      "categoria": "Principal | Subsidiária | Eventual | Preliminar",
      "fundamentacao_legal": ["Art. X, Lei Y", ...],
      "jurisprudencia": ["REsp X/UF", ...],
      "forca": "forte | moderada | fraca",
      "justificativa_forca": "string — breve justificativa"
    }
  ],
  "pontos_criticos": [
    {
      "tipo": "atencao | fragilidade | sugestao",
      "descricao": "string"
    }
  ]
}

REGRAS:
- Retorne APENAS o JSON, sem texto antes ou depois
- O resumo_executivo deve ser claro e objetivo
- Liste TODAS as teses identificadas na peça
- Para cada tese, identifique a fundamentação legal e jurisprudência CITADAS no texto
- Avalie a força da argumentação com justificativa
- Nos pontos críticos, aponte fragilidades, citações que devem ser verificadas e sugestões de melhoria
- Se não houver jurisprudência citada para uma tese, use array vazio []

Peça processual:
`

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deadlineId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { deadlineId } = await params

  try {
    // Find workspace
    const workspace = await db.deadlineWorkspace.findFirst({
      where: { deadline_id: deadlineId },
      include: {
        documents: {
          where: { is_minuta_principal: true },
          take: 1,
        },
      },
    })

    if (!workspace) {
      return Response.json({ error: "Workspace não encontrado" }, { status: 404 })
    }

    const minuta = workspace.documents[0]
    if (!minuta) {
      return Response.json({ error: "Nenhuma minuta principal juntada" }, { status: 400 })
    }

    // Fetch the file
    let fileBuffer: Buffer
    try {
      if (minuta.file_url.startsWith("http")) {
        const resp = await fetch(minuta.file_url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        fileBuffer = Buffer.from(await resp.arrayBuffer())
      } else {
        // Local file
        const fs = await import("fs")
        const path = await import("path")
        const localPath = path.join(process.cwd(), "public", minuta.file_url)
        fileBuffer = fs.readFileSync(localPath)
      }
    } catch (err) {
      console.error("[Analyze] File fetch error:", err)
      return Response.json(
        { error: "Não foi possível acessar o arquivo da minuta. Verifique se o arquivo foi enviado corretamente." },
        { status: 400 }
      )
    }

    // Extract text
    let text = ""
    const fileName = minuta.file_name.toLowerCase()

    try {
      if (fileName.endsWith(".docx")) {
        const mammoth = await import("mammoth")
        const result = await mammoth.extractRawText({ buffer: fileBuffer })
        text = result.value
      } else if (fileName.endsWith(".pdf")) {
        const pdfParse = (await import("pdf-parse")).default
        const data = await pdfParse(fileBuffer)
        text = data.text
      } else if (fileName.endsWith(".doc") || fileName.endsWith(".odt")) {
        // Fallback: try mammoth (works for some .doc files)
        try {
          const mammoth = await import("mammoth")
          const result = await mammoth.extractRawText({ buffer: fileBuffer })
          text = result.value
        } catch {
          return Response.json(
            { error: "Formato .doc/.odt não suportado para extração de texto. Converta para .docx ou .pdf." },
            { status: 400 }
          )
        }
      } else {
        return Response.json(
          { error: `Formato de arquivo não suportado para análise: ${minuta.file_name}` },
          { status: 400 }
        )
      }
    } catch (err) {
      console.error("[Analyze] Text extraction error:", err)
      return Response.json(
        { error: "Não foi possível extrair o texto do arquivo. Verifique se o arquivo não está corrompido." },
        { status: 400 }
      )
    }

    if (!text || text.trim().length < 50) {
      return Response.json(
        { error: "O arquivo parece estar vazio ou contém muito pouco texto para análise." },
        { status: 400 }
      )
    }

    // Truncate if too long (> 100k chars ~ 100 pages)
    let truncated = false
    if (text.length > 100000) {
      text = text.slice(0, 100000)
      truncated = true
    }

    // Call Claude
    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      messages: [
        {
          role: "user",
          content: ANALYSIS_PROMPT + text + (truncated ? "\n\n[NOTA: Documento truncado — análise baseada nas primeiras ~100 páginas]" : ""),
        },
      ],
      maxOutputTokens: 8192,
      temperature: 0.2,
    })

    // Parse JSON from response
    let analysis: any
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch {
      // If AI didn't return valid JSON, wrap the text
      analysis = {
        resumo_executivo: result.text,
        teses: [],
        pontos_criticos: [{ tipo: "atencao", descricao: "A IA não retornou formato estruturado. Releia o resumo acima." }],
      }
    }

    // Add metadata
    analysis.gerado_em = new Date().toISOString()
    analysis.arquivo_base = minuta.file_name
    if (truncated) {
      analysis.aviso_truncamento = "Documento muito extenso — análise baseada nas primeiras ~100 páginas"
    }

    // Save to workspace
    await db.deadlineWorkspace.update({
      where: { id: workspace.id },
      data: {
        analise_ia: JSON.stringify(analysis),
        analise_ia_data: new Date(),
        analise_ia_arquivo: minuta.file_name,
      },
    })

    // Log activity
    await db.workspaceActivity.create({
      data: {
        workspace_id: workspace.id,
        action: "IA_UTILIZADA",
        description: `Análise IA da minuta: ${minuta.file_name}`,
        user_id: session.user.id,
        user_name: session.user.name || "Sistema",
        is_system: false,
        metadata: { teses_count: analysis.teses?.length || 0 },
      },
    })

    return Response.json({ analysis })
  } catch (error: any) {
    console.error("[Analyze] Error:", error)
    return Response.json(
      { error: "Assistente IA indisponível no momento. Tente novamente em alguns minutos." },
      { status: 500 }
    )
  }
}
