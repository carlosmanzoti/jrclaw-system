import { createElement, type ReactElement } from "react"
import type { ReportData } from "@/types/reports"

export interface GenerateReportPDFOptions {
  data: ReportData
  clientName: string
  periodLabel: string
  executiveSummary: string
  nextSteps: string
}

/**
 * Generate a PDF Blob from report data.
 * Must be called on the client side (browser).
 * Uses dynamic import to avoid DOMMatrix SSR error.
 */
export async function generateReportPDF(
  options: GenerateReportPDFOptions
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer")
  const { ReportPDFDocument } = await import("./report-pdf-template")

  const doc = createElement(ReportPDFDocument, {
    data: options.data,
    clientName: options.clientName,
    periodLabel: options.periodLabel,
    executiveSummary: options.executiveSummary,
    nextSteps: options.nextSteps,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as ReactElement<any>).toBlob()
  return blob
}

/**
 * Generate PDF and trigger browser download.
 */
export async function downloadReportPDF(
  options: GenerateReportPDFOptions & { fileName?: string }
): Promise<void> {
  const blob = await generateReportPDF(options)

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download =
    options.fileName ||
    `relatorio-${options.clientName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
