/**
 * Builds a single contact sheet of every listing's lead photo.
 *
 *   pnpm photos:sheet
 *
 * The photo source matches on keywords and is only approximately reliable: a
 * query for biscuits has returned a cat statue. Checking 21 listings one file
 * at a time is not practical, so this lays them all out in one image with the
 * listing title burned in, which makes a wrong subject obvious at a glance.
 *
 * Run it after `pnpm photos:fetch` and actually look at the output before
 * trusting the catalogue.
 */
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { MAKERS } from '../server/database/seed'
import { slugify } from '../app/lib/utils'

const CELL = 260
const COLS = 5
const LABEL = 34

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function main() {
  const listings = MAKERS.flatMap((m) => m.products.map((p) => p.title))

  const rows = Math.ceil(listings.length / COLS)
  const width = COLS * CELL
  const height = rows * (CELL + LABEL)

  const composites: sharp.OverlayOptions[] = []

  for (const [i, title] of listings.entries()) {
    const x = (i % COLS) * CELL
    const y = Math.floor(i / COLS) * (CELL + LABEL)
    const file = `public/listings/${slugify(title)}-0.webp`

    try {
      const img = await sharp(file).resize(CELL, CELL, { fit: 'cover' }).toBuffer()
      composites.push({ input: img, left: x, top: y })
    } catch {
      composites.push({
        input: {
          create: { width: CELL, height: CELL, channels: 3, background: '#cccccc' },
        },
        left: x,
        top: y,
      })
    }

    const label = Buffer.from(
      `<svg width="${CELL}" height="${LABEL}">
        <rect width="${CELL}" height="${LABEL}" fill="#111"/>
        <text x="6" y="14" font-family="sans-serif" font-size="11" fill="#fff">${esc(
          title.slice(0, 34),
        )}</text>
        <text x="6" y="28" font-family="sans-serif" font-size="11" fill="#fff">${esc(
          title.slice(34, 68),
        )}</text>
      </svg>`,
    )
    composites.push({ input: label, left: x, top: y + CELL })
  }

  await sharp({
    create: { width, height, channels: 3, background: '#222222' },
  })
    .composite(composites)
    .png()
    .toFile('contact-sheet.png')

  await fs.stat('contact-sheet.png')
  console.log(`\n  contact-sheet.png written: ${listings.length} listings, ${width}x${height}\n`)
}

main()
