import { desc, eq, or, sql } from 'drizzle-orm'
import { inquiries, inquiryMessages, makers, useDb, users } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()

  // One list covering both sides: threads you opened as a buyer, and threads
  // opened against your shop. `side` tells the UI which way to render it.
  const scope = user.makerId
    ? or(eq(inquiries.buyerId, user.id), eq(inquiries.makerId, user.makerId))!
    : eq(inquiries.buyerId, user.id)

  return db
    .select({
      id: inquiries.id,
      type: inquiries.type,
      subject: inquiries.subject,
      status: inquiries.status,
      quantity: inquiries.quantity,
      quotedPriceCentavos: inquiries.quotedPriceCentavos,
      updatedAt: inquiries.updatedAt,
      makerName: makers.shopName,
      makerSlug: makers.slug,
      makerLogo: makers.logoUrl,
      buyerName: users.name,
      side: sql<'buyer' | 'maker'>`
        case when ${inquiries.buyerId} = ${user.id} then 'buyer' else 'maker' end
      `,
      lastMessage: sql<string | null>`(
        select m.body from ${inquiryMessages} m
        where m.inquiry_id = ${inquiries.id}
        order by m.created_at desc limit 1
      )`,
    })
    .from(inquiries)
    .innerJoin(makers, eq(inquiries.makerId, makers.id))
    .innerJoin(users, eq(inquiries.buyerId, users.id))
    .where(scope)
    .orderBy(desc(inquiries.updatedAt))
})
