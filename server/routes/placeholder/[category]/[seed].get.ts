/**
 * Deterministic SVG placeholders for listings without a photo.
 *
 *   /placeholder/guitars-instruments/abuno-classical
 *
 * Generated rather than stored: no files to ship, no network fetch, instant,
 * and it works offline inside the Capacitor bundle. Random stock photography
 * (a meadow standing in for a guitar) reads as broken; a woven motif in the
 * craft's own colour reads as intentional.
 *
 * The weave pattern is a nod to hablon, which is also where the indigo in the
 * palette comes from.
 */

type CraftStyle = { hue: number; glyph: string }

/** Hue per craft, plus a simple line glyph drawn on a 0 0 100 100 canvas. */
const CRAFTS: Record<string, CraftStyle> = {
  'guitars-instruments': {
    hue: 32,
    glyph: 'M50 22v30M42 26h16M50 52c-11 0-19 9-19 19s8 15 19 15 19-6 19-15-8-19-19-19Zm0 20a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z',
  },
  footwear: {
    hue: 20,
    glyph: 'M22 62c0-8 5-12 12-12h10l8 8h14c7 0 12 4 12 10s-5 10-12 10H34c-7 0-12-4-12-16Zm12-12V38',
  },
  'rattan-furniture': {
    hue: 45,
    glyph: 'M30 30v46M70 30v46M30 52h40M26 76h48M34 30c0-6 7-10 16-10s16 4 16 10',
  },
  shellcraft: {
    hue: 200,
    glyph: 'M50 78C34 78 22 64 22 48c0-8 6-14 14-14 5 0 9 3 14 3s9-3 14-3c8 0 14 6 14 14 0 16-12 30-28 30ZM50 37v41M36 40l6 34M64 40l-6 34',
  },
  'handwoven-textiles': {
    hue: 262,
    glyph: 'M28 28h44v44H28zM28 42h44M28 56h44M42 28v44M56 28v44',
  },
  'pottery-ceramics': {
    hue: 28,
    glyph: 'M38 26h24l-4 10c8 4 13 12 13 22 0 12-10 20-21 20s-21-8-21-20c0-10 5-18 13-22Z',
  },
  'fashion-accessories': {
    hue: 292,
    glyph: 'M50 24l18 16-18 36-18-36Zm-18 16h36M42 40l8 36M58 40l-8 36',
  },
  basketry: {
    hue: 64,
    glyph: 'M26 40h48l-6 34H32ZM30 52h40M32 63h36M38 40c0-9 5-14 12-14s12 5 12 14',
  },
  'home-decor': {
    hue: 50,
    glyph: 'M34 30h32l8 24H26ZM50 54v20M40 78h20M50 20v10',
  },
  'food-delicacies': {
    hue: 38,
    glyph: 'M26 44h48v6c0 14-11 24-24 24S26 64 26 50Zm6-8c0-6 4-8 4-12M50 36c0-6 4-8 4-12M68 36c0-6-4-8-4-12',
  },
  woodcarving: {
    hue: 40,
    glyph: 'M32 74 68 38M60 30l12 12-8 8-12-12ZM32 74l-6 2 2-6 8-8 4 4Z',
  },
}

const FALLBACK: CraftStyle = { hue: 35, glyph: 'M30 34h40v40H30zM30 50h40M50 34v40' }

/** Small stable hash so the same seed always yields the same variation. */
function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export default defineEventHandler((event) => {
  const category = getRouterParam(event, 'category') ?? ''
  const seed = getRouterParam(event, 'seed') ?? 'x'

  // Aspect matters: a square SVG dropped into a short, wide banner with
  // object-cover gets sliced through the middle of the glyph and looks broken.
  // Callers ask for the shape they will actually render.
  const query = getQuery(event)
  const w = Math.min(2000, Math.max(100, Number(query.w) || 600))
  const h = Math.min(2000, Math.max(100, Number(query.h) || 600))

  // The media query below is not enough on its own. This app's dark mode is a
  // .dark class driven by an in-app toggle that defaults to light and is
  // deliberately independent of the OS, so a user on "Dark" with a light OS
  // would get a glaring near-white tile on a charcoal page. `scheme` lets the
  // caller state the theme it is actually rendering in; with no scheme, the
  // media query still handles the OS-following case.
  const scheme = query.scheme === 'dark' ? 'dark' : query.scheme === 'light' ? 'light' : null

  const style = CRAFTS[category] ?? FALLBACK
  const n = hash(`${category}:${seed}`)

  // Small deterministic variation so a grid of placeholders is not identical,
  // while staying inside the craft's colour family.
  const hue = style.hue + ((n % 11) - 5)
  const light = 91 - (n % 4)
  const mid = 83 - (n % 5)
  const ink = 32 + (n % 4)
  const rotate = (n % 4) * 45

  const bg = `hsl(${hue} 6% ${light}%)`
  const weave = `hsl(${hue} 7% ${mid}%)`
  const glyphColor = `hsl(${hue} 14% ${ink}%)`

  // An SVG referenced by <img> still honours its own media queries, so the
  // placeholder can follow the theme instead of glaring white on a dark screen.
  const bgDark = `hsl(${hue} 5% 26%)`
  const weaveDark = `hsl(${hue} 6% 32%)`
  const glyphDark = `hsl(${hue} 12% ${100 - ink - 4}%)`

  // The viewBox matches the requested aspect, and the glyph — authored on a
  // 100x100 grid — is scaled to the short edge and centred, so it is never
  // cropped no matter how wide or tall the container is.
  const short = Math.min(w, h)
  const glyphSize = short * 0.62
  const gx = (w - glyphSize) / 2
  const gy = (h - glyphSize) / 2
  const k = glyphSize / 100
  const cell = Math.max(6, Math.round(short / 14))
  const strokeScale = 3.4 / k

  // An explicit scheme wins outright; otherwise fall back to the media query.
  const paint = (light: string, dark: string) => (scheme === 'dark' ? dark : light)
  const themeBlock =
    scheme === null
      ? `@media (prefers-color-scheme: dark) {
      .bg { fill: ${bgDark} }
      .wv { fill: ${weaveDark} }
      .gl { stroke: ${glyphDark} }
      .vs { stop-color: ${bgDark} }
    }`
      : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${category.replace(/-/g, ' ')}">
  <style>
    .bg { fill: ${paint(bg, bgDark)} }
    .wv { fill: ${paint(weave, weaveDark)} }
    .gl { stroke: ${paint(glyphColor, glyphDark)} }
    .vs { stop-color: ${paint(bg, bgDark)} }
    ${themeBlock}
  </style>
  <defs>
    <pattern id="w" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotate})">
      <rect class="bg" width="${cell}" height="${cell}"/>
      <rect class="wv" width="${cell / 2}" height="${cell}" opacity=".55"/>
      <rect class="wv" width="${cell}" height="${cell / 2}" opacity=".35"/>
    </pattern>
    <radialGradient id="v" cx="50%" cy="46%" r="70%">
      <stop class="vs" offset="0%" stop-opacity="0.92"/>
      <stop class="vs" offset="100%" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#w)"/>
  <rect width="${w}" height="${h}" fill="url(#v)"/>
  <g transform="translate(${gx} ${gy}) scale(${k})">
    <g class="gl" fill="none" stroke-width="${strokeScale}" stroke-linecap="round" stroke-linejoin="round" opacity=".9">
      <path d="${style.glyph}"/>
    </g>
  </g>
</svg>`

  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')

  // Deliberately NOT `immutable`. These URLs carry no content hash, so marking
  // them immutable means a change to the generator can never reach anyone who
  // has already loaded one. A week of caching plus an ETag gives nearly the
  // same saving with cheap revalidation.
  const etag = `W/"${hash(svg).toString(36)}"`
  setHeader(event, 'ETag', etag)
  setHeader(event, 'Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
  if (scheme === null) setHeader(event, 'Vary', 'Sec-CH-Prefers-Color-Scheme')

  if (getHeader(event, 'if-none-match') === etag) {
    setResponseStatus(event, 304)
    return null
  }

  return svg
})
