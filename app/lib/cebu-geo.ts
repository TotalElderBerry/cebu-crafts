/**
 * Coordinates for Cebu municipalities and the barangays the catalogue uses.
 *
 * Resolved from the `city` and `barangay` columns that already exist on a
 * maker, rather than adding lat/lng columns. That means every shop gets a
 * location immediately, including ones created after this shipped, and there is
 * no second copy of the address to drift out of sync with the first.
 *
 * PRECISION IS DELIBERATE. A barangay centroid is a neighbourhood, not a
 * doorstep. Most of these workshops are somebody's home: the seed copy says so
 * ("a nipa shed in Abuno"). Publishing an exact pin to a private residence on a
 * public marketplace page is a real exposure, and it is not something a maker
 * signing up for a craft listing would expect. If exact pins are ever wanted,
 * they should be opt-in per maker with the default off, not derived here.
 *
 * ACCURACY CAVEAT: these are hand-entered approximate centroids, good enough to
 * put a pin in the right neighbourhood and no better. They have not been
 * checked against an authoritative gazetteer. Verify before launch, especially
 * the barangay entries.
 */

export type Coords = { lat: number; lng: number }
export type Precision = 'barangay' | 'city'
export type ResolvedLocation = Coords & { precision: Precision }

/** Municipality centroids, keyed by the `cebu_city` enum. */
export const CITY_COORDS: Record<string, Coords> = {
  // The three metro cities are town centres, not polygon centroids. The
  // geocoder ranks landmarks above the city node for these, and Cebu City's
  // administrative centroid (10.2935, 123.9018) falls in the uplands well west
  // of anywhere a workshop would be, which is a worse pin than downtown.
  cebu_city: { lat: 10.3157, lng: 123.8854 },
  mandaue: { lat: 10.3265, lng: 123.941 },
  lapu_lapu: { lat: 10.3103, lng: 123.9494 },

  // Verified against OSM place nodes, all within 1km of the original estimates.
  talisay: { lat: 10.243, lng: 123.8488 },
  carcar: { lat: 10.1056, lng: 123.6407 },
  danao: { lat: 10.5196, lng: 124.0271 },
  naga: { lat: 10.2085, lng: 123.7591 },
  toledo: { lat: 10.3749, lng: 123.6344 },
  bogo: { lat: 11.0513, lng: 124.0035 },
  argao: { lat: 9.8814, lng: 123.6086 },
  dalaguete: { lat: 9.7619, lng: 123.5334 },
  oslob: { lat: 9.5204, lng: 123.4335 },
  moalboal: { lat: 9.9372, lng: 123.3922 },
  barili: { lat: 10.1165, lng: 123.5094 },
  sibonga: { lat: 10.0174, lng: 123.6205 },
  cordova: { lat: 10.2522, lng: 123.9495 },
  consolacion: { lat: 10.3758, lng: 123.957 },
  liloan: { lat: 10.3998, lng: 123.9988 },
  compostela: { lat: 10.4538, lng: 124.0127 },
  minglanilla: { lat: 10.246, lng: 123.7961 },
  asturias: { lat: 10.5677, lng: 123.716 },
  bantayan: { lat: 11.1667, lng: 123.7189 },

  // "other" is anywhere else in the province; fall back to the island's middle.
  other: { lat: 10.3157, lng: 123.8854 },
}

/**
 * Barangay centroids, keyed `city:normalised-barangay`.
 *
 * Only the barangays the catalogue actually uses are listed. Anything not here
 * falls back to the municipality, which is the correct behaviour rather than a
 * gap: a maker can type any barangay they like into the shop form.
 */
export const BARANGAY_COORDS: Record<string, Coords> = {
  // Confirmed against a named feature standing inside the barangay. The first
  // hand-entered Abuno value was 3.7km out, in the Mandaue channel, which is
  // what prompted verifying the whole table.
  'lapu_lapu:abuno': { lat: 10.2925, lng: 123.9874 }, // Abuno High School
  'mandaue:tipolo': { lat: 10.3284, lng: 123.9332 }, // Tipolo National High School
  'mandaue:centro': { lat: 10.326, lng: 123.9443 }, // Mandaue City Central School

  // Confirmed against OSM place nodes.
  'cebu_city:tisa': { lat: 10.3021, lng: 123.869 },
  'carcar:poblacion iii': { lat: 10.1087, lng: 123.6464 },
  'danao:poblacion': { lat: 10.5176, lng: 124.0245 },
  'argao:lamacan': { lat: 9.8784, lng: 123.595 },
}

/**
 * Barangays the geocoder has no entry for at all.
 *
 * Listed rather than quietly folded in with the verified ones. Sta. Rosa is on
 * Olango, a small island off Mactan with thin OSM coverage, and the value here
 * is an eyeballed island centre. Treating it as verified would draw a tight
 * 500m ring around a guess, so `resolveLocation` deliberately reports these at
 * city precision: a wider ring that is honest beats a narrow one that is not.
 */
export const UNVERIFIED_BARANGAY_COORDS: Record<string, Coords> = {
  'lapu_lapu:sta rosa olango': { lat: 10.2569, lng: 124.0264 },
}

/**
 * Normalises a free-text barangay for lookup: lowercased, punctuation dropped,
 * whitespace collapsed. "Sta. Rosa, Olango" and "sta rosa olango" match.
 */
export function normaliseBarangay(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best-known position for a shop, and how precise it actually is, so the UI can
 * say so rather than implying a doorstep.
 */
export function resolveLocation(
  city: string | null | undefined,
  barangay?: string | null,
): ResolvedLocation | null {
  const cityCoords = city ? CITY_COORDS[city] : undefined

  if (city && barangay) {
    const key = `${city}:${normaliseBarangay(barangay)}`

    const verified = BARANGAY_COORDS[key]
    if (verified) return { ...verified, precision: 'barangay' }

    // Known position, unverified source: use it, but report city precision so
    // the map draws the wider ring and the UI does not claim a neighbourhood.
    const unverified = UNVERIFIED_BARANGAY_COORDS[key]
    if (unverified) return { ...unverified, precision: 'city' }
  }

  if (cityCoords) return { ...cityCoords, precision: 'city' }
  return null
}

/**
 * Hands navigation off to a real maps app rather than trying to do routing in
 * a Leaflet canvas.
 *
 * The universal Google Maps URL rather than a `geo:` URI: `geo:` deep-links
 * nicely on Android but does nothing in a desktop browser, whereas this opens
 * the installed maps app on both mobile platforms and a normal map on desktop.
 * One URL, all three targets.
 */
export function directionsUrl(coords: Coords) {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat}%2C${coords.lng}`
}
