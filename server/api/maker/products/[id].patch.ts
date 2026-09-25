import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { products, useDb } from '~~/server/database'

const bodySchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(6000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  price: z.number().int().min(1).max(10_000_000).optional(),
  compareAtPrice: z.number().int().min(0).max(10_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  isMadeToOrder: z.boolean().optional(),
  leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
  minOrderQty: z.number().int().min(1).max(10000).optional(),
  materials: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  dimensions: z.string().trim().max(140).nullable().optional(),
  weightGrams: z.number().int().min(0).max(500000).nullable().optional(),
  images: z.array(z.string().url()).max(8).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export default defineEventHandler(async (event) => {
  const { makerId } = await requireMaker(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() }

  if (body.title !== undefined) patch.title = body.title
  if (body.description !== undefined) patch.description = body.description
  if (body.categoryId !== undefined) patch.categoryId = body.categoryId
  if (body.price !== undefined) patch.priceCentavos = body.price * 100
  if (body.compareAtPrice !== undefined) {
    patch.compareAtCentavos = body.compareAtPrice ? body.compareAtPrice * 100 : null
  }
  if (body.stock !== undefined) patch.stock = body.stock
  if (body.isMadeToOrder !== undefined) patch.isMadeToOrder = body.isMadeToOrder
  if (body.leadTimeDays !== undefined) patch.leadTimeDays = body.leadTimeDays
  if (body.minOrderQty !== undefined) patch.minOrderQty = body.minOrderQty
  if (body.materials !== undefined) patch.materials = body.materials
  if (body.dimensions !== undefined) patch.dimensions = body.dimensions ?? undefined
  if (body.weightGrams !== undefined) patch.weightGrams = body.weightGrams
  if (body.images !== undefined) patch.images = body.images
  if (body.status !== undefined) patch.status = body.status

  // The maker id in the WHERE clause is the authorisation check: you cannot
  // patch a row you do not own, and there is no separate lookup to forget.
  const [updated] = await db
    .update(products)
    .set(patch)
    .where(and(eq(products.id, id), eq(products.makerId, makerId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Listing not found in your shop.' })
  }

  return updated
})
