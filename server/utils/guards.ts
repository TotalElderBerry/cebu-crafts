import type { H3Event } from 'h3'

/** Any signed-in user. */
export async function requireAuth(event: H3Event) {
  const { user } = await requireUserSession(event)
  return user
}

/** A signed-in user who has a shop. Returns the maker id, narrowed to string. */
export async function requireMaker(event: H3Event) {
  const user = await requireAuth(event)

  if (!user.makerId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You need a maker shop to do this. Open one from your account page.',
    })
  }

  return { user, makerId: user.makerId }
}

export async function requireAdmin(event: H3Event) {
  const user = await requireAuth(event)

  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admins only.' })
  }

  return user
}

/**
 * The public origin to build redirect URLs against.
 *
 * Prefers the configured value, because the mobile app calls the API from
 * `capacitor://localhost` — deriving the origin from the request there would
 * hand PayMongo a return URL that only resolves inside the app bundle.
 */
export function getRequestOrigin(event: H3Event) {
  const configured = useRuntimeConfig().public.appOrigin
  if (configured) return configured.replace(/\/+$/, '')
  return getRequestURL(event).origin
}

/** Order numbers buyers can read over the phone: LK-7K3QW2. */
export function generateOrderNumber() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // no 0/O/1/I
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `LK-${out}`
}

/** Flat-rate shipping by destination. A real deployment swaps this for a
 *  courier rate API (J&T / Lalamove); the shape of the call stays the same. */
export function computeShippingCentavos(city: string, province: string) {
  const p = province.trim().toLowerCase()
  const c = city.trim().toLowerCase()

  if (p === 'cebu') {
    const metro = ['cebu city', 'mandaue', 'mandaue city', 'lapu-lapu', 'lapu-lapu city', 'talisay', 'talisay city', 'consolacion', 'cordova']
    return metro.includes(c) ? 8000 : 15000 // PHP 80 metro Cebu, PHP 150 rest of province
  }

  const visayas = ['bohol', 'negros oriental', 'negros occidental', 'leyte', 'samar', 'iloilo', 'aklan', 'antique', 'capiz', 'guimaras', 'southern leyte', 'biliran', 'siquijor']
  if (visayas.includes(p)) return 22000 // PHP 220

  return 28000 // PHP 280 Luzon / Mindanao
}
