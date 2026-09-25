import { eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  orderEvents,
  orderItems,
  orders,
  productVariants,
  products,
  useDb,
} from '~~/server/database'
import { formatPeso } from '~/lib/utils'

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(09\d{9}|\+639\d{9})$/, 'Use a PH mobile number.'),
  line1: z.string().trim().min(4).max(200),
  barangay: z.string().trim().min(1).max(100),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().regex(/^\d{4}$/, 'PH postal codes are 4 digits.'),
  notes: z.string().trim().max(400).optional(),
})

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, 'Your cart is empty.')
    .max(50),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(['cod', 'mock_card', 'paymongo']),
  buyerNote: z.string().trim().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  // Prices come from the database, never from the request. The client only
  // gets to say *what* and *how many*.
  const productIds = [...new Set(body.items.map((i) => i.productId))]
  const rows = await db
    .select({
      id: products.id,
      makerId: products.makerId,
      title: products.title,
      images: products.images,
      priceCentavos: products.priceCentavos,
      stock: products.stock,
      status: products.status,
      isMadeToOrder: products.isMadeToOrder,
      minOrderQty: products.minOrderQty,
    })
    .from(products)
    .where(inArray(products.id, productIds))

  const byId = new Map(rows.map((r) => [r.id, r]))

  const variantIds = body.items.map((i) => i.variantId).filter((v): v is string => !!v)
  const variantRows = variantIds.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
    : []
  const variantById = new Map(variantRows.map((v) => [v.id, v]))

  const orderId = crypto.randomUUID()
  const lines: (typeof orderItems.$inferInsert)[] = []
  const stockUpdates: { productId: string; quantity: number }[] = []
  let subtotal = 0

  for (const item of body.items) {
    const product = byId.get(item.productId)

    if (!product || product.status !== 'published') {
      throw createError({
        statusCode: 409,
        statusMessage: `"${product?.title ?? 'An item'}" is no longer available. Remove it to continue.`,
      })
    }

    if (item.quantity < product.minOrderQty) {
      throw createError({
        statusCode: 400,
        statusMessage: `"${product.title}" has a minimum order of ${product.minOrderQty}.`,
      })
    }

    // Made-to-order items are not stock-limited; the maker commits to a lead
    // time instead. Only finished-goods listings can run out.
    if (!product.isMadeToOrder && product.stock < item.quantity) {
      throw createError({
        statusCode: 409,
        statusMessage: `Only ${product.stock} left of "${product.title}".`,
      })
    }

    const variant = item.variantId ? variantById.get(item.variantId) : undefined
    if (item.variantId && (!variant || variant.productId !== product.id)) {
      throw createError({ statusCode: 400, statusMessage: 'That option is not valid.' })
    }

    const unitPrice = product.priceCentavos + (variant?.priceDeltaCentavos ?? 0)
    const lineTotal = unitPrice * item.quantity
    subtotal += lineTotal

    lines.push({
      id: crypto.randomUUID(),
      orderId,
      productId: product.id,
      variantId: variant?.id ?? null,
      makerId: product.makerId,
      titleSnapshot: product.title,
      imageSnapshot: product.images[0] ?? null,
      variantSnapshot: variant?.name ?? null,
      unitPriceCentavos: unitPrice,
      quantity: item.quantity,
      lineTotalCentavos: lineTotal,
    })

    if (!product.isMadeToOrder) {
      stockUpdates.push({ productId: product.id, quantity: item.quantity })
    }
  }

  const shipping = computeShippingCentavos(
    body.shippingAddress.city,
    body.shippingAddress.province,
  )
  const total = subtotal + shipping

  const paymongo = paymongoConfig()

  if (body.paymentMethod === 'paymongo') {
    if (!paymongo) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Online payment is not configured. Choose cash on delivery.',
      })
    }
    if (total < PAYMONGO_MIN_CENTAVOS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Online payment needs a total of at least ${formatPeso(PAYMONGO_MIN_CENTAVOS)}. Use cash on delivery for smaller orders.`,
      })
    }
  }

  // --- Mock payment -------------------------------------------------------
  // The keyless demo fallback: settles instantly and always succeeds. Real
  // money goes through PayMongo below, which settles from the webhook.
  const paid = body.paymentMethod === 'mock_card'

  const writes = [
    db.insert(orders).values({
      id: orderId,
      orderNumber: generateOrderNumber(),
      buyerId: user.id,
      status: 'pending',
      subtotalCentavos: subtotal,
      shippingCentavos: shipping,
      totalCentavos: total,
      paymentMethod: body.paymentMethod,
      paymentStatus: paid ? 'paid' : 'unpaid',
      paymentRef: paid ? `mock_${crypto.randomUUID().slice(0, 12)}` : null,
      shippingAddress: body.shippingAddress,
      buyerNote: body.buyerNote,
    }),
    db.insert(orderItems).values(lines),
    db.insert(orderEvents).values({
      orderId,
      status: 'pending',
      note:
        body.paymentMethod === 'cod'
          ? 'Order placed. Cash on delivery.'
          : 'Order placed and paid.',
      actorId: user.id,
    }),
    ...stockUpdates.map((u) =>
      db
        .update(products)
        .set({ stock: sql`greatest(0, ${products.stock} - ${u.quantity})` })
        .where(eq(products.id, u.productId)),
    ),
  ] as const

  // Neon runs an HTTP batch inside a single server-side transaction, so the
  // order, its lines and the stock decrements all land together or not at all.
  await db.batch(writes as unknown as Parameters<typeof db.batch>[0])

  const [created] = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  // --- Hand off to PayMongo ----------------------------------------------
  // Deliberately after the order is committed. If the session call fails, the
  // buyer still has a real order they can retry paying for, rather than a
  // silent dead end.
  let checkoutUrl: string | null = null

  if (body.paymentMethod === 'paymongo' && paymongo) {
    const origin = getRequestOrigin(event)

    try {
      const session = await createCheckoutSession({
        secretKey: paymongo.secretKey,
        rails: paymongo.rails,
        lineItems: lines.map((l) => ({
          name: l.titleSnapshot,
          amountCentavos: l.unitPriceCentavos,
          quantity: l.quantity,
        })),
        shippingCentavos: shipping,
        referenceNumber: created!.orderNumber,
        description: `Likha Cebu order ${created!.orderNumber}`,
        successUrl: `${origin}/orders/${orderId}?paid=1`,
        cancelUrl: `${origin}/orders/${orderId}?cancelled=1`,
        billing: {
          name: body.shippingAddress.fullName,
          email: user.email,
          phone: body.shippingAddress.phone,
        },
      })

      await db
        .update(orders)
        .set({ paymentSessionId: session.id, updatedAt: new Date() })
        .where(eq(orders.id, orderId))

      checkoutUrl = session.checkoutUrl
    } catch (error: any) {
      // Leave the order unpaid and tell the client where to retry.
      console.error('[paymongo] could not create checkout session', error?.statusMessage ?? error)
      await db.insert(orderEvents).values({
        orderId,
        status: 'pending',
        note: 'Could not open the payment page. The order is saved, so you can retry payment.',
        actorId: user.id,
      })
    }
  }

  setResponseStatus(event, 201)
  return {
    id: created!.id,
    orderNumber: created!.orderNumber,
    totalCentavos: total,
    checkoutUrl,
  }
})
