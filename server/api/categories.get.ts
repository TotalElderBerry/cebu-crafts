import { and, count, eq } from 'drizzle-orm'
import { categories, products, useDb } from '~~/server/database'

export default defineEventHandler(async () => {
  const db = useDb()

  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      icon: categories.icon,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), eq(products.status, 'published')),
    )
    .groupBy(categories.id)
    .orderBy(categories.sortOrder)

  return rows
})
