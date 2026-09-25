import { count, desc, eq } from 'drizzle-orm'
import { makers, products, useDb, users } from '~~/server/database'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  return db
    .select({
      id: makers.id,
      shopName: makers.shopName,
      slug: makers.slug,
      tagline: makers.tagline,
      story: makers.story,
      city: makers.city,
      barangay: makers.barangay,
      craftCategories: makers.craftCategories,
      logoUrl: makers.logoUrl,
      yearsActive: makers.yearsActive,
      artisanCount: makers.artisanCount,
      verification: makers.verification,
      createdAt: makers.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerPhone: users.phone,
      productCount: count(products.id),
    })
    .from(makers)
    .innerJoin(users, eq(makers.userId, users.id))
    .leftJoin(products, eq(products.makerId, makers.id))
    .groupBy(makers.id, users.name, users.email, users.phone)
    .orderBy(desc(makers.createdAt))
})
