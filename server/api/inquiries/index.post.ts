import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { inquiries, inquiryMessages, makers, useDb } from '~~/server/database'

const bodySchema = z.object({
  makerSlug: z.string().trim().min(1),
  productId: z.string().uuid().nullable().optional(),
  type: z.enum(['custom', 'bulk', 'wholesale', 'question']).default('question'),
  subject: z.string().trim().min(4, 'Give your request a short title.').max(140),
  message: z.string().trim().min(10, 'Tell the maker what you need.').max(2000),
  quantity: z.number().int().min(1).max(100000).nullable().optional(),
  targetBudget: z.number().int().min(0).nullable().optional(),
  neededBy: z.string().date().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [maker] = await db
    .select({
      id: makers.id,
      userId: makers.userId,
      acceptsCustomOrders: makers.acceptsCustomOrders,
      acceptsWholesale: makers.acceptsWholesale,
    })
    .from(makers)
    .where(eq(makers.slug, body.makerSlug))
    .limit(1)

  if (!maker) throw createError({ statusCode: 404, statusMessage: 'Shop not found.' })

  if (maker.userId === user.id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot message your own shop.' })
  }

  if (body.type === 'custom' && !maker.acceptsCustomOrders) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This shop is not taking custom orders right now.',
    })
  }

  if ((body.type === 'wholesale' || body.type === 'bulk') && !maker.acceptsWholesale) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This shop is not taking wholesale enquiries right now.',
    })
  }

  const inquiryId = crypto.randomUUID()

  await db.batch([
    db.insert(inquiries).values({
      id: inquiryId,
      buyerId: user.id,
      makerId: maker.id,
      productId: body.productId ?? null,
      type: body.type,
      subject: body.subject,
      quantity: body.quantity ?? null,
      // Budget arrives in pesos from the form; store centavos.
      targetBudgetCentavos: body.targetBudget != null ? body.targetBudget * 100 : null,
      neededBy: body.neededBy ?? null,
      status: 'open',
    }),
    db.insert(inquiryMessages).values({
      inquiryId,
      senderId: user.id,
      body: body.message,
    }),
  ] as never)

  setResponseStatus(event, 201)
  return { id: inquiryId }
})
