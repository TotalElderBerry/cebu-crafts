import { desc, eq, sql } from 'drizzle-orm'
import { orderItems, orders, useDb, users } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const { makerId } = await requireMaker(event)
  const db = useDb()

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      placedAt: orders.placedAt,
      buyerName: users.name,
      shippingAddress: orders.shippingAddress,
      // Totals are this maker's share only — an order can span several shops.
      myTotalCentavos: sql<number>`sum(${orderItems.lineTotalCentavos})::int`,
      myItems: sql<{ title: string; qty: number; image: string | null }[]>`
        json_agg(json_build_object(
          'title', ${orderItems.titleSnapshot},
          'qty', ${orderItems.quantity},
          'image', ${orderItems.imageSnapshot}
        ))
      `,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(orderItems.makerId, makerId))
    .groupBy(orders.id, users.name)
    .orderBy(desc(orders.placedAt))
})
