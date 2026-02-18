import { z } from "zod"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"
import { getWhatsAppProvider, getMockConversations } from "@/lib/whatsapp"

function isMockMode(): boolean {
  const provider = process.env.WHATSAPP_PROVIDER || "mock"
  return provider === "mock"
}

export const whatsappRouter = router({
  // ─── List conversations ───
  conversations: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (isMockMode()) {
        let convs = getMockConversations()
        if (input?.status) convs = convs.filter((c) => c.status === input.status)
        if (input?.search) {
          const q = input.search.toLowerCase()
          convs = convs.filter(
            (c) =>
              c.contact_name?.toLowerCase().includes(q) ||
              c.phone_number.includes(q) ||
              c.last_message?.toLowerCase().includes(q)
          )
        }
        return { items: convs, mock: true }
      }

      const where: Record<string, unknown> = {}
      if (input?.status) where.status = input.status
      if (input?.search) {
        where.OR = [
          { contact_name: { contains: input.search, mode: "insensitive" } },
          { phone_number: { contains: input.search } },
        ]
      }

      const items = await ctx.db.whatsAppConversation.findMany({
        where,
        take: input?.limit || 50,
        orderBy: { last_message_at: "desc" },
        include: {
          person: { select: { id: true, nome: true, tipo: true } },
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
        },
      })

      return { items, mock: false }
    }),

  // ─── Get messages for a conversation ───
  messages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(200).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (isMockMode()) {
        const convs = getMockConversations()
        const conv = convs.find((c) => c.id === input.conversationId)
        return { items: conv?.messages || [], mock: true }
      }

      const items = await ctx.db.whatsAppMessage.findMany({
        where: { conversation_id: input.conversationId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { created_at: "asc" },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const next = items.pop()
        nextCursor = next?.id
      }

      return { items, nextCursor, mock: false }
    }),

  // ─── Send text message ───
  sendText: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        phone: z.string(),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) {
        return {
          id: `mock_msg_${Date.now()}`,
          status: "SENT",
          mock: true,
        }
      }

      // Check 24h window
      const conversation = await ctx.db.whatsAppConversation.findUnique({
        where: { id: input.conversationId },
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada" })
      }

      const now = new Date()
      const lastInteraction = conversation.last_interaction_at
      const windowOpen =
        lastInteraction && now.getTime() - lastInteraction.getTime() < 24 * 60 * 60 * 1000

      if (!windowOpen) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Fora da janela de 24h. Use um template aprovado.",
        })
      }

      const provider = getWhatsAppProvider()
      const result = await provider.sendText({
        to: input.phone,
        text: input.text,
      })

      if (result.status === "failed") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Falha ao enviar mensagem",
        })
      }

      // Save to DB
      const message = await ctx.db.whatsAppMessage.create({
        data: {
          conversation_id: input.conversationId,
          direction: "OUTBOUND",
          type: "TEXT",
          content: input.text,
          wa_message_id: result.messageId,
          status: "SENT",
        },
      })

      // Update conversation
      await ctx.db.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: {
          last_message: input.text,
          last_message_at: new Date(),
        },
      })

      return { id: message.id, status: "SENT", mock: false }
    }),

  // ─── Send template message ───
  sendTemplate: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        phone: z.string(),
        templateName: z.string(),
        variables: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) {
        return { id: `mock_tpl_${Date.now()}`, status: "SENT", mock: true }
      }

      // Templates can be sent outside 24h window
      const template = await ctx.db.whatsAppTemplate.findUnique({
        where: { name: input.templateName },
      })

      if (!template || template.approval_status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template não encontrado ou não aprovado",
        })
      }

      const provider = getWhatsAppProvider()
      const result = await provider.sendTemplate({
        to: input.phone,
        templateName: input.templateName,
        variables: input.variables,
      })

      if (result.status === "failed") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Falha ao enviar template",
        })
      }

      // Interpolate body for display
      let displayText = template.body_text
      input.variables.forEach((v, i) => {
        displayText = displayText.replace(`{{${i + 1}}}`, v)
      })

      const message = await ctx.db.whatsAppMessage.create({
        data: {
          conversation_id: input.conversationId,
          direction: "OUTBOUND",
          type: "TEMPLATE",
          content: displayText,
          template_name: input.templateName,
          wa_message_id: result.messageId,
          status: "SENT",
        },
      })

      await ctx.db.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: {
          last_message: displayText,
          last_message_at: new Date(),
        },
      })

      return { id: message.id, status: "SENT", mock: false }
    }),

  // ─── Mark conversation as read ───
  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) return { success: true }

      await ctx.db.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: { unread_count: 0 },
      })

      return { success: true }
    }),

  // ─── Link conversation to case/project/person ───
  linkConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        person_id: z.string().optional(),
        case_id: z.string().optional(),
        project_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) return { success: true }

      const { conversationId, ...data } = input
      await ctx.db.whatsAppConversation.update({
        where: { id: conversationId },
        data,
      })

      return { success: true }
    }),

  // ─── Archive / Unarchive conversation ───
  archiveConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        archive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) return { success: true }

      await ctx.db.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: { status: input.archive ? "ARCHIVED" : "ACTIVE" },
      })

      return { success: true }
    }),

  // ─── Create new conversation ───
  createConversation: protectedProcedure
    .input(
      z.object({
        phone_number: z.string().min(10),
        contact_name: z.string().optional(),
        person_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) {
        return {
          id: `mock_conv_new_${Date.now()}`,
          phone_number: input.phone_number,
          contact_name: input.contact_name,
          mock: true,
        }
      }

      const existing = await ctx.db.whatsAppConversation.findUnique({
        where: { phone_number: input.phone_number },
      })

      if (existing) {
        // Reactivate if archived
        if (existing.status === "ARCHIVED") {
          await ctx.db.whatsAppConversation.update({
            where: { id: existing.id },
            data: { status: "ACTIVE" },
          })
        }
        return existing
      }

      return ctx.db.whatsAppConversation.create({
        data: {
          phone_number: input.phone_number,
          contact_name: input.contact_name,
          person_id: input.person_id,
        },
      })
    }),

  // ─── Templates CRUD ───
  templates: protectedProcedure.query(async ({ ctx }) => {
    if (isMockMode()) {
      return {
        items: getDefaultTemplates(),
        mock: true,
      }
    }

    const items = await ctx.db.whatsAppTemplate.findMany({
      orderBy: { created_at: "desc" },
    })
    return { items, mock: false }
  }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        display_name: z.string().min(1),
        category: z.enum(["UTILITY", "MARKETING"]),
        body_text: z.string().min(1),
        variables: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) {
        return { id: `mock_tpl_${Date.now()}`, ...input, mock: true }
      }

      return ctx.db.whatsAppTemplate.create({
        data: {
          name: input.name,
          display_name: input.display_name,
          category: input.category,
          body_text: input.body_text,
          variables: input.variables || [],
        },
      })
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        display_name: z.string().optional(),
        body_text: z.string().optional(),
        approval_status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        rejection_reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) return { success: true }

      const { id, ...data } = input
      return ctx.db.whatsAppTemplate.update({ where: { id }, data })
    }),

  // ─── Quick replies ───
  quickReplies: protectedProcedure.query(async () => {
    // Stored as hardcoded for now — can be moved to DB later
    return [
      { id: "qr1", label: "Bom dia", text: "Bom dia! Como posso ajudar?" },
      { id: "qr2", label: "Recebido", text: "Recebido, obrigado! Vou analisar e retorno em breve." },
      { id: "qr3", label: "Documento necessário", text: "Para dar andamento, precisamos que nos envie o seguinte documento:" },
      { id: "qr4", label: "Prazo", text: "Informamos que há um prazo processual importante se aproximando. Precisamos de sua atenção." },
      { id: "qr5", label: "Audiência", text: "Sua audiência está confirmada. Por favor, compareça com antecedência de 15 minutos portando RG e CPF." },
      { id: "qr6", label: "Reunião", text: "Gostaria de agendar uma reunião para discutirmos o andamento do seu caso. Qual melhor horário para você?" },
      { id: "qr7", label: "Encerramento", text: "Fico à disposição para qualquer dúvida. Tenha um ótimo dia!" },
    ]
  }),

  // ─── Send proactive message (cross-module) ───
  sendProactive: protectedProcedure
    .input(
      z.object({
        phone: z.string(),
        templateName: z.string(),
        variables: z.array(z.string()).default([]),
        contact_name: z.string().optional(),
        case_id: z.string().optional(),
        project_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isMockMode()) {
        return { messageId: `mock_proactive_${Date.now()}`, status: "SENT", mock: true }
      }

      // Ensure conversation exists
      let conversation = await ctx.db.whatsAppConversation.findUnique({
        where: { phone_number: input.phone },
      })

      if (!conversation) {
        conversation = await ctx.db.whatsAppConversation.create({
          data: {
            phone_number: input.phone,
            contact_name: input.contact_name,
            case_id: input.case_id,
            project_id: input.project_id,
          },
        })
      }

      // Send via template (always allowed outside 24h window)
      const provider = getWhatsAppProvider()
      const result = await provider.sendTemplate({
        to: input.phone,
        templateName: input.templateName,
        variables: input.variables,
      })

      // Get template body for display
      const template = await ctx.db.whatsAppTemplate.findUnique({
        where: { name: input.templateName },
      })

      let displayText = template?.body_text || input.templateName
      input.variables.forEach((v, i) => {
        displayText = displayText.replace(`{{${i + 1}}}`, v)
      })

      await ctx.db.whatsAppMessage.create({
        data: {
          conversation_id: conversation.id,
          direction: "OUTBOUND",
          type: "TEMPLATE",
          content: displayText,
          template_name: input.templateName,
          wa_message_id: result.messageId,
          status: result.status === "sent" ? "SENT" : "FAILED",
        },
      })

      await ctx.db.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          last_message: displayText,
          last_message_at: new Date(),
        },
      })

      return { messageId: result.messageId, status: result.status, mock: false }
    }),
})

// Default templates for mock/seed
function getDefaultTemplates() {
  return [
    {
      id: "tpl-1",
      name: "movimentacao_processual",
      display_name: "Movimentação Processual",
      category: "UTILITY",
      language: "pt_BR",
      body_text: "Prezado(a) {{1}}, informamos nova movimentação no processo {{2}}: {{3}}. Para mais detalhes, entre em contato com o escritório.",
      variables: ["nome_cliente", "numero_processo", "descricao_movimentacao"],
      approval_status: "APPROVED",
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "tpl-2",
      name: "prazo_proximo",
      display_name: "Prazo Próximo",
      category: "UTILITY",
      language: "pt_BR",
      body_text: "Prezado(a) {{1}}, informamos que há um prazo processual vencendo em {{2}} no processo {{3}}. Precisamos de sua atenção para: {{4}}.",
      variables: ["nome_cliente", "data_prazo", "numero_processo", "descricao_prazo"],
      approval_status: "APPROVED",
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "tpl-3",
      name: "documento_disponivel",
      display_name: "Documento Disponível",
      category: "UTILITY",
      language: "pt_BR",
      body_text: "Prezado(a) {{1}}, o documento \"{{2}}\" está disponível para consulta no portal do cliente ou pode ser retirado no escritório.",
      variables: ["nome_cliente", "nome_documento"],
      approval_status: "APPROVED",
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "tpl-4",
      name: "reuniao_confirmacao",
      display_name: "Confirmação de Reunião",
      category: "UTILITY",
      language: "pt_BR",
      body_text: "Prezado(a) {{1}}, confirmamos sua reunião para {{2}} às {{3}}. Local: {{4}}. Confirma presença?",
      variables: ["nome_cliente", "data", "horario", "local"],
      approval_status: "APPROVED",
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "tpl-5",
      name: "proposta_acordo",
      display_name: "Proposta de Acordo",
      category: "UTILITY",
      language: "pt_BR",
      body_text: "Prezado(a) {{1}}, encaminhamos proposta de acordo referente ao processo {{2}}: {{3}}. Para discutir os termos, entre em contato conosco.",
      variables: ["nome_cliente", "numero_processo", "detalhes_proposta"],
      approval_status: "APPROVED",
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
