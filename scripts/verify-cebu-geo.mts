/**
 * Checks the coordinates in app/lib/cebu-geo.ts against OpenStreetMap's
 * geocoder and prints a corrected table.
 *
 *   pnpm geo:verify
 *
 * Why this exists: the first version of that table was hand-entered from
 * general knowledge, and the Abuno entry was roughly two kilometres out, in the
 * middle of the Mandaue channel. Coordinates are the one kind of content where
 * being approximately right looks exactly like being right, so they get checked
 * against a source rather than eyeballed on a map.
 *
 * The result is pasted into cebu-geo.ts as literals. Nominatim is NOT called at
 * runtime: it is a volunteer service with a one-request-per-second policy and
 * no uptime guarantee, and a shop page must not depend on it.
 */
import { CITY_COORDS, BARANGAY_COORDS, normaliseBarangay } from '../app/lib/cebu-geo'
import { CITY_LABELS } from '../app/lib/cebu'

const UA = 'likha-cebu/0.1 (coordinate verification, one-off build script)'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Hit = { lat: number; lng: number; display: string; kind: string } | null

/**
 * Only places count.
 *
 * The first version of this took the top-ranked result outright, and Nominatim
 * happily ranks a school above the city it sits in: querying "Lapu-Lapu City"
 * returned Lapu-Lapu City Central Elementary School, and the script duly
 * reported the real city coordinate as 5.4km wrong. Anything that is not an
 * administrative boundary or a populated place is now rejected.
 */
const PLACE_TYPES = new Set([
  'administrative',
  'city',
  'town',
  'municipality',
  'village',
  'suburb',
  'neighbourhood',
  'quarter',
  'hamlet',
  'island',
])

async function lookup(query: string): Promise<Hit> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=ph&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  if (!res.ok) return null
  const json = (await res.json()) as Array<{
    lat: string; lon: string; display_name: string; class: string; type: string
  }>
  const hit = json.find(
    (h) => (h.class === 'place' || h.class === 'boundary') && PLACE_TYPES.has(h.type),
  )
  if (!hit) return null
  return {
    lat: +Number(hit.lat).toFixed(4),
    lng: +Number(hit.lon).toFixed(4),
    display: hit.display_name,
    kind: `${hit.class}/${hit.type}`,
  }
}

/** Great-circle distance in km, to judge how far off the current value is. */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return +(2 * R * Math.asin(Math.sqrt(h))).toFixed(2)
}

async function main() {
  console.log('\n  Verifying against Nominatim (1 req/sec, this takes a minute)\n')

  const cityOut: string[] = []
  const cityFixes: string[] = []
  for (const [key, cur] of Object.entries(CITY_COORDS)) {
    if (key === 'other') {
      cityOut.push(`  other: { lat: ${cur.lat}, lng: ${cur.lng} },`)
      continue
    }
    const hit = await lookup(`${CITY_LABELS[key]}, Cebu, Philippines`)
    await sleep(1100)
    if (!hit) {
      cityOut.push(`  ${key}: { lat: ${cur.lat}, lng: ${cur.lng} }, // UNVERIFIED`)
      console.log(`  ?  ${key.padEnd(16)} no result, keeping current`)
      continue
    }
    const drift = km(cur, hit)
    cityOut.push(`  ${key}: { lat: ${hit.lat}, lng: ${hit.lng} },`)
    if (drift > 2) cityFixes.push(`${key} moved ${drift}km`)
    console.log(`  ${drift > 2 ? '!' : 'ok'}  ${key.padEnd(16)} ${drift}km  ${hit.kind.padEnd(24)} ${hit.display.slice(0, 40)}`)
  }

  const brgyOut: string[] = []
  const brgyFixes: string[] = []
  for (const [key, cur] of Object.entries(BARANGAY_COORDS)) {
    const [city, name] = key.split(':')
    const hit =
      (await lookup(`${name}, ${CITY_LABELS[city!]}, Cebu, Philippines`)) ??
      (await (sleep(1100), lookup(`Barangay ${name}, ${CITY_LABELS[city!]}, Cebu, Philippines`)))
    await sleep(1100)
    if (!hit) {
      brgyOut.push(`  '${key}': { lat: ${cur.lat}, lng: ${cur.lng} }, // UNVERIFIED`)
      console.log(`  ?  ${key.padEnd(28)} no result, keeping current`)
      continue
    }
    const drift = km(cur, hit)
    brgyOut.push(`  '${key}': { lat: ${hit.lat}, lng: ${hit.lng} },`)
    if (drift > 1) brgyFixes.push(`${key} moved ${drift}km`)
    console.log(`  ${drift > 1 ? '!' : 'ok'}  ${key.padEnd(28)} ${drift}km  ${hit.kind.padEnd(20)} ${hit.display.slice(0, 36)}`)
  }

  console.log('\n\n--- CITY_COORDS ---\n')
  console.log(cityOut.join('\n'))
  console.log('\n--- BARANGAY_COORDS ---\n')
  console.log(brgyOut.join('\n'))
  console.log(`\n  ${cityFixes.length} cities and ${brgyFixes.length} barangays were materially wrong.`)
  if ([...cityFixes, ...brgyFixes].length) console.log('  ' + [...cityFixes, ...brgyFixes].join('\n  '))
  console.log()
}

main()
