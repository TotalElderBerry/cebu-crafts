/**
 * Seamless craft patterns, served as tiling SVGs.
 *
 *   /pattern/banig            /pattern/hablon?tone=tangerine
 *
 * The visual identity comes from Visayan *materials* — the weaves themselves —
 * rather than from landmarks or festival imagery. Every pattern here is a
 * structure a Cebu maker actually produces:
 *
 *   hablon  warp-and-weft plaid from the Argao looms
 *   banig   pandan/buri sleeping mat, an over-under twill
 *   capiz   square shell panes set in a window lattice, Olango and Mactan
 *   nito    coiled forest vine, wound in concentric rings
 *   sawali  split-bamboo basketweave used for walls and panels
 *
 * Used as CSS background-image, so they cannot inherit currentColor — each
 * carries its own light/dark rules instead, the same trick the placeholders use.
 */

type Tone = 'ink' | 'tangerine'

const TONES: Record<Tone, { light: string; dark: string }> = {
  // Near-neutral graphite, and the one accent. No third hue: the palette is a
  // monochrome shell plus tangerine, and a patterned band is the easiest place
  // to accidentally reintroduce a colour the system does not have.
  ink: { light: '95 6% 38%', dark: '95 4% 78%' },
  tangerine: { light: '45 62% 42%', dark: '48 55% 72%' },
}

/** Each tile is authored to repeat cleanly at its own width and height. */
const PATTERNS: Record<string, { w: number; h: number; body: string }> = {
  // Plaid: broad and fine bands crossing, the way a hablon warp is threaded.
  hablon: {
    w: 60,
    h: 60,
    body: `
      <rect class="i" x="0" y="0" width="11" height="60" opacity=".55"/>
      <rect class="i" x="28" y="0" width="4"  height="60" opacity=".40"/>
      <rect class="i" x="44" y="0" width="2"  height="60" opacity=".30"/>
      <rect class="i" x="0" y="0" width="60" height="11" opacity=".55"/>
      <rect class="i" x="0" y="28" width="60" height="4"  opacity=".40"/>
      <rect class="i" x="0" y="44" width="60" height="2"  opacity=".30"/>`,
  },

  // Over-under twill. Two opposed diagonal sets read as plaiting.
  banig: {
    w: 24,
    h: 24,
    body: `
      <g class="s" stroke-width="3" fill="none" stroke-linecap="square">
        <path d="M-6 6 L6 -6 M0 24 L24 0 M18 30 L30 18" opacity=".5"/>
        <path d="M-6 18 L6 30 M0 0 L24 24 M18 -6 L30 6" opacity=".28"/>
      </g>`,
  },

  // Capiz windows: square shell panes in a lattice, not fish scales — the
  // panes in a Cebu casa window are square.
  capiz: {
    w: 30,
    h: 30,
    body: `
      <g class="s" fill="none" stroke-width="1.5">
        <rect x="0" y="0" width="30" height="30" opacity=".45"/>
        <rect x="6" y="6" width="18" height="18" opacity=".22"/>
      </g>
      <rect class="i" x="6" y="6" width="18" height="18" opacity=".10"/>`,
  },

  // Coiled vine. Corner arcs continue the rings across tile edges.
  nito: {
    w: 36,
    h: 36,
    body: `
      <g class="s" fill="none" stroke-width="1.6">
        <circle cx="18" cy="18" r="5" opacity=".5"/>
        <circle cx="18" cy="18" r="10" opacity=".34"/>
        <circle cx="18" cy="18" r="15" opacity=".2"/>
        <circle cx="0"  cy="0"  r="7" opacity=".3"/>
        <circle cx="36" cy="0"  r="7" opacity=".3"/>
        <circle cx="0"  cy="36" r="7" opacity=".3"/>
        <circle cx="36" cy="36" r="7" opacity=".3"/>
      </g>`,
  },

  // Split bamboo: wide bands crossing over and under.
  sawali: {
    w: 32,
    h: 32,
    body: `
      <g class="s" fill="none" stroke-width="7" stroke-linecap="square">
        <path d="M-8 8 L8 -8 M8 40 L40 8" opacity=".38"/>
        <path d="M-8 24 L8 40 M24 -8 L40 8" opacity=".22"/>
      </g>`,
  },
}

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name') ?? 'hablon'
  const pattern = PATTERNS[name]

  if (!pattern) {
    throw createError({ statusCode: 404, statusMessage: `No pattern named "${name}".` })
  }

  const query = getQuery(event)
  const tone = TONES[(query.tone as Tone) ?? 'ink'] ?? TONES.ink
  // Patterns sit behind content, so the default is deliberately faint. Callers
  // that own a full band can ask for more.
  const alpha = Math.min(1, Math.max(0.02, Number(query.a) || 0.14))

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pattern.w}" height="${pattern.h}" viewBox="0 0 ${pattern.w} ${pattern.h}">
  <style>
    .i { fill: hsl(${tone.light} / ${alpha}) }
    .s { stroke: hsl(${tone.light} / ${alpha}) }
    @media (prefers-color-scheme: dark) {
      .i { fill: hsl(${tone.dark} / ${alpha * 0.8}) }
      .s { stroke: hsl(${tone.dark} / ${alpha * 0.8}) }
    }
  </style>
  ${pattern.body}
</svg>`

  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
  return svg
})
