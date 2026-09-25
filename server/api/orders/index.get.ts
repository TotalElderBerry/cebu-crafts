import { desc, eq, sql } from 'drizzle-orm'
import { orderItems, orders, useDb } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      totalCentavos: orders.totalCentavos,
      placedAt: orders.placedAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      // A thumbnail strip is enough for the list; full lines load on tap.
      thumbnails: sql<string[]>`
        coalesce(array_agg(${orderItems.imageSnapshot})
          filter (where ${orderItems.imageSnapshot} is not null), '{}')
      `,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.buyerId, user.id))
    .groupBy(orders.id)
    .orderBy(desc(orders.placedAt))
})
