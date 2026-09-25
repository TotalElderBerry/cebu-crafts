import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { categories, makers, products, useDb } from '~~/server/database'

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().optional(),
  city: z.string().trim().optional(),
  maker: z.string().trim().optional(),
  /** Pesos in the query string, centavos in the database. */
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  madeToOrder: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const filters: SQL[] = [eq(products.status, 'published')]

  if (query.q) {
    // websearch_to_tsquery handles quoted phrases and OR the way a shopper
    // would type them, and hits the GIN index defined on the products table.
    filters.push(
      sql`to_tsvector('english', ${products.title} || ' ' || ${products.description})
          @@ websearch_to_tsquery('english', ${query.q})`,
    )
  }
  if (query.category) filters.push(eq(categories.slug, query.category))
  if (query.city) filters.push(sql`${makers.city}::text = ${query.city}`)
  if (query.maker) filters.push(eq(makers.slug, query.maker))
  if (query.minPrice !== undefined) filters.push(gte(products.priceCentavos, query.minPrice * 100))
  if (query.maxPrice !== undefined) filters.push(lte(products.priceCentavos, query.maxPrice * 100))
  if (query.madeToOrder) filters.push(eq(products.isMadeToOrder, query.madeToOrder === 'true'))

  const where = and(...filters)

  const orderBy = {
    newest: desc(products.createdAt),
    price_asc: asc(products.priceCentavos),
    price_desc: desc(products.priceCentavos),
    popular: desc(products.viewCount),
    rating: desc(sql`
      case when ${products.ratingCount} = 0 then 0
           else ${products.ratingSum}::float / ${products.ratingCount} end
    `),
  }[query.sort]

  const offset = (query.page - 1) * query.limit

  const [items, [totals]] = await Promise.all([
    db
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
        maker: {
          id: makers.id,
          shopName: makers.shopName,
          slug: makers.slug,
          city: makers.city,
          verification: makers.verification,
        },
        category: {
          slug: categories.slug,
          name: categories.name,
        },
      })
      .from(products)
      .innerJoin(makers, eq(products.makerId, makers.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(orderBy)
      .limit(query.limit)
      .offset(offset),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(makers, eq(products.makerId, makers.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where),
  ])

  const total = totals?.total ?? 0

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    hasMore: offset + items.length < total,
  }
})
