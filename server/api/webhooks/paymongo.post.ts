import { eq } from 'drizzle-orm'
import { orderEvents, orders, useDb, webhookEvents } from '~~/server/database'

/**
 * PayMongo webhook receiver.
 *
 * This endpoint is public, so the signature is the only thing standing between
 * a stranger and marking any order paid. Three rules:
 *
 *   1. Verify against the RAW body, before parsing.
 *   2. Never trust an amount or status from the payload alone — it is checked
 *      against the order we hold.
 *   3. Be idempotent. PayMongo retries on non-2xx and can redeliver on success.
 *
 * Register it in the PayMongo dashboard against:
 *   https://<your-origin>/api/webhooks/paymongo
 * subscribed to `checkout_session.payment.paid` and `payment.failed`.
 */
export default defineEventHandler(async (event) => {
  const paymongo = paymongoConfig()

  if (!paymongo?.webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Webhooks are not configured.' })
  }

  // Raw text, not readBody — re-serialising JSON changes bytes and the HMAC
  // would never match.
  const rawBody = await readRawBody(event, 'utf8')

  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty body.' })
  }

  const valid = verifyWebhookSignature({
    rawBody,
    signatureHeader: getHeader(event, 'paymongo-signature'),
    webhookSecret: paymongo.webhookSecret,
  })

  if (!valid) {
    // 401, not 400: a bad signature is an auth failure, and PayMongo should not
    // treat it as a transient error worth retrying.
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature.' })
  }

  const payload = JSON.parse(rawBody)
  const eventId: string | undefined = payload?.data?.id
  const eventType: string | undefined = payload?.data?.attributes?.type
  const resource = payload?.data?.attributes?.data
  const resourceId: string | undefined = resource?.id

  if (!eventId || !eventType) {
    throw createError({ statusCode: 400, statusMessage: 'Unrecognised event shape.' })
  }

  const db = useDb()

  // Idempotency: the event id is the primary key, so a replay conflicts and we
  // stop here rather than writing a duplicate timeline entry.
  const claimed = await db
    .insert(webhookEvents)
    .values({ id: eventId, type: eventType, payload })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id })

  if (!claimed.length) {
    return { received: true, duplicate: true }
  }

  // Only settlement events change anything. Everything else is recorded above
  // and acknowledged, so PayMongo stops retrying it.
  if (eventType !== 'checkout_session.payment.paid' && eventType !== 'payment.failed') {
    return { received: true, ignored: eventType }
  }

  const sessionId =
    eventType === 'checkout_session.payment.paid'
      ? resourceId
      : // A payment.failed event carries the payment, not the session; its
        // checkout session is on the payment intent's metadata when present.
        (resource?.attributes?.data?.id ?? null)

  if (!sessionId) return { received: true, unmatched: true }

  const [order] = await db
    .select({
      id: orders.id,
      totalCentavos: orders.totalCentavos,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders)
    .where(eq(orders.paymentSessionId, sessionId))
    .limit(1)

  if (!order) {
    // Acknowledge anyway — retrying will not conjure an order, and a 4xx here
    // would have PayMongo hammering the endpoint.
    console.warn('[paymongo] no order for checkout session', sessionId)
    return { received: true, unmatched: true }
  }

  await db.update(webhookEvents).set({ orderId: order.id }).where(eq(webhookEvents.id, eventId))

  if (eventType === 'payment.failed') {
    await db.batch([
      db
        .update(orders)
        .set({ paymentStatus: 'failed', updatedAt: new Date() })
        .where(eq(orders.id, order.id)),
      db.insert(orderEvents).values({
        orderId: order.id,
        status: 'pending',
        note: 'Payment failed. The order is held, so you can retry payment.',
      }),
    ] as never)

    return { received: true }
  }

  // --- paid ---------------------------------------------------------------
  if (order.paymentStatus === 'paid') {
    return { received: true, alreadyPaid: true }
  }

  const payment = resource?.attributes?.payments?.[0]
  const paidAmount: number = payment?.attributes?.amount ?? 0
  const rail: string | null = payment?.attributes?.source?.type ?? null

  // Guard against a session that somehow settled for less than the order.
  if (paidAmount && paidAmount < order.totalCentavos) {
    console.error(
      `[paymongo] underpayment on order ${order.id}: paid ${paidAmount}, expected ${order.totalCentavos}`,
    )
    await db.insert(orderEvents).values({
      orderId: order.id,
      status: 'pending',
      note: 'Payment amount did not match the order total. Flagged for review.',
    })
    return { received: true, mismatch: true }
  }

  await db.batch([
    db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        paymentRef: payment?.id ?? null,
        paymentRail: rail,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id)),
    db.insert(orderEvents).values({
      orderId: order.id,
      status: 'pending',
      note: `Paid online${rail ? ` via ${rail.replace('_', ' ')}` : ''}.`,
    }),
  ] as never)

  return { received: true }
})
