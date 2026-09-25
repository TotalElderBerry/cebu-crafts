/**
 * Rewrites Lorem Picsum stock-photo URLs to locally generated craft
 * placeholders, in place.
 *
 *   pnpm exec tsx scripts/migrate-placeholder-images.mts
 *
 * A full reseed would do the same thing but would also wipe orders and inquiry
 * threads, so this touches only the image columns. Safe to run twice: rows that
 * already point at /placeholder are left alone.
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env')
const sql = neon(process.env.DATABASE_URL!)

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const products = await sql`
  select p.id, p.title, p.images, coalesce(c.slug, 'home-decor') as category
  from products p left join categories c on c.id = p.category_id
` as { id: string; title: string; images: string[]; category: string }[]

let productsUpdated = 0

for (const p of products) {
  if (p.images.length && p.images.every((i) => i.startsWith('/placeholder/'))) continue

  const seed = slugify(p.title).slice(0, 30)
  const images = [0, 1, 2].map((i) => `/placeholder/${p.category}/${seed}-${i}`)

  await sql`update products set images = ${images}, updated_at = now() where id = ${p.id}`
  productsUpdated++
}

const makers = await sql`
  select id, slug, craft_categories, logo_url, cover_url from makers
` as { id: string; slug: string; craft_categories: string[]; logo_url: string | null; cover_url: string | null }[]

let makersUpdated = 0

for (const m of makers) {
  if (m.logo_url?.startsWith('/placeholder/') && m.cover_url?.includes('?w=')) continue

  const craft = m.craft_categories[0] ?? 'home-decor'
  await sql`
    update makers
    set logo_url = ${`/placeholder/${craft}/${m.slug}-logo-0`},
        cover_url = ${`/placeholder/${craft}/${m.slug}-cover?w=1200&h=420`}
    where id = ${m.id}
  `
  makersUpdated++
}

// Order lines snapshot the image at purchase time; refresh those too so old
// receipts do not keep pointing at dead stock photos.
const items = await sql`
  select oi.id, p.images[1] as image
  from order_items oi join products p on p.id = oi.product_id
  where oi.image_snapshot is null or oi.image_snapshot not like '/placeholder/%'
` as { id: string; image: string | null }[]

for (const item of items) {
  if (!item.image) continue
  await sql`update order_items set image_snapshot = ${item.image} where id = ${item.id}`
}

console.log(`\n  products updated .......... ${productsUpdated}`)
console.log(`  maker logos/covers ........ ${makersUpdated}`)
console.log(`  order line snapshots ...... ${items.length}\n`)
