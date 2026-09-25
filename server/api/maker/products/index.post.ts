import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { products, useDb } from '~~/server/database'
import { slugify } from '~/lib/utils'

const bodySchema = z
  .object({
    title: z.string().trim().min(3, 'Give the piece a name.').max(140),
    description: z.string().trim().max(6000).default(''),
    categoryId: z.string().uuid().nullable().optional(),
    /** Pesos in, centavos stored. */
    price: z.number().int().min(1, 'Set a price.').max(10_000_000),
    compareAtPrice: z.number().int().min(0).max(10_000_000).nullable().optional(),
    stock: z.number().int().min(0).max(100000).default(0),
    isMadeToOrder: z.boolean().default(false),
    leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
    minOrderQty: z.number().int().min(1).max(10000).default(1),
    materials: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
    dimensions: z.string().trim().max(140).optional(),
    weightGrams: z.number().int().min(0).max(500000).nullable().optional(),
    images: z.array(z.string().url()).max(8).default([]),
    status: z.enum(['draft', 'published']).default('draft'),
  })
  .refine((v) => !v.isMadeToOrder || (v.leadTimeDays ?? 0) > 0, {
    message: 'Made-to-order pieces need a lead time so buyers know when to expect them.',
    path: ['leadTimeDays'],
  })
  .refine((v) => v.isMadeToOrder || v.status !== 'published' || v.stock > 0, {
    message: 'A published in-stock item needs stock. Mark it made-to-order instead.',
    path: ['stock'],
  })

export default defineEventHandler(async (event) => {
  const { makerId } = await requireMaker(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const base = slugify(body.title) || 'piece'
  let slug = base
  for (let attempt = 0; attempt < 20; attempt++) {
    const [taken] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)
    if (!taken) break
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }

  const [product] = await db
    .insert(products)
    .values({
      makerId,
      categoryId: body.categoryId ?? null,
      title: body.title,
      slug,
      description: body.description,
      priceCentavos: body.price * 100,
      compareAtCentavos: body.compareAtPrice ? body.compareAtPrice * 100 : null,
      stock: body.stock,
      isMadeToOrder: body.isMadeToOrder,
      leadTimeDays: body.leadTimeDays ?? null,
      minOrderQty: body.minOrderQty,
      materials: body.materials,
      dimensions: body.dimensions,
      weightGrams: body.weightGrams ?? null,
      images: body.images,
      status: body.status,
    })
    .returning()

  setResponseStatus(event, 201)
  return product
})
