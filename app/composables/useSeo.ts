/**
 * SEO helpers.
 *
 * The audit found no structured data, no canonical, and OG images pointing at
 * relative paths. Crawlers and social scrapers need absolute URLs, so both of
 * those have to know the site's own origin.
 *
 * Note on shape: these resolve the origin once, during setup, and hand back a
 * plain function. `useSeoMeta` resolves its getters lazily, outside the setup
 * context, so a getter that itself calls `useRuntimeConfig()` or
 * `useRequestURL()` throws "a composable that requires access to the Nuxt
 * instance was called outside of a plugin". Capturing the value up front is the
 * fix, and it is also one less lookup per render.
 */

/**
 * Resolves the site origin. Must be called from setup.
 *
 * Reuses `public.appOrigin`, the value the PayMongo return URLs already depend
 * on, rather than introducing a second origin setting that could drift from it.
 * It is also the only correct value inside the Capacitor build, where the page
 * is served from a capacitor:// origin no crawler can resolve. Falls back to
 * the incoming request, then to the browser.
 */
export function useSiteOrigin() {
  const configured = useRuntimeConfig().public.appOrigin as string | undefined
  if (configured) return configured.replace(/\/+$/, '')

  if (import.meta.server) {
    const url = useRequestURL()
    return `${url.protocol}//${url.host}`
  }

  return import.meta.client ? window.location.origin : ''
}

/**
 * Returns a function that turns an app-relative path into an absolute URL.
 * Full URLs pass through untouched.
 */
export function useAbsoluteUrl() {
  const origin = useSiteOrigin()

  return (path: string | null | undefined) => {
    if (!path) return undefined
    if (/^https?:\/\//i.test(path)) return path
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`
  }
}

/**
 * Adds a JSON-LD block to the page head.
 *
 * Takes a getter so the payload can depend on data that arrives after setup,
 * and renders nothing when the getter returns null rather than emitting an
 * empty script tag.
 */
export function useJsonLd(build: () => Record<string, unknown> | null) {
  useHead({
    script: computed(() => {
      const data = build()
      if (!data) return []
      return [{ type: 'application/ld+json', innerHTML: JSON.stringify(data) }]
    }),
  })
}

/** Canonical link for a path, so the explore facet URLs stop competing. */
export function useCanonical(path: () => string) {
  const abs = useAbsoluteUrl()
  useHead({
    link: computed(() => [{ rel: 'canonical', href: abs(path()) ?? '' }]),
  })
}
