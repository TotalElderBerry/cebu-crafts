import { and, desc, eq } from 'drizzle-orm'
import { makers, products, useDb } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const [maker] = await db.select().from(makers).where(eq(makers.slug, slug)).limit(1)

  if (!maker) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found.' })
  }

  const catalogue = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      priceCentavos: products.priceCentavos,
      compareAtCentavos: products.compareAtCentavos,
      images: products.images,
      stock: products.stock,
      isMadeToOrder: products.isMadeToOrder,
      leadTimeDays: products.leadTimeDays,
      minOrderQty: products.minOrderQty,
      ratingSum: products.ratingSum,
      ratingCount: products.ratingCount,
    })
    .from(products)
    .where(and(eq(products.makerId, maker.id), eq(products.status, 'published')))
    .orderBy(desc(products.createdAt))

  return { ...maker, products: catalogue }
})
