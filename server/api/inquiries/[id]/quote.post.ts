import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { inquiries, inquiryMessages, useDb } from '~~/server/database'
import { formatPeso } from '~/lib/utils'

/**
 * The quote handshake: a maker prices the job, the buyer accepts or declines.
 * Both actions live here because they are the same state machine, and keeping
 * them together is what stops a thread from ending up "accepted" with no price.
 */
const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('quote'),
    /** Pesos from the form. */
    price: z.number().int().min(1).max(100_000_000),
    leadTimeDays: z.number().int().min(0).max(365),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('decline'), reason: z.string().trim().max(500).optional() }),
])

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const payload = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1)
  if (!inquiry) throw createError({ statusCode: 404, statusMessage: 'Thread not found.' })

  const isBuyer = inquiry.buyerId === user.id
  const isMaker = !!user.makerId && inquiry.makerId === user.makerId

  if (!isBuyer && !isMaker) {
    throw createError({ statusCode: 403, statusMessage: 'This thread is not yours.' })
  }

  if (payload.action === 'quote') {
    if (!isMaker) {
      throw createError({ statusCode: 403, statusMessage: 'Only the maker can send a quote.' })
    }
    if (inquiry.status !== 'open' && inquiry.status !== 'quoted') {
      throw createError({ statusCode: 409, statusMessage: 'This thread is already settled.' })
    }

    const centavos = payload.price * 100
    const summary = [
      `Quote: ${formatPeso(centavos)}`,
      payload.leadTimeDays > 0 ? `ready in about ${payload.leadTimeDays} days` : 'ready now',
    ].join(', ')

    await db.batch([
      db
        .update(inquiries)
        .set({
          status: 'quoted',
          quotedPriceCentavos: centavos,
          quotedLeadTimeDays: payload.leadTimeDays,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id)),
      db.insert(inquiryMessages).values({
        inquiryId: id,
        senderId: user.id,
        body: payload.note ? `${summary}\n\n${payload.note}` : summary,
      }),
    ] as never)

    return { ok: true, status: 'quoted' as const }
  }

  // accept / decline are the buyer's call
  if (!isBuyer) {
    throw createError({ statusCode: 403, statusMessage: 'Only the buyer can answer a quote.' })
  }
  if (inquiry.status !== 'quoted') {
    throw createError({ statusCode: 409, statusMessage: 'There is no open quote to answer.' })
  }

  const accepted = payload.action === 'accept'

  await db.batch([
    db
      .update(inquiries)
      .set({ status: accepted ? 'accepted' : 'declined', updatedAt: new Date() })
      .where(eq(inquiries.id, id)),
    db.insert(inquiryMessages).values({
      inquiryId: id,
      senderId: user.id,
      body: accepted
        ? 'Quote accepted. Please go ahead.'
        : `Quote declined.${payload.action === 'decline' && payload.reason ? ` ${payload.reason}` : ''}`,
    }),
  ] as never)

  return { ok: true, status: accepted ? ('accepted' as const) : ('declined' as const) }
})
