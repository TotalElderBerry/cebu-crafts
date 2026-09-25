import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { orderEvents, orderItems, orders, products, useDb } from '~~/server/database'

type Status = (typeof STATUSES)[number]

const STATUSES = [
  'pending',
  'confirmed',
  'crafting',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

/**
 * Allowed transitions. Keeping this explicit — rather than letting any status
 * be written over any other — is what stops a delivered order from silently
 * going back to "crafting" and stops the timeline from lying to the buyer.
 */
const TRANSITIONS: Record<Status, Status[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['crafting', 'ready_to_ship', 'cancelled'],
  crafting: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

/** Who may move an order into a given state. */
const ACTOR: Record<Status, Array<'buyer' | 'maker' | 'admin'>> = {
  pending: [],
  confirmed: ['maker', 'admin'],
  crafting: ['maker', 'admin'],
  ready_to_ship: ['maker', 'admin'],
  shipped: ['maker', 'admin'],
  // Buyers confirm receipt themselves; a maker marking their own delivery
  // complete is how COD disputes start.
  delivered: ['buyer', 'admin'],
  cancelled: ['buyer', 'maker', 'admin'],
  refunded: ['admin'],
}

const bodySchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(300).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })

  const lines = await db
    .select({ makerId: orderItems.makerId })
    .from(orderItems)
    .where(eq(orderItems.orderId, id))

  const role: 'buyer' | 'maker' | 'admin' | null =
    user.role === 'admin'
      ? 'admin'
      : order.buyerId === user.id
        ? 'buyer'
        : user.makerId && lines.some((l) => l.makerId === user.makerId)
          ? 'maker'
          : null

  if (!role) throw createError({ statusCode: 403, statusMessage: 'This is not your order.' })

  if (!TRANSITIONS[order.status].includes(body.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: `An order that is "${order.status}" cannot become "${body.status}".`,
    })
  }

  if (!ACTOR[body.status].includes(role)) {
    throw createError({
      statusCode: 403,
      statusMessage: `A ${role} cannot mark an order as "${body.status}".`,
    })
  }

  // COD settles on delivery; card orders were already paid at checkout.
  const paymentStatus =
    body.status === 'delivered' && order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus

  // Checkout reserves stock at order time, including for online payments that
  // may never be completed. Cancelling has to give it back, or an abandoned
  // GCash checkout silently burns inventory that was never sold.
  // Drizzle's batch tuple type does not accept a spread array, so these are
  // collected loosely and cast with the rest of the batch below.
  const restock: unknown[] = []

  if (body.status === 'cancelled' || body.status === 'refunded') {
    const soldLines = await db
      .select({ productId: orderItems.productId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, id), isNotNull(orderItems.productId)))

    for (const line of soldLines) {
      restock.push(
        db
          .update(products)
          .set({ stock: sql`${products.stock} + ${line.quantity}` })
          // Made-to-order listings never had stock deducted, so they must not
          // be credited here — that would invent inventory.
          .where(and(eq(products.id, line.productId!), eq(products.isMadeToOrder, false))),
      )
    }
  }

  await db.batch([
    db
      .update(orders)
      .set({ status: body.status, paymentStatus, updatedAt: new Date() })
      .where(eq(orders.id, id)),
    db.insert(orderEvents).values({
      orderId: id,
      status: body.status,
      note: body.note,
      actorId: user.id,
    }),
    ...restock,
  ] as never)

  return { ok: true, status: body.status }
})
