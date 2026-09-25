import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Minimal PayMongo client — Checkout Sessions only.
 *
 * We deliberately use the hosted Checkout Session rather than Payment Intents:
 * card details are entered on PayMongo's page, never ours, which keeps this
 * application entirely outside PCI scope. GCash, Maya, GrabPay and cards all
 * come through the same flow.
 *
 * Docs: https://developers.paymongo.com/reference/checkout-session-resource
 */

const API = 'https://api.paymongo.com/v1'

/** PayMongo rejects anything under PHP 100. Catch it before the round trip. */
export const PAYMONGO_MIN_CENTAVOS = 10_000

export type PaymentRail = 'card' | 'gcash' | 'grab_pay' | 'paymaya'

export type CheckoutSession = {
  id: string
  checkoutUrl: string
  status: string
  paymentIntentId: string | null
  /** Populated once the buyer has paid. */
  payments: { id: string; status: string; rail: string | null; amount: number }[]
}

type PaymongoConfig = {
  secretKey: string
  webhookSecret: string
  rails: PaymentRail[]
}

/** Null when no secret key is configured — the app then falls back to the mock
 *  card flow, so a fresh clone still demos without PayMongo credentials. */
export function paymongoConfig(): PaymongoConfig | null {
  const config = useRuntimeConfig()
  const secretKey = config.paymongoSecretKey

  if (!secretKey) return null

  const rails = (config.paymongoRails || 'gcash,paymaya,grab_pay,card')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean) as PaymentRail[]

  return { secretKey, webhookSecret: config.paymongoWebhookSecret, rails }
}

function authHeader(secretKey: string) {
  // PayMongo uses HTTP Basic with the secret key as the username and an empty
  // password — hence the trailing colon.
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

async function call<T>(
  secretKey: string,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: authHeader(secretKey),
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })

  const text = await response.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }

  if (!response.ok) {
    // PayMongo returns { errors: [{ detail, code, source }] }. Surface the
    // detail — messages like "amount must be >= 10000" are worth showing.
    const detail = json?.errors?.[0]?.detail || `PayMongo returned ${response.status}`
    throw createError({ statusCode: 502, statusMessage: `Payment provider: ${detail}` })
  }

  return json as T
}

function toSession(data: any): CheckoutSession {
  const attributes = data?.attributes ?? {}

  return {
    id: data?.id,
    checkoutUrl: attributes.checkout_url,
    status: attributes.status,
    paymentIntentId:
      typeof attributes.payment_intent === 'string'
        ? attributes.payment_intent
        : (attributes.payment_intent?.id ?? null),
    payments: (attributes.payments ?? []).map((p: any) => ({
      id: p?.id,
      status: p?.attributes?.status,
      rail: p?.attributes?.source?.type ?? null,
      amount: p?.attributes?.amount ?? 0,
    })),
  }
}

export async function createCheckoutSession(input: {
  secretKey: string
  rails: PaymentRail[]
  /** Unit price in centavos × quantity, one entry per order line. */
  lineItems: { name: string; amountCentavos: number; quantity: number }[]
  shippingCentavos: number
  referenceNumber: string
  description: string
  successUrl: string
  cancelUrl: string
  billing: { name: string; email: string; phone?: string }
}): Promise<CheckoutSession> {
  const lineItems = input.lineItems.map((item) => ({
    currency: 'PHP',
    name: item.name.slice(0, 120),
    amount: item.amountCentavos,
    quantity: item.quantity,
  }))

  // Shipping has to be its own line or the session total will not match the
  // order total, and PayMongo would collect the wrong amount.
  if (input.shippingCentavos > 0) {
    lineItems.push({ currency: 'PHP', name: 'Shipping', amount: input.shippingCentavos, quantity: 1 })
  }

  const response = await call<{ data: any }>(input.secretKey, '/checkout_sessions', {
    method: 'POST',
    body: {
      data: {
        attributes: {
          line_items: lineItems,
          payment_method_types: input.rails,
          reference_number: input.referenceNumber,
          description: input.description.slice(0, 200),
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          billing: {
            name: input.billing.name,
            email: input.billing.email,
            ...(input.billing.phone ? { phone: input.billing.phone } : {}),
          },
        },
      },
    },
  })

  return toSession(response.data)
}

export async function retrieveCheckoutSession(secretKey: string, sessionId: string) {
  const response = await call<{ data: any }>(secretKey, `/checkout_sessions/${sessionId}`)
  return toSession(response.data)
}

/**
 * Verify the `Paymongo-Signature` header.
 *
 * Format: `t=<unix>,te=<test sig>,li=<live sig>`. The signed payload is
 * `${t}.${rawBody}` — the RAW body, so this must run before any JSON parsing
 * re-serialises it and changes a single byte.
 *
 * Returns false rather than throwing: the caller decides the status code.
 */
export function verifyWebhookSignature(input: {
  rawBody: string
  signatureHeader: string | undefined
  webhookSecret: string
  /** Reject events older than this to blunt replay attempts. */
  toleranceSeconds?: number
}): boolean {
  const { rawBody, signatureHeader, webhookSecret } = input
  const tolerance = input.toleranceSeconds ?? 300

  if (!signatureHeader || !webhookSecret) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((segment) => {
      const index = segment.indexOf('=')
      return [segment.slice(0, index).trim(), segment.slice(index + 1).trim()]
    }),
  ) as Record<string, string>

  const timestamp = parts.t
  // Test keys sign into `te`, live keys into `li`. Accept whichever is present
  // so the same handler works in both modes.
  const provided = parts.te || parts.li

  if (!timestamp || !provided) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > tolerance) return false

  const expected = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')

  // timingSafeEqual throws on length mismatch, so check that first — and the
  // length itself is not secret.
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}
