import { MicrosoftGraphService, mapOutlookMessage, type OutlookMessage, type EmailAttachment, type EmailFolder } from "./microsoft-graph"

const MSG_SELECT = "$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,flag,conversationId"

interface ListMessagesOptions {
  top?: number
  skip?: number
  filter?: string
  search?: string
  orderBy?: string
  nextLink?: string
}

interface SendMailInput {
  subject: string
  body: string
  bodyType?: "HTML" | "Text"
  to: { name?: string; email: string }[]
  cc?: { name?: string; email: string }[]
  bcc?: { name?: string; email: string }[]
  attachments?: { name: string; contentType: string; contentBytes: string }[]
  replyToMessageId?: string
}

export class MicrosoftGraphMailService extends MicrosoftGraphService {

  async listMessages(folderId: string, options: ListMessagesOptions = {}): Promise<{ messages: OutlookMessage[]; nextLink?: string }> {
    let url: string

    if (options.nextLink) {
      url = options.nextLink
    } else {
      const top = options.top || 25
      const orderBy = options.orderBy || "receivedDateTime desc"
      const params = [`${MSG_SELECT}`, `$top=${top}`, `$orderby=${orderBy}`]
      if (options.skip) params.push(`$skip=${options.skip}`)
      if (options.filter) params.push(`$filter=${options.filter}`)
      if (options.search) params.push(`$search="${options.search}"`)
      url = `/me/mailFolders/${folderId}/messages?${params.join("&")}`
    }

    const res = await this.graphFetch(url)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to list messages: ${err}`)
    }

    const data = await res.json()
    return {
      messages: (data.value || []).map(mapOutlookMessage),
      nextLink: data["@odata.nextLink"] || undefined,
    }
  }

  async getMessage(messageId: string): Promise<OutlookMessage> {
    const res = await this.graphFetch(
      `/me/messages/${messageId}?$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,flag,conversationId,replyTo`
    )
    if (!res.ok) throw new Error(`Failed to get message: ${await res.text()}`)
    return mapOutlookMessage(await res.json())
  }

  async listAttachments(messageId: string): Promise<EmailAttachment[]> {
    const res = await this.graphFetch(`/me/messages/${messageId}/attachments`)
    if (!res.ok) throw new Error(`Failed to list attachments: ${await res.text()}`)
    const data = await res.json()
    return (data.value || []).map((a: any) => ({
      id: a.id,
      name: a.name || "attachment",
      contentType: a.contentType || "application/octet-stream",
      size: a.size || 0,
      isInline: a.isInline || false,
    }))
  }

  async downloadAttachment(messageId: string, attachmentId: string): Promise<{ data: Buffer; name: string; contentType: string }> {
    const res = await this.graphFetch(`/me/messages/${messageId}/attachments/${attachmentId}`)
    if (!res.ok) throw new Error(`Failed to download attachment: ${await res.text()}`)
    const att = await res.json()
    return {
      data: Buffer.from(att.contentBytes || "", "base64"),
      name: att.name || "attachment",
      contentType: att.contentType || "application/octet-stream",
    }
  }

  async sendMail(input: SendMailInput): Promise<void> {
    if (input.replyToMessageId) {
      const res = await this.graphFetch(`/me/messages/${input.replyToMessageId}/reply`, {
        method: "POST",
        body: JSON.stringify({
          message: {
            body: { contentType: input.bodyType || "HTML", content: input.body },
            toRecipients: input.to.map((r) => ({ emailAddress: { name: r.name, address: r.email } })),
            ccRecipients: (input.cc || []).map((r) => ({ emailAddress: { name: r.name, address: r.email } })),
          },
        }),
      })
      if (!res.ok) throw new Error(`Failed to reply: ${await res.text()}`)
      return
    }

    const message: any = {
      subject: input.subject,
      body: { contentType: input.bodyType || "HTML", content: input.body },
      toRecipients: input.to.map((r) => ({ emailAddress: { name: r.name, address: r.email } })),
    }
    if (input.cc?.length) {
      message.ccRecipients = input.cc.map((r) => ({ emailAddress: { name: r.name, address: r.email } }))
    }
    if (input.bcc?.length) {
      message.bccRecipients = input.bcc.map((r) => ({ emailAddress: { name: r.name, address: r.email } }))
    }
    if (input.attachments?.length) {
      message.attachments = input.attachments.map((a) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: a.name,
        contentType: a.contentType,
        contentBytes: a.contentBytes,
      }))
    }

    const res = await this.graphFetch("/me/sendMail", {
      method: "POST",
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error(`Failed to send mail: ${await res.text()}`)
  }

  async forwardMail(messageId: string, input: { to: { name?: string; email: string }[]; comment?: string }): Promise<void> {
    const res = await this.graphFetch(`/me/messages/${messageId}/forward`, {
      method: "POST",
      body: JSON.stringify({
        comment: input.comment || "",
        toRecipients: input.to.map((r) => ({ emailAddress: { name: r.name, address: r.email } })),
      }),
    })
    if (!res.ok) throw new Error(`Failed to forward: ${await res.text()}`)
  }

  async markRead(messageId: string, isRead: boolean): Promise<void> {
    const res = await this.graphFetch(`/me/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead }),
    })
    if (!res.ok) throw new Error(`Failed to mark read: ${await res.text()}`)
  }

  async toggleFlag(messageId: string, flagged: boolean): Promise<void> {
    const res = await this.graphFetch(`/me/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({
        flag: { flagStatus: flagged ? "flagged" : "notFlagged" },
      }),
    })
    if (!res.ok) throw new Error(`Failed to toggle flag: ${await res.text()}`)
  }

  async moveMessage(messageId: string, destinationFolderId: string): Promise<void> {
    const res = await this.graphFetch(`/me/messages/${messageId}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: destinationFolderId }),
    })
    if (!res.ok) throw new Error(`Failed to move message: ${await res.text()}`)
  }

  async deleteMessage(messageId: string): Promise<void> {
    const res = await this.graphFetch(`/me/messages/${messageId}`, {
      method: "DELETE",
    })
    if (!res.ok && res.status !== 204) throw new Error(`Failed to delete: ${await res.text()}`)
  }

  async listFolders(): Promise<EmailFolder[]> {
    const res = await this.graphFetch("/me/mailFolders?$top=50")
    if (!res.ok) throw new Error(`Failed to list folders: ${await res.text()}`)
    const data = await res.json()
    return (data.value || []).map((f: any) => ({
      id: f.id,
      displayName: f.displayName || "",
      unreadCount: f.unreadItemCount || 0,
      totalCount: f.totalItemCount || 0,
    }))
  }

  async searchContacts(query: string): Promise<{ name: string; email: string }[]> {
    const res = await this.graphFetch(`/me/people?$search="${encodeURIComponent(query)}"&$top=10&$select=displayName,emailAddresses`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.value || [])
      .filter((p: any) => p.emailAddresses?.length)
      .map((p: any) => ({
        name: p.displayName || "",
        email: p.emailAddresses[0]?.address || "",
      }))
  }

  async getUnreadCount(): Promise<number> {
    const res = await this.graphFetch("/me/mailFolders/inbox?$select=unreadItemCount")
    if (!res.ok) return 0
    const data = await res.json()
    return data.unreadItemCount || 0
  }
}
