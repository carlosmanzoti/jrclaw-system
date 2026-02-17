declare module "mammoth" {
  interface ExtractResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }

  interface ConvertOptions {
    buffer?: Buffer
    path?: string
    arrayBuffer?: ArrayBuffer
  }

  export function extractRawText(options: ConvertOptions): Promise<ExtractResult>
  export function convertToHtml(options: ConvertOptions): Promise<ExtractResult>
}
