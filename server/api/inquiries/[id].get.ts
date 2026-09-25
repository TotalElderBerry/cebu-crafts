import { asc, eq } from 'drizzle-orm'
import { inquiries, inquiryMessages, makers, products, useDb, users } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [inquiry] = await db
    .select({
      id: inquiries.id,
      buyerId: inquiries.buyerId,
      makerId: inquiries.makerId,
      type: inquiries.type,
      subject: inquiries.subject,
      status: inquiries.status,
      quantity: inquiries.quantity,
      targetBudgetCentavos: inquiries.targetBudgetCentavos,
      neededBy: inquiries.neededBy,
      quotedPriceCentavos: inquiries.quotedPriceCentavos,
      quotedLeadTimeDays: inquiries.quotedLeadTimeDays,
      createdAt: inquiries.createdAt,
      makerName: makers.shopName,
      makerSlug: makers.slug,
      makerLogo: makers.logoUrl,
      buyerName: users.name,
      productTitle: products.title,
      productSlug: products.slug,
      productImage: products.images,
    })
    .from(inquiries)
    .innerJoin(makers, eq(inquiries.makerId, makers.id))
    .innerJoin(users, eq(inquiries.buyerId, users.id))
    .leftJoin(products, eq(inquiries.productId, products.id))
    .where(eq(inquiries.id, id))
    .limit(1)

  if (!inquiry) throw createError({ statusCode: 404, statusMessage: 'Thread not found.' })

  const side =
    inquiry.buyerId === user.id ? 'buyer' : inquiry.makerId === user.makerId ? 'maker' : null

  if (!side && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'This thread is not yours.' })
  }

  const messages = await db
    .select({
      id: inquiryMessages.id,
      body: inquiryMessages.body,
      attachments: inquiryMessages.attachments,
      createdAt: inquiryMessages.createdAt,
      senderId: inquiryMessages.senderId,
      senderName: users.name,
      senderAvatar: users.avatarUrl,
    })
    .from(inquiryMessages)
    .innerJoin(users, eq(inquiryMessages.senderId, users.id))
    .where(eq(inquiryMessages.inquiryId, id))
    .orderBy(asc(inquiryMessages.createdAt))

  return { ...inquiry, side: side ?? 'admin', messages }
})
