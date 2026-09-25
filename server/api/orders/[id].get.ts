import { asc, eq } from 'drizzle-orm'
import { makers, orderEvents, orderItems, orders, products, useDb } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
  }

  const [items, events] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        titleSnapshot: orderItems.titleSnapshot,
        imageSnapshot: orderItems.imageSnapshot,
        variantSnapshot: orderItems.variantSnapshot,
        unitPriceCentavos: orderItems.unitPriceCentavos,
        quantity: orderItems.quantity,
        lineTotalCentavos: orderItems.lineTotalCentavos,
        productSlug: products.slug,
        makerId: makers.id,
        makerName: makers.shopName,
        makerSlug: makers.slug,
      })
      .from(orderItems)
      .innerJoin(makers, eq(orderItems.makerId, makers.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id)),

    db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.createdAt)),
  ])

  // The buyer owns it, or a maker has a line in it, or an admin is looking.
  const isBuyer = order.buyerId === user.id
  const isSellingMaker = !!user.makerId && items.some((i) => i.makerId === user.makerId)

  if (!isBuyer && !isSellingMaker && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'This is not your order.' })
  }

  return {
    ...order,
    // A maker sees only their own lines, not what the buyer bought elsewhere.
    items: isBuyer || user.role === 'admin' ? items : items.filter((i) => i.makerId === user.makerId),
    events,
    viewerRole: isBuyer ? 'buyer' : isSellingMaker ? 'maker' : 'admin',
  }
})
