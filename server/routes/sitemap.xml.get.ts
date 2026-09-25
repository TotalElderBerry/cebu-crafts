import { eq } from 'drizzle-orm'
import { makers, products, useDb } from '~~/server/database'

/**
 * sitemap.xml.
 *
 * There was none. Every listing and every workshop page is a page a buyer could
 * arrive on from search, and none of them were being offered to a crawler.
 *
 * Only public, indexable URLs go in: published listings, verified workshops,
 * and the two browse pages. Everything robots.txt disallows is left out, and
 * the explore facet combinations are deliberately absent because they are
 * near-duplicates of each other.
 */
export default defineEventHandler(async (event) => {
  const origin = useRuntimeConfig().public.appOrigin || getRequestURL(event).origin
  const db = useDb()

  const [listings, shops] = await Promise.all([
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, 'published')),
    db
      // makers has no updated_at column, only created_at.
      .select({ slug: makers.slug, updatedAt: makers.createdAt })
      .from(makers)
      .where(eq(makers.verification, 'verified')),
  ])

  const entry = (path: string, lastmod?: Date | null, priority = '0.7') =>
    [
      '  <url>',
      `    <loc>${origin}${path}</loc>`,
      lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
      `    <priority>${priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  entry('/', null, '1.0'),
  entry('/explore', null, '0.9'),
  ...shops.map((s) => entry(`/shops/${s.slug}`, s.updatedAt, '0.8')),
  ...listings.map((l) => entry(`/products/${l.slug}`, l.updatedAt, '0.7')),
].join('\n')}
</urlset>
`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return body
})
