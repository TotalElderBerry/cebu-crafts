import { desc, eq } from 'drizzle-orm'
import { categories, products, useDb } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const { makerId } = await requireMaker(event)
  const db = useDb()

  return db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      priceCentavos: products.priceCentavos,
      stock: products.stock,
      isMadeToOrder: products.isMadeToOrder,
      leadTimeDays: products.leadTimeDays,
      minOrderQty: products.minOrderQty,
      images: products.images,
      status: products.status,
      viewCount: products.viewCount,
      ratingSum: products.ratingSum,
      ratingCount: products.ratingCount,
      updatedAt: products.updatedAt,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.makerId, makerId))
    .orderBy(desc(products.updatedAt))
})
