/**
 * robots.txt.
 *
 * There was none, which meant /admin, /maker/* and the dev palette bench were
 * all crawlable, and the explore facets were free to generate an unbounded
 * number of near-duplicate URLs for a crawler to chew through.
 *
 * Disallowing a path here is not access control. The real guards are in
 * server/utils/guards.ts; this only keeps the pages out of an index.
 */
export default defineEventHandler((event) => {
  const origin = useRuntimeConfig().public.appOrigin || getRequestURL(event).origin

  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /maker/
Disallow: /account
Disallow: /cart
Disallow: /checkout
Disallow: /orders
Disallow: /inquiries
Disallow: /dev/
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return body
})
