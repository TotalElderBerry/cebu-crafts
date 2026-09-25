import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { inquiries, orderItems, orders, products, useDb } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const { makerId } = await requireMaker(event)
  const db = useDb()

  const [[sales], [catalogue], [openInquiries], recentOrders] = await Promise.all([
    // Revenue counts only orders that actually completed. Counting pending COD
    // orders as earnings is how a seller ends up planning against money that
    // never arrives.
    db
      .select({
        deliveredRevenue: sql<number>`coalesce(sum(case when ${orders.status} = 'delivered'
          then ${orderItems.lineTotalCentavos} else 0 end), 0)::int`,
        inProgressRevenue: sql<number>`coalesce(sum(case when ${orders.status}
          in ('confirmed','crafting','ready_to_ship','shipped')
          then ${orderItems.lineTotalCentavos} else 0 end), 0)::int`,
        unitsSold: sql<number>`coalesce(sum(case when ${orders.status} = 'delivered'
          then ${orderItems.quantity} else 0 end), 0)::int`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.makerId, makerId)),

    db
      .select({
        published: sql<number>`count(*) filter (where ${products.status} = 'published')::int`,
        draft: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`,
        outOfStock: sql<number>`count(*) filter (
          where ${products.status} = 'published'
            and ${products.isMadeToOrder} = false
            and ${products.stock} = 0)::int`,
      })
      .from(products)
      .where(eq(products.makerId, makerId)),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(and(eq(inquiries.makerId, makerId), inArray(inquiries.status, ['open', 'quoted']))),

    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        placedAt: orders.placedAt,
        paymentMethod: orders.paymentMethod,
        myTotalCentavos: sql<number>`sum(${orderItems.lineTotalCentavos})::int`,
        myItemCount: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.makerId, makerId))
      .groupBy(orders.id)
      .orderBy(desc(orders.placedAt))
      .limit(8),
  ])

  return {
    sales: sales ?? { deliveredRevenue: 0, inProgressRevenue: 0, unitsSold: 0, orderCount: 0 },
    catalogue: catalogue ?? { published: 0, draft: 0, outOfStock: 0 },
    openInquiries: openInquiries?.total ?? 0,
    recentOrders,
  }
})
