import { and, desc, eq, ne, sql } from 'drizzle-orm'
import {
  categories,
  makers,
  productVariants,
  products,
  reviews,
  useDb,
  users,
} from '~~/server/database'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      priceCentavos: products.priceCentavos,
      compareAtCentavos: products.compareAtCentavos,
      stock: products.stock,
      isMadeToOrder: products.isMadeToOrder,
      leadTimeDays: products.leadTimeDays,
      minOrderQty: products.minOrderQty,
      materials: products.materials,
      dimensions: products.dimensions,
      weightGrams: products.weightGrams,
      images: products.images,
      ratingSum: products.ratingSum,
      ratingCount: products.ratingCount,
      createdAt: products.createdAt,
      maker: {
        id: makers.id,
        shopName: makers.shopName,
        slug: makers.slug,
        tagline: makers.tagline,
        city: makers.city,
        barangay: makers.barangay,
        logoUrl: makers.logoUrl,
        verification: makers.verification,
        yearsActive: makers.yearsActive,
        artisanCount: makers.artisanCount,
        acceptsCustomOrders: makers.acceptsCustomOrders,
        acceptsWholesale: makers.acceptsWholesale,
        ratingSum: makers.ratingSum,
        ratingCount: makers.ratingCount,
      },
      category: { slug: categories.slug, name: categories.name },
    })
    .from(products)
    .innerJoin(makers, eq(products.makerId, makers.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.status, 'published')))
    .limit(1)

  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'That listing is no longer available.' })
  }

  const [variants, productReviews, related] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),

    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        images: reviews.images,
        createdAt: reviews.createdAt,
        buyerName: users.name,
        buyerAvatar: users.avatarUrl,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.buyerId, users.id))
      .where(eq(reviews.productId, product.id))
      .orderBy(desc(reviews.createdAt))
      .limit(10),

    // Other work by the same maker — the way people actually browse craft.
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        priceCentavos: products.priceCentavos,
        images: products.images,
      })
      .from(products)
      .where(
        and(
          eq(products.makerId, product.maker.id),
          eq(products.status, 'published'),
          ne(products.id, product.id),
        ),
      )
      .limit(6),
  ])

  // Fire-and-forget: a failed counter must never break the page.
  db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, product.id))
    .catch(() => {})

  return { ...product, variants, reviews: productReviews, related }
})
