import { eq } from 'drizzle-orm'
import { orderEvents, orders, useDb } from '~~/server/database'

/**
 * Reconcile an order against PayMongo on demand.
 *
 * Two reasons this exists alongside the webhook:
 *
 *   1. In local development there is no public URL for PayMongo to call, so the
 *      webhook never arrives. This keeps the flow testable without a tunnel.
 *   2. Buyers routinely land back on the order page before the webhook does.
 *      Polling once on return means they see "Paid" immediately instead of an
 *      order that still says unpaid.
 *
 * The webhook remains authoritative; this asks PayMongo the same question over
 * the API and applies the same result. Both paths are idempotent, so whichever
 * arrives second is a no-op.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [order] = await db
    .select({
      id: orders.id,
      buyerId: orders.buyerId,
      totalCentavos: orders.totalCentavos,
      paymentStatus: orders.paymentStatus,
      paymentSessionId: orders.paymentSessionId,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })

  if (order.buyerId !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'This is not your order.' })
  }

  if (order.paymentStatus === 'paid') {
    return { paymentStatus: 'paid' as const, changed: false }
  }

  const paymongo = paymongoConfig()

  if (!paymongo || !order.paymentSessionId) {
    return { paymentStatus: order.paymentStatus, changed: false }
  }

  const session = await retrieveCheckoutSession(paymongo.secretKey, order.paymentSessionId)
  const payment = session.payments.find((p) => p.status === 'paid')

  if (!payment) {
    return { paymentStatus: order.paymentStatus, changed: false }
  }

  if (payment.amount < order.totalCentavos) {
    console.error(
      `[paymongo] underpayment on order ${order.id}: paid ${payment.amount}, expected ${order.totalCentavos}`,
    )
    throw createError({
      statusCode: 409,
      statusMessage: 'The amount paid does not match this order. It has been flagged for review.',
    })
  }

  await db.batch([
    db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        paymentRef: payment.id,
        paymentRail: payment.rail,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id)),
    db.insert(orderEvents).values({
      orderId: order.id,
      status: 'pending',
      note: `Paid online${payment.rail ? ` via ${payment.rail.replace('_', ' ')}` : ''}.`,
      actorId: user.id,
    }),
  ] as never)

  return { paymentStatus: 'paid' as const, changed: true }
})
