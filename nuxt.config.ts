import tailwindcss from '@tailwindcss/vite'

// `pnpm mobile:build` sets NUXT_MOBILE=true. The mobile target is a pure SPA
// whose assets get bundled into the Capacitor shell; it talks to the deployed
// Nitro API over the network instead of rendering on a server.
const isMobile = process.env.NUXT_MOBILE === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: !isMobile },

  // Web target renders on the server (tourists and diaspora buyers need to be
  // able to find makers through search engines). Mobile target does not.
  ssr: !isMobile,

  modules: ['@vueuse/nuxt', 'nuxt-auth-utils', '@nuxt/fonts'],

  css: ['~/assets/css/tailwind.css'],

  // Self-hosted and subset at build time, so there is no Google Fonts round
  // trip and no layout shift. Two weights each keeps the payload near 50KB,
  // which matters on Philippine mobile data.
  fonts: {
    families: [
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Outfit', provider: 'google', weights: [500, 600, 700] },
    ],
    defaults: { subsets: ['latin'] },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // shadcn-vue drops its primitives in app/components/ui. Registering them
  // without a path prefix keeps usage as <Button> rather than <UiButton>.
  components: [
    { path: '~/components/ui', extensions: ['.vue'], pathPrefix: false },
    { path: '~/components', pathPrefix: false },
  ],

  runtimeConfig: {
    // Nuxt would only fill this from NUXT_DATABASE_URL. Reading DATABASE_URL
    // here keeps the conventional name working — it is what Neon, Vercel and
    // drizzle-kit all expect. NUXT_DATABASE_URL still overrides at runtime.
    databaseUrl: process.env.DATABASE_URL || '',

    // PayMongo. Server-only — the secret key must never reach the client, and
    // Checkout Sessions need no publishable key.
    paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY || '',
    paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || '',
    paymongoRails: process.env.PAYMONGO_RAILS || 'gcash,paymaya,grab_pay,card',

    public: {
      apiBase: '',
      /** Public origin used for PayMongo return URLs. Required for the mobile
       *  build, whose requests originate from capacitor://localhost. */
      appOrigin: process.env.NUXT_PUBLIC_APP_ORIGIN || '',
      /** Mirrors whether a secret key is configured, so the checkout page can
       *  offer real payment instead of the mock. Never the key itself. */
      paymongoEnabled: Boolean(process.env.PAYMONGO_SECRET_KEY),
      /** Map tiles. Defaults to OpenStreetMap, whose usage policy rules out
       *  commercial traffic: point these at a real provider before launch. */
      mapTileUrl: process.env.NUXT_PUBLIC_MAP_TILE_URL || '',
      mapTileAttribution: process.env.NUXT_PUBLIC_MAP_TILE_ATTRIBUTION || '',
      cloudinaryCloudName: '',
      cloudinaryUploadPreset: '',
    },
  },

  app: {
    // Capacitor serves webDir at the origin root (capacitor://localhost on iOS,
    // https://localhost on Android), so absolute paths are correct there too.
    // Only the asset folder changes: a leading underscore trips up some Android
    // asset handling, so the mobile bundle uses a plain "assets" directory.
    baseURL: '/',
    buildAssetsDir: isMobile ? '/assets/' : '/_nuxt/',

    // A slide push/pop. Browsers swap pages instantly; apps move them, and
    // that motion is most of what separates the two.
    pageTransition: { name: 'page-slide', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en-PH' },
      title: 'Likha Cebu',
      meta: [
        { charset: 'utf-8' },
        // viewport-fit=cover is what lets env(safe-area-inset-*) resolve to
        // real values under the notch and the home indicator.
        {
          name: 'viewport',
          // `user-scalable=no` only in the packaged app, where pinch-zoom on a
          // native UI is a bug rather than a feature. On the web it blocks
          // zoom for anyone who needs larger text, which is a real
          // accessibility failure and exactly where it matters most.
          content: isMobile
            ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
            : 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#f3f3f2', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#1e1d1c', media: '(prefers-color-scheme: dark)' },
        {
          name: 'description',
          content:
            'Buy directly from Cebu craft makers - guitars from Lapu-Lapu, shoes from Carcar, rattan from Mandaue, shellcraft, and hand-woven textiles.',
        },
      ],
      script: [
        {
          // Applies the saved theme before first paint, to avoid the classic
          // dark-mode flash. Defaults to light: dark is opt-in, and only
          // "system" follows the OS. Inline and tiny on purpose.
          innerHTML:
            "try{var t=localStorage.getItem('likha.theme');var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}",
          tagPosition: 'head',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Safari ignores SVG and WebP here, so it gets a PNG.
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  nitro: {
    // Static output for the Capacitor bundle; node-server otherwise.
    preset: isMobile ? 'static' : undefined,
  },

  typescript: {
    typeCheck: false,
    strict: true,
  },

  future: { compatibilityVersion: 4 },
})
