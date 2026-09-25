/**
 * Fetches the demo catalogue's photography once, verifies it, and writes it
 * into public/listings as compressed WebP.
 *
 *   pnpm photos:fetch
 *
 * Why this is a build step and not a URL in the seed:
 *
 *  1. The source (loremflickr) serves a flat red "no match" tile whenever a
 *     tag set has no image at the requested index or aspect. Which index works
 *     is not predictable and is not stable between calls, so a URL that
 *     resolves during seeding can be a red tile by the time anyone loads the
 *     page. Every file here is checked before it is written.
 *  2. The Capacitor build bundles its assets and has to work offline. Remote
 *     image URLs break that, which is the reason the generated weave in
 *     server/routes/placeholder existed in the first place. Local files keep
 *     that property while still showing the actual object.
 *  3. It pins the bytes. The catalogue cannot change under us.
 *
 * These are stand-ins for what a maker uploads, under each photo's own Flickr
 * licence. Replace them with real workshop photography before launch; see
 * public/listings/CREDITS.json for the source of each file.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MAKERS } from '../server/database/seed'
import { slugify } from '../app/lib/utils'

const OUT = 'public/listings'
const PHOTOS_PER_LISTING = 3
const MAX_LOCK_ATTEMPTS = 14

/** Subject keywords per craft. Photography has to show the actual object. */
const CRAFT_TAGS: Record<string, string> = {
  'guitars-instruments': 'acoustic,guitar,luthier',
  footwear: 'leather,sandals,handmade',
  'rattan-furniture': 'rattan,wicker,furniture',
  shellcraft: 'seashell,nacre,craft',
  'handwoven-textiles': 'handwoven,loom,textile',
  'pottery-ceramics': 'pottery,ceramic,stoneware',
  'fashion-accessories': 'brass,jewellery,handmade',
  basketry: 'basket,weaving,rattan',
  woodcarving: 'woodcarving,wood,craft',
  'home-decor': 'lamp,handmade,decor',
  'food-delicacies': 'pastry,biscuit,bakery',
}

type Job = { name: string; tags: string; w: number; h: number; pin?: number }

/**
 * The no-match tile is a flat red canvas with a small image pasted in the
 * middle. Detect it by sampling the corners: hashing does not work because the
 * tile is rendered at whatever size was requested.
 */
async function isNoMatchTile(buf: Buffer) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels
    return [data[i]!, data[i + 1]!, data[i + 2]!]
  }
  const corners = [
    at(2, 2),
    at(info.width - 3, 2),
    at(2, info.height - 3),
    at(info.width - 3, info.height - 3),
  ]
  return corners.filter(([r, g, b]) => r! > 140 && g! < 90 && b! < 90).length >= 3
}

/**
 * Some tag sets have no crop at all at a wide aspect: "rattan,wicker,furniture"
 * at 900x400 is a red tile at every index. Widen the query rather than leave a
 * hole, dropping to the single strongest tag and then to a generic craft term.
 */
function tagChain(tags: string) {
  const first = tags.split(',')[0]!
  return [tags, first, 'handmade,craft']
}

/** Stable per-name offset, so two listings in one craft do not collide. */
function startLock(name: string) {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % MAX_LOCK_ATTEMPTS
}

async function fetchVerified(job: Job) {
  // Start the search at a per-name offset and wrap. Without this every listing
  // in a craft took the first working index, so both masareal listings and both
  // Danao brass listings shipped the same photograph as each other.
  const offset = job.pin !== undefined ? job.pin - 1 : startLock(job.name)

  for (const tags of tagChain(job.tags)) {
    for (let step = 0; step < MAX_LOCK_ATTEMPTS; step++) {
      const lock = ((offset + step) % MAX_LOCK_ATTEMPTS) + 1
      const url = `https://loremflickr.com/${job.w}/${job.h}/${tags}?lock=${lock}`
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
        if (!res.ok) continue
        const buf = Buffer.from(await res.arrayBuffer())
        if (await isNoMatchTile(buf)) continue
        return { buf, url }
      } catch {
        // Network hiccup on one index is not fatal; try the next.
      }
    }
  }
  return null
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })

  const jobs: Job[] = [
    // Two crops of the hero: the phone lays it out landscape behind the
    // headline, the desktop split lays it out portrait beside the copy. One
    // portrait file object-cover'd into a landscape box loses the whole bench.
    // The two hero crops are pinned to a specific index, not left to the
    // per-name offset. The hero is the one image a person sees before anything
    // else, so it is chosen by eye rather than by hash; a refetch that silently
    // swapped it for a close-up of someone's hand is how this rule was learned.
    { name: 'hero', tags: 'workshop,tools,craftsman', w: 800, h: 960, pin: 3 },
    { name: 'hero-wide', tags: 'workshop,tools,craftsman', w: 900, h: 500, pin: 3 },
  ]

  for (const maker of MAKERS) {
    const tags = CRAFT_TAGS[maker.crafts[0]!] ?? 'artisan,craft'
    jobs.push({ name: `${maker.slug}-workshop`, tags, w: 900, h: 400 })

    for (const product of maker.products) {
      const tag = CRAFT_TAGS[product.category] ?? 'handmade,craft'
      for (let i = 0; i < PHOTOS_PER_LISTING; i++) {
        jobs.push({ name: `${slugify(product.title)}-${i}`, tags: tag, w: 600, h: 600 })
      }
    }
  }

  console.log(`\n  Fetching ${jobs.length} photos into ${OUT}\n`)

  const credits: Record<string, string> = {}
  let written = 0
  const failed: string[] = []

  for (const job of jobs) {
    const target = path.join(OUT, `${job.name}.webp`)
    try {
      await fs.access(target)
      credits[`${job.name}.webp`] = 'already present'
      continue
    } catch {
      // Not fetched yet.
    }

    const got = await fetchVerified(job)
    if (!got) {
      failed.push(job.name)
      process.stdout.write('x')
      continue
    }

    // WebP at 78 keeps a 600px listing photo near 30KB, which matters both for
    // the mobile bundle size and for Philippine mobile data.
    await sharp(got.buf).webp({ quality: 78 }).toFile(target)
    credits[`${job.name}.webp`] = got.url
    written++
    process.stdout.write('.')
  }

  await fs.writeFile(
    path.join(OUT, 'CREDITS.json'),
    `${JSON.stringify(credits, null, 2)}\n`,
    'utf8',
  )

  console.log(`\n\n  ${written} written, ${failed.length} failed`)
  if (failed.length) {
    console.log(`  Could not resolve: ${failed.join(', ')}`)
    console.log('  Re-run to retry only these; existing files are skipped.')
    process.exitCode = 1
  }
}

main()
