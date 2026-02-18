import { MicrosoftGraphService } from "./microsoft-graph"

// ═══ Types ═══

export interface OneDriveItem {
  id: string
  name: string
  size: number
  webUrl: string
  lastModifiedDateTime: string
  createdDateTime: string
  folder?: { childCount: number }
  file?: { mimeType: string }
  parentReference?: {
    id: string
    name: string
    path: string
  }
}

export interface OneDriveBreadcrumb {
  id: string
  name: string
}

export class MicrosoftGraphOneDriveService extends MicrosoftGraphService {

  async listFiles(folderId?: string): Promise<OneDriveItem[]> {
    const endpoint = folderId
      ? `/me/drive/items/${folderId}/children?$top=200&$orderby=name`
      : `/me/drive/root/children?$top=200&$orderby=name`

    const res = await this.graphFetch(endpoint)
    if (!res.ok) throw new Error(`Failed to list files: ${await res.text()}`)
    const data = await res.json()
    return data.value || []
  }

  async uploadFile(
    folderId: string,
    fileBuffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<OneDriveItem> {
    // For files < 4MB use simple upload
    const endpoint = `/me/drive/items/${folderId}:/${encodeURIComponent(filename)}:/content`

    const res = await this.graphFetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: new Uint8Array(fileBuffer),
    })
    if (!res.ok) throw new Error(`Failed to upload file: ${await res.text()}`)
    return res.json()
  }

  async downloadFile(fileId: string): Promise<Response> {
    const res = await this.graphFetch(`/me/drive/items/${fileId}/content`)
    if (!res.ok) throw new Error(`Failed to download file: ${await res.text()}`)
    return res
  }

  async createFolder(parentId: string, name: string): Promise<OneDriveItem> {
    const res = await this.graphFetch(`/me/drive/items/${parentId}/children`, {
      method: "POST",
      body: JSON.stringify({
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    })

    // If folder already exists (409), try to find it
    if (res.status === 409) {
      const items = await this.listFiles(parentId)
      const existing = items.find((i) => i.name === name && i.folder)
      if (existing) return existing
      throw new Error(`Folder "${name}" conflict but not found`)
    }

    if (!res.ok) throw new Error(`Failed to create folder: ${await res.text()}`)
    return res.json()
  }

  async getItem(itemId: string): Promise<OneDriveItem> {
    const res = await this.graphFetch(`/me/drive/items/${itemId}`)
    if (!res.ok) throw new Error(`Failed to get item: ${await res.text()}`)
    return res.json()
  }

  async ensureFolderPath(path: string): Promise<string> {
    // path like "JRCLaw/Processos/1234567-89.2024.1.00.0001"
    const parts = path.split("/").filter(Boolean)
    let currentId = "root"

    for (const part of parts) {
      try {
        // Try to get the folder by path
        const endpoint = currentId === "root"
          ? `/me/drive/root:/${part}`
          : `/me/drive/items/${currentId}:/${part}`

        const res = await this.graphFetch(endpoint)
        if (res.ok) {
          const item = await res.json()
          currentId = item.id
          continue
        }
      } catch {
        // Folder doesn't exist, create it
      }

      const folder = await this.createFolder(currentId, part)
      currentId = folder.id
    }

    return currentId
  }

  async getProcessoFolder(numero: string): Promise<string> {
    return this.ensureFolderPath(`JRCLaw/Processos/${numero}`)
  }

  async getProjetoFolder(codigo: string): Promise<string> {
    return this.ensureFolderPath(`JRCLaw/Projetos/${codigo}`)
  }

  async search(query: string): Promise<OneDriveItem[]> {
    const res = await this.graphFetch(
      `/me/drive/root:/JRCLaw:/search(q='${encodeURIComponent(query)}')?$top=25`
    )
    if (!res.ok) throw new Error(`Failed to search: ${await res.text()}`)
    const data = await res.json()
    return data.value || []
  }

  async getBreadcrumbs(itemId: string): Promise<OneDriveBreadcrumb[]> {
    const breadcrumbs: OneDriveBreadcrumb[] = []
    let currentId = itemId

    while (currentId && currentId !== "root") {
      try {
        const item = await this.getItem(currentId)
        breadcrumbs.unshift({ id: item.id, name: item.name })
        currentId = item.parentReference?.id || ""
      } catch {
        break
      }
    }

    return breadcrumbs
  }
}
