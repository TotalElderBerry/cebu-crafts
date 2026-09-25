import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { makers, useDb, users } from '~~/server/database'
import { slugify } from '~/lib/utils'

const CITIES = [
  'cebu_city', 'mandaue', 'lapu_lapu', 'talisay', 'carcar', 'danao', 'naga', 'toledo',
  'bogo', 'argao', 'dalaguete', 'oslob', 'moalboal', 'barili', 'sibonga', 'cordova',
  'consolacion', 'liloan', 'compostela', 'minglanilla', 'asturias', 'bantayan', 'other',
] as const

const bodySchema = z.object({
  shopName: z.string().trim().min(3, 'Your shop needs a name.').max(80),
  tagline: z.string().trim().max(140).optional(),
  story: z.string().trim().max(4000).optional(),
  city: z.enum(CITIES),
  barangay: z.string().trim().max(100).optional(),
  craftCategories: z.array(z.string().trim().min(1)).min(1, 'Pick at least one craft.').max(6),
  yearsActive: z.number().int().min(0).max(200).optional(),
  artisanCount: z.number().int().min(1).max(10000).default(1),
  acceptsCustomOrders: z.boolean().default(true),
  acceptsWholesale: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  if (user.makerId) {
    throw createError({ statusCode: 409, statusMessage: 'You already have a shop.' })
  }

  // Shop names are not unique (there really are several "Carcar Shoes"), so the
  // slug carries a suffix when it collides rather than rejecting the name.
  const base = slugify(body.shopName) || 'shop'
  let slug = base
  for (let attempt = 0; attempt < 20; attempt++) {
    const [taken] = await db.select({ id: makers.id }).from(makers).where(eq(makers.slug, slug)).limit(1)
    if (!taken) break
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }

  const [maker] = await db
    .insert(makers)
    .values({
      userId: user.id,
      shopName: body.shopName,
      slug,
      tagline: body.tagline,
      story: body.story,
      city: body.city,
      barangay: body.barangay,
      craftCategories: body.craftCategories,
      yearsActive: body.yearsActive,
      artisanCount: body.artisanCount,
      acceptsCustomOrders: body.acceptsCustomOrders,
      acceptsWholesale: body.acceptsWholesale,
      // Shops start unverified and list immediately; an admin verifies later.
      // Gating listing behind manual review is how a marketplace stays empty.
      verification: 'pending',
    })
    .returning()

  await db.update(users).set({ role: 'maker' }).where(eq(users.id, user.id))

  await setUserSession(event, {
    user: { ...user, role: 'maker', makerId: maker!.id },
    loggedInAt: Date.now(),
  })

  setResponseStatus(event, 201)
  return { id: maker!.id, slug: maker!.slug }
})
