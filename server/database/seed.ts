/**
 * Seeds a demo catalogue.
 *
 *   pnpm db:push && pnpm db:seed
 *
 * Runs standalone (tsx), outside Nitro, so it builds its own connection and
 * hashes passwords with the same @adonisjs/hash Scrypt driver nuxt-auth-utils
 * uses — otherwise seeded accounts could not sign in.
 *
 * The shops below are modelled on Cebu's real craft clusters (Abuno guitars,
 * Carcar footwear, Mandaue rattan, Olango shellcraft, Argao weaving) but the
 * businesses, people and prices are invented for the demo.
 */
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import * as schema from './schema'
import { slugify } from '../../app/lib/utils'

const hasher = new Hash(new Scrypt({}))
const DEMO_PASSWORD = 'password123'

/**
 * Connecting lazily (rather than at module load) keeps the seed data importable
 * without a database, so `scripts/validate-seed.ts` can check it offline.
 */
function connect() {
  try {
    process.loadEnvFile('.env')
  } catch {
    // .env is optional when DATABASE_URL is already exported
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('\n  DATABASE_URL is not set. Copy .env.example to .env first.\n')
    process.exit(1)
  }

  return drizzle(neon(connectionString), { schema })
}

/**
 * Listing photography.
 *
 * Seeded stock photos, not the real clusters' own shots: the businesses in this
 * catalogue are invented for the demo. They stand in for what a maker uploads
 * on their first listing.
 *
 * The generated weave at /placeholder is still here and still used, but only
 * where it belongs now: as the fallback for a listing with no photo at all. It
 * was previously serving the whole catalogue, which meant a 1,980-peso brass
 * cuff rendered as an outline diamond. A marketplace sells the object, so it
 * has to show the object.
 */
/**
 * Listing photography, served from public/listings.
 *
 * Local files rather than remote URLs, for three reasons: the Capacitor build
 * bundles its assets and has to work offline, the upstream source returns a red
 * "no match" tile unpredictably, and pinning the bytes means the catalogue
 * cannot change under us. Fetched and verified once by
 * `pnpm photos:fetch` (scripts/fetch-listing-photos.mts), which also writes
 * public/listings/CREDITS.json recording where each file came from.
 *
 * These stand in for what a maker uploads on their first listing. Listings with
 * no photo at all still fall back to the generated weave in
 * server/routes/placeholder, which is what that route was always for.
 */
const photo = (name: string) => `/listings/${name}.webp`

/**
 * Only reference photos that actually exist on disk.
 *
 * The photo source matches on keywords and is only approximately reliable: the
 * first pass put the same cat statue on all three instrument listings and a
 * wooden sphere on both pottery listings. Those files were deleted rather than
 * shipped, so the listings they belonged to fall through to the generated weave
 * in server/routes/placeholder, which is at least always right about the craft.
 *
 * Run `pnpm photos:fetch` then `pnpm photos:sheet` and look at the sheet
 * before adding any more. A wrong photo is worse than no photo: a buyer who
 * sees a cat where a guitar should be does not conclude the photo is missing.
 */
const hasFile = (name: string) =>
  fs.existsSync(new URL(`../../public/listings/${name}.webp`, import.meta.url))

/** Square, because every listing grid and the detail hero are 1:1. */
const img = (key: string, n = 1) =>
  Array.from({ length: n }, (_, i) => `${key}-${i}`)
    .filter(hasFile)
    .map(photo)

/**
 * Product slugs are permanent, so they are built from the shared slugify()
 * rather than a local regex. The old inline version cut the maker slug at six
 * raw characters and stripped only a single trailing hyphen, which shipped
 * "...-mandau" (cut mid-word) and "...-danao-" (trailing hyphen).
 */
function productSlug(title: string, makerSlug: string) {
  const suffix = makerSlug.split('-')[0]
  return slugify(`${title} ${suffix}`)
}

/* -------------------------------------------------------------------------- */

export const CATEGORIES = [
  { slug: 'guitars-instruments', name: 'Guitars & Instruments', icon: 'guitar', description: 'Hand-built guitars, ukuleles and bandurrias.' },
  { slug: 'footwear', name: 'Footwear', icon: 'footprints', description: 'Leather sandals and shoes made on wooden lasts.' },
  { slug: 'rattan-furniture', name: 'Rattan & Furniture', icon: 'armchair', description: 'Woven rattan, buri and bamboo pieces.' },
  { slug: 'shellcraft', name: 'Shellcraft', icon: 'shell', description: 'Capiz, mother-of-pearl and sea-shell work.' },
  { slug: 'handwoven-textiles', name: 'Hand-woven Textiles', icon: 'shirt', description: 'Hablon and loom-woven cloth.' },
  { slug: 'pottery-ceramics', name: 'Pottery & Ceramics', icon: 'amphora', description: 'Wheel-thrown and hand-built clay.' },
  { slug: 'fashion-accessories', name: 'Fashion & Accessories', icon: 'gem', description: 'Brass, bead and shell jewellery.' },
  { slug: 'basketry', name: 'Basketry', icon: 'shopping-basket', description: 'Nito, bamboo and abaca weaving.' },
  { slug: 'woodcarving', name: 'Wood Carving', icon: 'axe', description: 'Carved and turned hardwood work.' },
  { slug: 'home-decor', name: 'Home Decor', icon: 'lamp', description: 'Lamps, frames and decorative objects.' },
  { slug: 'food-delicacies', name: 'Food & Delicacies', icon: 'cookie', description: 'Otap, masareal, dried mangoes and more.' },
]

export type SeedProduct = {
  title: string
  category: string
  price: number // pesos
  compareAt?: number
  stock?: number
  madeToOrder?: boolean
  leadTimeDays?: number
  minOrderQty?: number
  materials: string[]
  dimensions?: string
  weightGrams?: number
  description: string
}

export type SeedMaker = {
  shopName: string
  slug: string
  email: string
  ownerName: string
  tagline: string
  story: string
  city: (typeof schema.cebuCity.enumValues)[number]
  barangay: string
  crafts: string[]
  yearsActive: number
  artisanCount: number
  verified: boolean
  wholesale: boolean
  custom: boolean
  products: SeedProduct[]
}

export const MAKERS: SeedMaker[] = [
  {
    shopName: 'Abuno Guitar Works',
    slug: 'abuno-guitar-works',
    email: 'rene@abunoguitars.ph',
    ownerName: 'Rene Patalinghug',
    tagline: 'Third-generation luthiers from Abuno, Lapu-Lapu',
    story:
      'My lolo started bending sides in a nipa shed in Abuno in 1962, back when the whole barangay smelled of varnish. We still shape every neck by hand and season our jackfruit wood for two years before it ever becomes a guitar. What we will not do is what the export buyers kept asking for: thinner tops, faster drying, a hundred units a month. That is not a guitar, that is furniture shaped like one.',
    city: 'lapu_lapu',
    barangay: 'Abuno',
    crafts: ['guitars-instruments', 'woodcarving'],
    yearsActive: 62,
    artisanCount: 7,
    verified: true,
    wholesale: true,
    custom: true,
    products: [
      {
        title: 'Concert Classical Guitar in Jackfruit and Spruce',
        category: 'guitars-instruments',
        price: 24500,
        madeToOrder: true,
        leadTimeDays: 45,
        materials: ['Solid spruce top', 'Jackfruit back and sides', 'Ebony fretboard'],
        dimensions: '100 x 37 x 10 cm',
        weightGrams: 1800,
        description:
          'A full-size classical with a solid spruce top and jackfruit back and sides cut from timber we season for two years. Fan-braced, French-polished, and set up with Savarez strings before it ships. Each one takes about six weeks because the finish alone is fourteen thin coats.',
      },
      {
        title: 'Mahogany Concert Ukulele',
        category: 'guitars-instruments',
        price: 4800,
        stock: 12,
        materials: ['Solid mahogany', 'Rosewood fretboard', 'Bone nut and saddle'],
        dimensions: '61 x 21 x 7 cm',
        weightGrams: 620,
        description:
          'Concert scale, solid mahogany top and body, with a bone nut and saddle rather than the plastic you get at this price elsewhere. Warm and loud for its size. Ships with a padded gig bag.',
      },
      {
        title: 'Traditional 14-String Bandurria',
        category: 'guitars-instruments',
        price: 9200,
        madeToOrder: true,
        leadTimeDays: 30,
        materials: ['Spruce top', 'Kamagong back', 'Brass tuners'],
        description:
          'The rondalla standard, built the way the older Cebu shops built them: shallow body, bright attack, kamagong back for cut. We can engrave a name on the headstock at no extra cost, so say so in the order notes.',
      },
    ],
  },
  {
    shopName: 'Sapatos sa Carcar',
    slug: 'sapatos-sa-carcar',
    email: 'mila@sapatoscarcar.ph',
    ownerName: 'Milagros Alcoseba',
    tagline: 'Hand-lasted leather sandals from the shoe capital of Cebu',
    story:
      'Carcar has made shoes since the Spanish time and there are still forty of us working within a kilometre of the rotunda. I learned lasting from my mother at eleven. The hard part now is not the making. It is that the tiangge buyers want to pay two hundred pesos for something that takes me four hours. So we sell direct, and we tell people exactly how long a pair takes.',
    city: 'carcar',
    barangay: 'Poblacion III',
    crafts: ['footwear'],
    yearsActive: 34,
    artisanCount: 5,
    verified: true,
    wholesale: true,
    custom: true,
    products: [
      {
        title: "Women's Abaca-Strap Leather Sandals",
        category: 'footwear',
        price: 1450,
        stock: 28,
        materials: ['Full-grain cowhide', 'Abaca braid', 'Rubber outsole'],
        description:
          'Hand-lasted on wooden forms, with a braided abaca strap over full-grain leather. The footbed moulds to your foot after about a week. Sizes 35 to 41. Measure your foot in centimetres and tell us, PH shoe sizing is not consistent between shops.',
      },
      {
        title: "Men's Classic Leather Loafers",
        category: 'footwear',
        price: 2850,
        madeToOrder: true,
        leadTimeDays: 14,
        materials: ['Full-grain cowhide', 'Leather sole', 'Brass eyelets'],
        description:
          'Goodyear-welted so they can be resoled instead of thrown away. Two weeks because we cut and last each pair to the measurements you send. Black or tan.',
      },
      {
        title: 'Wholesale Woven Slides (24 pairs)',
        category: 'footwear',
        price: 780,
        minOrderQty: 24,
        madeToOrder: true,
        leadTimeDays: 21,
        materials: ['Cowhide', 'Woven leather upper'],
        description:
          'Per-pair price for resellers, minimum 24 pairs, assorted sizes 36 to 43. Three weeks lead time. Message us first if you need a size breakdown other than our standard curve.',
      },
    ],
  },
  {
    shopName: 'Tambo Rattan Studio',
    slug: 'tambo-rattan-studio',
    email: 'joel@tamborattan.ph',
    ownerName: 'Joel Cabahug',
    tagline: 'Mandaue rattan, woven the slow way',
    story:
      'Mandaue was the rattan capital of Asia in the eighties. Then the export orders moved and most of the big plants closed. A few of us kept the frames and the know-how. We buy rattan poles from Agusan, steam-bend them ourselves, and weave by hand, with no staples and no plastic cane.',
    city: 'mandaue',
    barangay: 'Tipolo',
    crafts: ['rattan-furniture', 'basketry', 'home-decor'],
    yearsActive: 28,
    artisanCount: 11,
    verified: true,
    wholesale: true,
    custom: true,
    products: [
      {
        title: 'Natural Rattan Peacock Chair',
        category: 'rattan-furniture',
        price: 12800,
        madeToOrder: true,
        leadTimeDays: 28,
        materials: ['Rattan pole', 'Rattan core weave'],
        dimensions: '150 x 90 x 70 cm',
        weightGrams: 9500,
        description:
          'The full-size peacock, steam-bent and hand-woven over about three weeks. Natural finish or dark walnut stain. Freight is quoted separately for this one: it does not fit a standard courier box.',
      },
      {
        title: 'Nito Storage Baskets, Set of 3',
        category: 'basketry',
        price: 2200,
        stock: 15,
        materials: ['Nito vine', 'Rattan frame'],
        dimensions: '30, 25 and 20 cm diameter',
        description:
          'Nested set woven from nito vine over a rattan frame. Tight enough to hold rice. The colour deepens over a few years, which is the point.',
      },
      {
        title: 'Rattan Pendant Lamp Shade',
        category: 'home-decor',
        price: 1850,
        stock: 22,
        materials: ['Rattan core', 'Steel ring'],
        dimensions: '45 cm diameter',
        description:
          'Open-weave dome that throws a good shadow pattern on the ceiling. Fits a standard E27 socket; cord set not included.',
      },
    ],
  },
  {
    shopName: 'Olango Shell & Sea',
    slug: 'olango-shell-and-sea',
    email: 'grace@olangoshell.ph',
    ownerName: 'Grace Tumulak',
    tagline: 'Capiz and mother-of-pearl from Olango Island',
    story:
      'We work only with shell from licensed farms and from the fish market, nothing taken live off the reef. That rules out some of the showier species buyers ask for, and we are fine with that. Everything is cut, sanded and set by nine women on the island.',
    city: 'lapu_lapu',
    barangay: 'Sta. Rosa, Olango',
    crafts: ['shellcraft', 'home-decor', 'fashion-accessories'],
    yearsActive: 16,
    artisanCount: 9,
    verified: true,
    wholesale: true,
    custom: false,
    products: [
      {
        title: '24-Panel Capiz Windchime',
        category: 'shellcraft',
        price: 890,
        stock: 40,
        materials: ['Capiz shell', 'Nylon cord', 'Bamboo crown'],
        dimensions: '60 cm drop',
        description:
          'Twenty-four hand-cut capiz panels on a bamboo crown. Soft, low chime rather than a bright one. Each panel is sanded by hand so the edges do not chip.',
      },
      {
        title: 'Mother-of-Pearl Serving Tray',
        category: 'home-decor',
        price: 3400,
        stock: 8,
        materials: ['Mother-of-pearl inlay', 'Acacia wood', 'Marine resin'],
        dimensions: '40 x 28 cm',
        description:
          'Mother-of-pearl chips set in resin over an acacia base. Every tray reads differently because the shell is graded by hand, not machine-matched.',
      },
      {
        title: 'Shell Inlay Drop Earrings',
        category: 'fashion-accessories',
        price: 620,
        stock: 55,
        materials: ['Mother-of-pearl', 'Surgical steel hooks'],
        description:
          'Light enough to forget you are wearing them. Surgical steel hooks, so they are safe if you react to cheap alloys.',
      },
    ],
  },
  {
    shopName: 'Argao Hablon Weavers',
    slug: 'argao-hablon-weavers',
    email: 'teresita@argaohablon.ph',
    ownerName: 'Teresita Longakit',
    tagline: 'Loom-woven cloth from southern Cebu',
    story:
      'There were once more than a hundred looms in Argao. When I started there were nine. We are back up to twenty-two because young women came back during the pandemic and stayed. A metre of hablon is a full day at the loom, and we would rather say that plainly than pretend it is quick.',
    city: 'argao',
    barangay: 'Lamacan',
    crafts: ['handwoven-textiles'],
    yearsActive: 41,
    artisanCount: 22,
    verified: true,
    wholesale: true,
    custom: true,
    products: [
      {
        title: 'Indigo Hablon Table Runner',
        category: 'handwoven-textiles',
        price: 1650,
        madeToOrder: true,
        leadTimeDays: 10,
        materials: ['Cotton warp', 'Abaca weft', 'Natural indigo'],
        dimensions: '180 x 35 cm',
        description:
          'Cotton and abaca on a wooden loom, dyed with natural indigo so the colour softens rather than fades flat. Slight irregularity in the weft is how you tell it was not machine-made.',
      },
      {
        title: 'Hablon Fabric by the Metre',
        category: 'handwoven-textiles',
        price: 950,
        madeToOrder: true,
        leadTimeDays: 14,
        minOrderQty: 2,
        materials: ['Cotton', 'Abaca'],
        dimensions: '90 cm width',
        description:
          'Sold by the metre, 90 cm wide, minimum two metres. Tell us the colourway in the order notes. We keep natural, indigo, and a madder red. Custom colours need a message first.',
      },
      {
        title: 'Woven Shawl with Hand-Knotted Fringe',
        category: 'handwoven-textiles',
        price: 2400,
        stock: 6,
        materials: ['Cotton', 'Silk blend'],
        dimensions: '200 x 70 cm',
        description:
          'Cotton-silk blend, light enough for a Cebu evening but warm on a plane. The fringe is knotted by hand, which is two hours on its own.',
      },
    ],
  },
  {
    shopName: 'Tisa Clayworks',
    slug: 'tisa-clayworks',
    email: 'paolo@tisaclay.ph',
    ownerName: 'Paolo Rama',
    tagline: 'Wheel-thrown stoneware, fired in Cebu City',
    story:
      'I came back from working in a hotel kitchen and could not find local plates I actually wanted to serve on. So I learned to throw. We dig part of our clay from Talisay and fire to stoneware in a gas kiln in Tisa. Small studio, two of us, no moulds.',
    city: 'cebu_city',
    barangay: 'Tisa',
    crafts: ['pottery-ceramics', 'home-decor'],
    yearsActive: 6,
    artisanCount: 2,
    verified: false,
    wholesale: false,
    custom: true,
    products: [
      {
        title: 'Ash-Glaze Stoneware Dinner Plate',
        category: 'pottery-ceramics',
        price: 780,
        stock: 34,
        materials: ['Stoneware clay', 'Wood-ash glaze'],
        dimensions: '26 cm diameter',
        description:
          'Wheel-thrown, fired to 1250C, food-safe ash glaze. Dishwasher fine. Colour varies plate to plate depending on where it sat in the kiln, so buy the number you need in one go if you want them to match.',
      },
      {
        title: 'Hand-Built Ramen Bowl',
        category: 'pottery-ceramics',
        price: 1100,
        stock: 12,
        materials: ['Stoneware clay', 'Tenmoku glaze'],
        dimensions: '18 cm diameter, 9 cm deep',
        description:
          'Deep enough for a proper portion with a foot that stays cool in the hand. Tenmoku glaze breaks rust-brown over the rim.',
      },
    ],
  },
  {
    shopName: 'Danao Brass & Bead',
    slug: 'danao-brass-and-bead',
    email: 'lito@danaobrass.ph',
    ownerName: 'Lito Durano',
    tagline: 'Cast brass and beadwork from Danao City',
    story:
      'Danao has a long metalworking history, most of it in a trade we no longer practise. My father moved the family foundry to hardware and I moved it to jewellery. Everything is sand-cast and finished by hand in a shop behind the house.',
    city: 'danao',
    barangay: 'Poblacion',
    crafts: ['fashion-accessories'],
    yearsActive: 19,
    artisanCount: 4,
    verified: true,
    wholesale: true,
    custom: true,
    products: [
      {
        title: 'Wave-Pattern Cast Brass Cuff',
        category: 'fashion-accessories',
        price: 1350,
        stock: 18,
        materials: ['Recycled brass'],
        description:
          'Sand-cast from recycled brass, filed and polished by hand. Adjustable: bend gently to fit. Brass darkens with wear; a lemon and salt scrub brings it back if you want it bright.',
      },
      {
        title: 'Beaded Statement Necklace',
        category: 'fashion-accessories',
        price: 1980,
        madeToOrder: true,
        leadTimeDays: 7,
        materials: ['Glass beads', 'Brass findings', 'Waxed cord'],
        description:
          'Strung by hand on waxed cord with cast brass findings. A week because we string to order, so tell us if you want it shorter than the standard 48 cm.',
      },
    ],
  },
  {
    shopName: 'Mandaue Masareal Co.',
    slug: 'mandaue-masareal-co',
    email: 'nena@masareal.ph',
    ownerName: 'Nena Ouano',
    tagline: 'Peanut masareal and Cebu delicacies, made fresh',
    story:
      'Masareal is Mandaue in one bite: ground peanut and sugar, nothing else. My grandmother sold it wrapped in paper outside the church. We still hand-wrap, we still do not use preservatives, and that is why we ship in small batches.',
    city: 'mandaue',
    barangay: 'Centro',
    crafts: ['food-delicacies'],
    yearsActive: 47,
    artisanCount: 6,
    verified: true,
    wholesale: true,
    custom: false,
    products: [
      {
        title: 'Peanut Masareal, Box of 20',
        category: 'food-delicacies',
        price: 380,
        stock: 60,
        materials: ['Peanuts', 'Muscovado sugar'],
        weightGrams: 500,
        description:
          'Two ingredients, hand-wrapped, no preservatives. Best within three weeks of shipping. We make to the day\'s orders, so boxes leave the kitchen within 48 hours.',
      },
      {
        title: 'Classic Otap Puff Pastry, Pack of 24',
        category: 'food-delicacies',
        price: 320,
        stock: 45,
        materials: ['Flour', 'Coconut', 'Sugar'],
        weightGrams: 400,
        description:
          'Oval, flaky, sugared on top, the Cebu pasalubong standard. Packed in a rigid box because otap does not survive a soft mailer.',
      },
    ],
  },
]

export const BUYERS = [
  { name: 'Andrea Villanueva', email: 'andrea@example.com', phone: '09171234567' },
  { name: 'Marco Yulo', email: 'marco@example.com', phone: '09281234567' },
]

/* -------------------------------------------------------------------------- */

async function main() {
  console.log('\n  Seeding Likha Cebu...\n')

  const db = connect()

  // Order matters: children before parents.
  console.log('  · clearing existing rows')
  await db.execute(sql`
    truncate table
      ${schema.favorites}, ${schema.reviews}, ${schema.inquiryMessages}, ${schema.inquiries},
      ${schema.orderEvents}, ${schema.orderItems}, ${schema.orders},
      ${schema.productVariants}, ${schema.products}, ${schema.makers},
      ${schema.categories}, ${schema.users}
    restart identity cascade
  `)

  console.log('  · categories')
  const categoryRows = await db
    .insert(schema.categories)
    .values(CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })))
    .returning()
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]))

  const passwordHash = await hasher.make(DEMO_PASSWORD)

  console.log('  · admin + buyers')
  await db.insert(schema.users).values({
    name: 'Platform Admin',
    email: 'admin@likhacebu.ph',
    passwordHash,
    role: 'admin',
  })

  const buyerRows = await db
    .insert(schema.users)
    .values(BUYERS.map((b) => ({ ...b, passwordHash, role: 'buyer' as const })))
    .returning()

  console.log(`  · ${MAKERS.length} maker shops`)
  let productTotal = 0

  for (const m of MAKERS) {
    const [owner] = await db
      .insert(schema.users)
      .values({
        name: m.ownerName,
        email: m.email,
        passwordHash,
        role: 'maker',
        phone: '09' + Math.floor(100000000 + Math.random() * 899999999),
      })
      .returning()

    const [maker] = await db
      .insert(schema.makers)
      .values({
        userId: owner!.id,
        shopName: m.shopName,
        slug: m.slug,
        tagline: m.tagline,
        story: m.story,
        city: m.city,
        barangay: m.barangay,
        craftCategories: m.crafts,
        // The shop's first craft drives the placeholder colour and glyph, so a
        // guitar workshop does not get a pottery motif.
        // No logo: these workshops are invented, so ShopMark draws a monogram
        // from the shop name instead. A photo here duplicated the cover image.
        logoUrl: null,
        coverUrl: hasFile(`${m.slug}-workshop`) ? photo(`${m.slug}-workshop`) : null,
        yearsActive: m.yearsActive,
        artisanCount: m.artisanCount,
        acceptsCustomOrders: m.custom,
        acceptsWholesale: m.wholesale,
        verification: m.verified ? 'verified' : 'pending',
        verifiedAt: m.verified ? new Date() : null,
      })
      .returning()

    await db.insert(schema.products).values(
      m.products.map((p) => ({
        makerId: maker!.id,
        categoryId: categoryBySlug.get(p.category) ?? null,
        title: p.title,
        slug: productSlug(p.title, m.slug),
        description: p.description,
        priceCentavos: p.price * 100,
        compareAtCentavos: p.compareAt ? p.compareAt * 100 : null,
        stock: p.stock ?? 0,
        isMadeToOrder: p.madeToOrder ?? false,
        leadTimeDays: p.leadTimeDays ?? null,
        minOrderQty: p.minOrderQty ?? 1,
        materials: p.materials,
        dimensions: p.dimensions,
        weightGrams: p.weightGrams ?? null,
        images: img(slugify(p.title), 3),
        status: 'published' as const,
        viewCount: Math.floor(Math.random() * 400),
      })),
    )

    productTotal += m.products.length
  }

  // A couple of live inquiry threads so the feature is not empty on first run.
  console.log('  · sample inquiry threads')
  const [rattan] = await db
    .select({ id: schema.makers.id })
    .from(schema.makers)
    .where(sql`${schema.makers.slug} = 'tambo-rattan-studio'`)
    .limit(1)

  if (rattan && buyerRows[0]) {
    const inquiryId = crypto.randomUUID()
    await db.insert(schema.inquiries).values({
      id: inquiryId,
      buyerId: buyerRows[0].id,
      makerId: rattan.id,
      type: 'bulk',
      subject: '40 peacock chairs for a resort in Moalboal',
      quantity: 40,
      targetBudgetCentavos: 40 * 11000 * 100,
      status: 'quoted',
      quotedPriceCentavos: 40 * 11800 * 100,
      quotedLeadTimeDays: 75,
    })
    await db.insert(schema.inquiryMessages).values([
      {
        inquiryId,
        senderId: buyerRows[0].id,
        body: 'We are fitting out 40 rooms and want the full-size peacock in natural. Can you do 40 by March, and what is the price at that volume? Delivery to Moalboal.',
      },
      {
        inquiryId,
        senderId: buyerRows[0].id,
        body: 'Also, can you hold the weave a little tighter on the backrest? The last set we bought elsewhere loosened within a year.',
      },
    ])
  }

  console.log(`\n  Done. ${MAKERS.length} shops, ${productTotal} listings, ${CATEGORIES.length} categories.`)
  console.log(`\n  Sign in with any of these. Password: ${DEMO_PASSWORD}`)
  console.log('    admin@likhacebu.ph      (admin)')
  console.log('    rene@abunoguitars.ph    (maker, Abuno Guitar Works)')
  console.log('    joel@tamborattan.ph     (maker, Tambo Rattan Studio)')
  console.log('    andrea@example.com      (buyer)\n')
}

// Only seed when this file is executed directly (`pnpm db:seed`). Importing it
// — as the offline validator does — must not touch the database.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('\n  Seed failed:', error)
    process.exit(1)
  })
}
