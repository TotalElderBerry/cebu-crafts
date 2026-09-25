/**
 * Offline check of the seed data.
 *
 *   pnpm db:validate
 *
 * Catches the mistakes that would otherwise only surface as a half-applied
 * seed against a live database: a product pointing at a category that does not
 * exist, a duplicate slug hitting a unique index, a made-to-order piece with no
 * lead time, a published item with neither stock nor made-to-order set.
 *
 * Needs no DATABASE_URL — seed.ts connects lazily.
 */
import { CATEGORIES, MAKERS, BUYERS } from '../server/database/seed'
import { cebuCity } from '../server/database/schema'

const problems: string[] = []
const warnings: string[] = []

const fail = (message: string) => problems.push(message)
const warn = (message: string) => warnings.push(message)

/* --- categories ---------------------------------------------------------- */

const categorySlugs = new Set(CATEGORIES.map((c) => c.slug))
if (categorySlugs.size !== CATEGORIES.length) {
  fail('CATEGORIES contains duplicate slugs')
}

/* --- makers -------------------------------------------------------------- */

const cities = new Set<string>(cebuCity.enumValues)
const makerSlugs = new Set<string>()
const emails = new Set<string>()

for (const maker of MAKERS) {
  const where = `maker "${maker.shopName}"`

  if (makerSlugs.has(maker.slug)) fail(`${where}: duplicate slug "${maker.slug}"`)
  makerSlugs.add(maker.slug)

  if (emails.has(maker.email.toLowerCase())) fail(`${where}: duplicate email ${maker.email}`)
  emails.add(maker.email.toLowerCase())

  // makers.city is a Postgres enum — an unknown value fails at insert time.
  if (!cities.has(maker.city)) fail(`${where}: city "${maker.city}" is not in the cebu_city enum`)

  // craftCategories is free text, but pointing it at a non-existent category
  // silently breaks the "craft" filter on /explore.
  for (const craft of maker.crafts) {
    if (!categorySlugs.has(craft)) {
      warn(`${where}: craft "${craft}" has no matching category (explore filter will miss it)`)
    }
  }

  if (!maker.products.length) warn(`${where}: has no products`)
}

for (const buyer of BUYERS) {
  if (emails.has(buyer.email.toLowerCase())) fail(`buyer ${buyer.email}: email collides with a maker`)
  emails.add(buyer.email.toLowerCase())
}

if (emails.has('admin@likhacebu.ph')) {
  fail('admin@likhacebu.ph collides with a seeded maker or buyer')
}

/* --- products ------------------------------------------------------------ */

// Mirrors the slug expression in seed.ts so a collision is caught here rather
// than as a unique-constraint violation mid-insert.
const productSlug = (title: string, makerSlug: string) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${makerSlug.slice(0, 6)}`

const productSlugs = new Set<string>()
let productCount = 0
let madeToOrderCount = 0
let wholesaleLots = 0

for (const maker of MAKERS) {
  for (const product of maker.products) {
    productCount++
    const where = `"${product.title}" (${maker.shopName})`

    const slug = productSlug(product.title, maker.slug)
    if (productSlugs.has(slug)) fail(`${where}: duplicate product slug "${slug}"`)
    productSlugs.add(slug)

    if (!categorySlugs.has(product.category)) {
      fail(`${where}: category "${product.category}" does not exist`)
    }

    if (!Number.isInteger(product.price) || product.price <= 0) {
      fail(`${where}: price must be a positive integer number of pesos`)
    }

    if (product.compareAt !== undefined && product.compareAt <= product.price) {
      fail(`${where}: compareAt (${product.compareAt}) must exceed price (${product.price})`)
    }

    // Every listing is seeded as `published`, so it must be buyable: either
    // made-to-order with a lead time, or in stock.
    if (product.madeToOrder) {
      madeToOrderCount++
      if (!product.leadTimeDays || product.leadTimeDays < 1) {
        fail(`${where}: made-to-order but no lead time`)
      }
    } else if (!product.stock || product.stock < 1) {
      fail(`${where}: published with no stock and not made-to-order — buyers cannot order it`)
    }

    const min = product.minOrderQty ?? 1
    if (min > 1) {
      wholesaleLots++
      // A min-order lot only works if the shop actually takes wholesale.
      if (!maker.wholesale) {
        warn(`${where}: minOrderQty ${min} but the shop does not accept wholesale`)
      }
      if (!product.madeToOrder && (product.stock ?? 0) < min) {
        fail(`${where}: minOrderQty ${min} exceeds stock ${product.stock ?? 0} — unbuyable`)
      }
    }

    if (!product.materials.length) warn(`${where}: no materials listed`)
    if (product.description.length < 40) warn(`${where}: description is very short`)
  }
}

/* --- report -------------------------------------------------------------- */

console.log('\n  Seed data validation\n')
console.log(`    categories .......... ${CATEGORIES.length}`)
console.log(`    maker shops ......... ${MAKERS.length}`)
console.log(`    products ............ ${productCount}`)
console.log(`      made to order ..... ${madeToOrderCount}`)
console.log(`      in stock .......... ${productCount - madeToOrderCount}`)
console.log(`      wholesale lots .... ${wholesaleLots}`)
console.log(`    buyers .............. ${BUYERS.length}`)
console.log(`    user accounts ....... ${MAKERS.length + BUYERS.length + 1} (incl. admin)`)

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`)
  for (const w of warnings) console.log(`    · ${w}`)
}

if (problems.length) {
  console.error(`\n  ${problems.length} problem(s) — the seed would fail or produce bad data:`)
  for (const p of problems) console.error(`    ✗ ${p}`)
  console.error('')
  process.exit(1)
}

console.log('\n  No problems. The seeder is ready to run against a database.\n')
