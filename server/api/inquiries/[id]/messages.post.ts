import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { inquiries, inquiryMessages, useDb } from '~~/server/database'

const bodySchema = z.object({
  body: z.string().trim().min(1, 'Write something first.').max(2000),
  attachments: z.array(z.string().url()).max(6).default([]),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const payload = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [inquiry] = await db
    .select({ id: inquiries.id, buyerId: inquiries.buyerId, makerId: inquiries.makerId, status: inquiries.status })
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1)

  if (!inquiry) throw createError({ statusCode: 404, statusMessage: 'Thread not found.' })

  const participant = inquiry.buyerId === user.id || inquiry.makerId === user.makerId
  if (!participant) {
    throw createError({ statusCode: 403, statusMessage: 'This thread is not yours.' })
  }

  if (inquiry.status === 'closed' || inquiry.status === 'declined') {
    throw createError({ statusCode: 409, statusMessage: 'This thread is closed.' })
  }

  const [message] = await db
    .insert(inquiryMessages)
    .values({ inquiryId: id, senderId: user.id, body: payload.body, attachments: payload.attachments })
    .returning()

  // Bumps the thread to the top of both parties' lists.
  await db.update(inquiries).set({ updatedAt: new Date() }).where(eq(inquiries.id, id))

  setResponseStatus(event, 201)
  return message
})
