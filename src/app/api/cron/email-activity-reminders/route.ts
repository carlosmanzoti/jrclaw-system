import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  let sent = 0
  const errors: string[] = []

  try {
    // Find pending reminders where the activity deadline/event is approaching
    const pendingReminders = await db.emailActivityReminder.findMany({
      where: {
        sent: false,
      },
      include: {
        email_activity: {
          include: {
            responsavel: { select: { id: true, name: true, email: true } },
            case_: { select: { numero_processo: true } },
          },
        },
      },
    })

    for (const reminder of pendingReminders) {
      try {
        const activity = reminder.email_activity
        const targetDate = activity.data_limite || activity.data_evento

        if (!targetDate) continue

        // Check if it's time to send
        const reminderTime = new Date(targetDate.getTime() - reminder.offset_minutes * 60 * 1000)

        if (now >= reminderTime) {
          // For SISTEMA channel: mark as sent (will be shown in-app)
          // For EMAIL/WHATSAPP: would integrate with notification services
          await db.emailActivityReminder.update({
            where: { id: reminder.id },
            data: { sent: true, sent_at: now },
          })
          sent++
        }
      } catch (err) {
        errors.push(
          `Reminder ${reminder.id}: ${err instanceof Error ? err.message : "unknown"}`
        )
      }
    }

    // Also check for overdue activities and update status
    const overdueActivities = await db.emailActivity.findMany({
      where: {
        status: "PENDENTE",
        data_limite: { lt: now },
      },
    })

    for (const activity of overdueActivities) {
      // Mark linked deadline as PERDIDO if overdue
      if (activity.deadline_id) {
        await db.deadline.updateMany({
          where: { id: activity.deadline_id, status: "PENDENTE" },
          data: { status: "PERDIDO" },
        })
      }
    }
  } catch (err) {
    errors.push(`General: ${err instanceof Error ? err.message : "unknown"}`)
  }

  return NextResponse.json({
    sent,
    errors,
    timestamp: now.toISOString(),
  })
}
