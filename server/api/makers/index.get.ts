import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { makers, products, useDb } from '~~/server/database'

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().optional(),
  craft: z.string().trim().optional(),
  verifiedOnly: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(20),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const filters: SQL[] = []

  if (query.q) {
    filters.push(
      or(ilike(makers.shopName, `%${query.q}%`), ilike(makers.tagline, `%${query.q}%`))!,
    )
  }
  if (query.city) filters.push(sql`${makers.city}::text = ${query.city}`)
  if (query.craft) filters.push(sql`${query.craft} = any(${makers.craftCategories})`)
  if (query.verifiedOnly === 'true') filters.push(eq(makers.verification, 'verified'))

  return db
    .select({
      id: makers.id,
      shopName: makers.shopName,
      slug: makers.slug,
      tagline: makers.tagline,
      city: makers.city,
      barangay: makers.barangay,
      craftCategories: makers.craftCategories,
      logoUrl: makers.logoUrl,
      coverUrl: makers.coverUrl,
      yearsActive: makers.yearsActive,
      artisanCount: makers.artisanCount,
      verification: makers.verification,
      ratingSum: makers.ratingSum,
      ratingCount: makers.ratingCount,
      productCount: count(products.id),
    })
    .from(makers)
    .leftJoin(products, and(eq(products.makerId, makers.id), eq(products.status, 'published')))
    .where(filters.length ? and(...filters) : undefined)
    .groupBy(makers.id)
    .orderBy(desc(makers.verification), desc(makers.ratingCount))
    .limit(query.limit)
})
