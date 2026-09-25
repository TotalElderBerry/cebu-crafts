import { eq } from 'drizzle-orm'
import { orderItems, orders, useDb } from '~~/server/database'

/**
 * Open a fresh PayMongo Checkout Session for an order that is not paid yet.
 *
 * Needed because abandoning a hosted checkout is normal — the buyer closes the
 * tab, the GCash app times out, the session expires. Without this the order is
 * stranded: it exists, it holds stock, and there is no way to pay it.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)

  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
  if (order.buyerId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'This is not your order.' })
  }
  if (order.paymentStatus === 'paid') {
    throw createError({ statusCode: 409, statusMessage: 'This order is already paid.' })
  }
  if (['cancelled', 'refunded'].includes(order.status)) {
    throw createError({ statusCode: 409, statusMessage: 'This order is closed.' })
  }

  const paymongo = paymongoConfig()
  if (!paymongo) {
    throw createError({ statusCode: 503, statusMessage: 'Online payment is not configured.' })
  }
  if (order.totalCentavos < PAYMONGO_MIN_CENTAVOS) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This order is below the online payment minimum.',
    })
  }

  const lines = await db
    .select({
      titleSnapshot: orderItems.titleSnapshot,
      unitPriceCentavos: orderItems.unitPriceCentavos,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, id))

  const origin = getRequestOrigin(event)

  const session = await createCheckoutSession({
    secretKey: paymongo.secretKey,
    rails: paymongo.rails,
    lineItems: lines.map((l) => ({
      name: l.titleSnapshot,
      amountCentavos: l.unitPriceCentavos,
      quantity: l.quantity,
    })),
    shippingCentavos: order.shippingCentavos,
    referenceNumber: order.orderNumber,
    description: `Likha Cebu order ${order.orderNumber}`,
    successUrl: `${origin}/orders/${order.id}?paid=1`,
    cancelUrl: `${origin}/orders/${order.id}?cancelled=1`,
    billing: {
      name: order.shippingAddress.fullName,
      email: user.email,
      phone: order.shippingAddress.phone,
    },
  })

  // Point the order at the new session, so the webhook matches on it and the
  // superseded one can no longer settle this order.
  await db
    .update(orders)
    .set({
      paymentMethod: 'paymongo',
      paymentSessionId: session.id,
      paymentStatus: 'unpaid',
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id))

  return { checkoutUrl: session.checkoutUrl }
})
