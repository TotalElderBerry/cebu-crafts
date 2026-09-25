<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { MapPin, Navigation, WifiOff } from 'lucide-vue-next'
import type * as L from 'leaflet'
import { cityLabel } from '~/lib/cebu'
import { directionsUrl, resolveLocation } from '~/lib/cebu-geo'

/**
 * A shop's location on an interactive map.
 *
 * `.client` suffix: Leaflet touches `window` and measures the DOM at
 * construction, so it cannot render on the server.
 *
 * Leaflet is imported dynamically inside onMounted rather than at the top of
 * the module. It is roughly 150KB with its stylesheet, and only the shop page
 * ever shows a map; a static import would put that on every route in the
 * bundle. This way the catalogue, cart and checkout never pay for it.
 *
 * The offline case is handled rather than assumed. The packaged Capacitor app
 * bundles its assets and is expected to work without a connection, but map
 * tiles are fetched per pan and zoom, so there is no version of this that works
 * offline. When tiles fail, the map is replaced with the address and a
 * directions link, which is the part a person actually needs.
 */
const props = defineProps<{
  shopName: string
  city: string
  barangay?: string | null
}>()

const location = computed(() => resolveLocation(props.city, props.barangay))

const place = computed(
  () => `${props.barangay ? `${props.barangay}, ` : ''}${cityLabel(props.city)}`,
)

/**
 * Tile source.
 *
 * Defaults to OpenStreetMap's own tiles, which are the only widely-known raster
 * basemap that genuinely needs no key. This was CARTO first, which looked fine
 * because their unkeyed tiles still return HTTP 200 and load without error;
 * they just arrive with "API KEY REQUIRED" printed across them. Nothing throws,
 * so the failure is invisible until someone looks at the map.
 *
 * NOT PRODUCTION-READY AS-IS. The OSM Foundation runs those tiles on donated
 * capacity and their tile usage policy rules out heavy or commercial use. A
 * live marketplace needs its own provider (MapTiler, Stadia, Mapbox, or a
 * self-hosted renderer). Point NUXT_PUBLIC_MAP_TILE_URL at it and the
 * attribution string at whatever that provider requires; nothing else changes.
 */
const config = useRuntimeConfig()
const tileUrl =
  (config.public.mapTileUrl as string) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const tileAttribution =
  (config.public.mapTileAttribution as string) ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const el = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'failed'>('loading')
const reduced = usePreferredReducedMotion()

let map: L.Map | null = null

/**
 * Initialise when the container element actually exists, rather than assuming
 * it does by `onMounted`.
 *
 * The page transition mounts this component twice, and on the second pass
 * `onMounted` fired before the template ref was bound, so the map silently fell
 * through to its failure state on every real navigation. Watching the ref is
 * timing-independent: it runs whenever the node appears, once.
 */
async function init(node: HTMLElement) {
  if (!location.value) {
    status.value = 'failed'
    return
  }

  try {
    const leaflet = await import('leaflet')

    const { lat, lng, precision } = location.value
    const still = reduced.value === 'reduce'

    map = leaflet.map(node, {
      center: [lat, lng],
      // Barangay centroids deserve neighbourhood zoom; a city centroid zoomed
      // that far in would imply a precision the coordinate does not have.
      zoom: precision === 'barangay' ? 14 : 12,
      scrollWheelZoom: false, // a map that eats page scroll is hostile on a phone
      zoomAnimation: !still,
      fadeAnimation: !still,
      markerZoomAnimation: !still,
      attributionControl: true,
    })

    const tiles = leaflet.tileLayer(tileUrl, {
      // Attribution is a licence condition for OpenStreetMap data, not a
      // decoration. It does not get removed to tidy the corner up.
      attribution: tileAttribution,
      maxZoom: 19,
      crossOrigin: true,
    })

    // If not one tile loads, there is no connection or the provider is down.
    // Say so instead of showing an empty grey rectangle that looks broken.
    let loadedAny = false
    tiles.on('tileload', () => {
      loadedAny = true
    })
    tiles.on('tileerror', () => {
      if (!loadedAny) status.value = 'failed'
    })

    tiles.addTo(map)

    // A ring rather than a needle-point pin. The coordinate is a neighbourhood
    // centroid, and a sharp pin would claim an accuracy it does not have.
    leaflet
      .circle([lat, lng], {
        radius: precision === 'barangay' ? 500 : 2500,
        color: 'var(--primary-ink)',
        fillColor: 'var(--primary)',
        fillOpacity: 0.18,
        weight: 2,
      })
      .addTo(map)

    // A div marker, not Leaflet's default image pin: the default resolves its
    // icon from a relative image path that bundlers rewrite, which is the most
    // common way a Leaflet map ships with a broken marker. This also keeps the
    // marker on the brand palette.
    leaflet
      .marker([lat, lng], {
        icon: leaflet.divIcon({
          className: '',
          html: `<span class="block size-3.5 rounded-full bg-primary ring-2 ring-background shadow-elevation-2"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
        keyboard: false,
        title: props.shopName,
      })
      .addTo(map)

    status.value = 'ready'
  } catch (error) {
    // The fallback is correct for the usual cause (no connection), but a
    // swallowed exception also hides real bugs, and did exactly that while this
    // was being built. Same behaviour either way; this just leaves a trail.
    if (import.meta.dev) console.error('[ShopMap] failed to initialise', error)
    status.value = 'failed'
  }
}

watch(
  el,
  (node) => {
    if (node && !map) init(node)
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <section v-if="location" class="mt-6">
    <div class="px-4 lg:px-0">
      <h2 class="font-display text-lg font-medium lg:text-2xl">Where this workshop is</h2>

      <div class="mt-3 overflow-hidden rounded-xl card-surface">
        <!-- Fixed aspect box so the card never resizes when the map arrives. -->
        <div class="relative aspect-[4/3] w-full sm:aspect-[16/9]">
          <!--
            The visibility toggle lives on this wrapper, never on the element
            Leaflet owns.

            Leaflet adds its own classes (leaflet-container, leaflet-touch, the
            animation flags) to the map element with JS. A Vue :class binding on
            that same element rewrites the class attribute on every status
            change and wipes them. Losing `leaflet-container` means none of
            Leaflet's stylesheet matches, since all of it is scoped under that
            class, and the visible symptom is tiles that load correctly and then
            render at zero width because Tailwind Preflight's
            `img { max-width: 100% }` is the only rule left standing.
          -->
          <div class="size-full" :class="status === 'ready' ? '' : 'invisible'">
            <div
              ref="el"
              class="size-full"
              role="application"
              :aria-label="`Map showing the approximate location of ${shopName} in ${place}`"
            />
          </div>

          <!-- Loading: the shape of the thing that is coming, not a spinner. -->
          <div
            v-if="status === 'loading'"
            class="absolute inset-0 animate-pulse bg-muted"
            aria-hidden="true"
          />

          <!--
            Failure. Almost always no connection, which is the normal state in
            the packaged app. The address and the directions link are what the
            map was carrying anyway, so they stay.
          -->
          <div
            v-else-if="status === 'failed'"
            class="absolute inset-0 grid place-items-center bg-muted px-6 text-center"
          >
            <div>
              <WifiOff class="mx-auto size-6 text-muted-foreground" />
              <p class="mt-2 text-sm font-medium">Map needs a connection</p>
              <p class="prose-measure mx-auto mt-1 text-sm leading-relaxed text-muted-foreground">
                {{ place }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-border p-3">
          <p class="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin class="mt-0.5 size-4 shrink-0" />
            <span>
              {{ place }}
              <!--
                Stated, not implied. The pin is a barangay centroid at best, and
                a buyer planning a pickup should know that before travelling.
              -->
              <span class="block text-xs">
                {{
                  location.precision === 'barangay'
                    ? 'Approximate area, not an exact address'
                    : 'Municipality only'
                }}
              </span>
            </span>
          </p>

          <a
            :href="directionsUrl(location)"
            target="_blank"
            rel="noopener noreferrer"
            class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary-ink"
          >
            <Navigation class="size-4" />Directions
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/*
 * Leaflet's own stylesheet, imported here rather than dynamically in script.
 *
 * `await import('leaflet/dist/leaflet.css')` inside the init function did not
 * inject anything, and the failure is quiet: the map builds, tiles fetch and
 * report loaded, and every tile then renders at zero width. The cause is
 * Tailwind's Preflight, which sets `img { max-width: 100% }`; Leaflet's tile
 * containers are absolutely positioned with no width, so 100% resolves to 0.
 * Leaflet's stylesheet carries the `.leaflet-container img { max-width: none }`
 * rule that neutralises exactly this, so without it the map is invisible.
 *
 * As an SFC @import it is bundled with the component, so it still only loads on
 * pages that render a map.
 */
@import 'leaflet/dist/leaflet.css';

/* Belt and braces against the Preflight conflict above, in case the import
   order ever puts Preflight last. */
.leaflet-container img.leaflet-tile {
  max-width: none;
}

/* Leaflet paints its own chrome. Bring it onto the app's tokens so the map does
   not look like a component borrowed from another product. */
.leaflet-container {
  background: var(--muted);
  font-family: var(--font-sans);
  outline: none;
}

.leaflet-control-attribution {
  background: color-mix(in oklch, var(--card) 88%, transparent) !important;
  color: var(--muted-foreground);
  font-size: 10px;
}

.leaflet-control-attribution a {
  color: var(--primary-ink);
}

.leaflet-control-zoom a {
  background: var(--card) !important;
  border-color: var(--border) !important;
  color: var(--foreground) !important;
}

.leaflet-control-zoom a:hover {
  background: var(--muted) !important;
}

/* The tile art is a light basemap. Rather than swap providers for dark mode,
   pull the luminance down and lift it back so it sits on a charcoal page
   without the inverted-colour look a straight invert() filter gives. */
.dark .leaflet-tile-pane {
  filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9) saturate(0.85);
}
</style>
