<script setup lang="ts">
/**
 * Palette comparison bench. Not part of the product: a scratch page for judging
 * brand directions as real UI rather than as swatches, because a colour that
 * looks good in a square often dies on a button.
 *
 * Dev-only. This was shipping to production and appearing in the build output
 * at /dev/palettes, publicly reachable, crawlable, and drawing its own colours
 * outside the token system. It now 404s anywhere but the dev server.
 *
 * Delete this page once a direction is settled for good.
 */
definePageMeta({ layout: false })

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
}

type Palette = {
  name: string
  note: string
  bg: string
  card: string
  fg: string
  muted: string
  border: string
  primary: string
  primaryFg: string
  accent: string
  accentFg: string
  tile: string
}

const PALETTES: Palette[] = [
  {
    name: 'A · Banig Bright',
    note: 'The colours banig mats are actually dyed. Vermilion and cobalt on bone.',
    bg: 'oklch(0.985 0.006 95)',
    card: 'oklch(1 0 0)',
    fg: 'oklch(0.19 0.012 60)',
    muted: 'oklch(0.505 0.014 80)',
    border: 'oklch(0.88 0.008 90)',
    primary: 'oklch(0.525 0.205 27)',
    primaryFg: 'oklch(0.99 0.008 60)',
    accent: 'oklch(0.455 0.155 258)',
    accentFg: 'oklch(0.99 0.005 260)',
    tile: 'oklch(0.93 0.035 95)',
  },
  {
    name: 'B · Ink & Brass',
    note: 'Carcar heritage houses: espresso, bone, brass, oxblood. Reads premium.',
    bg: 'oklch(0.962 0.012 88)',
    card: 'oklch(0.995 0.006 88)',
    fg: 'oklch(0.20 0.012 55)',
    muted: 'oklch(0.50 0.016 70)',
    border: 'oklch(0.86 0.014 85)',
    primary: 'oklch(0.505 0.125 62)',
    primaryFg: 'oklch(0.99 0.008 88)',
    accent: 'oklch(0.40 0.135 22)',
    accentFg: 'oklch(0.99 0.006 30)',
    tile: 'oklch(0.91 0.03 85)',
  },
  {
    name: 'C · Mono + Tangerine',
    note: 'Near-black, paper, one loud accent. Photography carries all the colour.',
    bg: 'oklch(0.99 0.002 90)',
    card: 'oklch(1 0 0)',
    fg: 'oklch(0.17 0.003 80)',
    muted: 'oklch(0.49 0.004 80)',
    border: 'oklch(0.88 0.003 85)',
    primary: 'oklch(0.575 0.19 44)',
    primaryFg: 'oklch(0.995 0.005 60)',
    accent: 'oklch(0.30 0.004 80)',
    accentFg: 'oklch(0.99 0 0)',
    tile: 'oklch(0.93 0.004 85)',
  },
  {
    name: 'D · Sinulog Chroma',
    note: 'Fiesta street colour: magenta and turquoise. Loud, joyful, unmistakably PH.',
    bg: 'oklch(0.985 0.008 330)',
    card: 'oklch(1 0 0)',
    fg: 'oklch(0.185 0.02 320)',
    muted: 'oklch(0.50 0.018 320)',
    border: 'oklch(0.88 0.012 330)',
    primary: 'oklch(0.505 0.215 2)',
    primaryFg: 'oklch(0.99 0.008 340)',
    accent: 'oklch(0.475 0.115 208)',
    accentFg: 'oklch(0.99 0.006 210)',
    tile: 'oklch(0.93 0.04 330)',
  },
]

const vars = (p: Palette) => ({
  '--p-bg': p.bg,
  '--p-card': p.card,
  '--p-fg': p.fg,
  '--p-muted': p.muted,
  '--p-border': p.border,
  '--p-primary': p.primary,
  '--p-primary-fg': p.primaryFg,
  '--p-accent': p.accent,
  '--p-accent-fg': p.accentFg,
  '--p-tile': p.tile,
})

useSeoMeta({ title: 'Palette bench' })
</script>

<template>
  <div class="min-h-dvh bg-neutral-100 p-4 font-sans dark:bg-neutral-900">
    <h1 class="pb-1 text-lg font-semibold">Brand directions</h1>
    <p class="pb-4 text-sm text-neutral-500">
      Same components, four palettes. Judge the buttons and the price, not the swatches.
    </p>

    <div class="grid gap-4 md:grid-cols-2">
      <section
        v-for="p in PALETTES"
        :key="p.name"
        class="overflow-hidden rounded-2xl ring-1 ring-black/10"
        :style="{ ...vars(p), background: 'var(--p-bg)', color: 'var(--p-fg)' }"
      >
        <!-- header -->
        <div
          class="flex items-baseline justify-between px-4 pt-4"
          :style="{ color: 'var(--p-fg)' }"
        >
          <div>
            <p class="text-[0.6875rem] font-semibold uppercase tracking-widest" :style="{ color: 'var(--p-muted)' }">
              Likha Cebu
            </p>
            <h2 class="font-display text-xl font-medium leading-tight">Straight from the workshop</h2>
          </div>
        </div>

        <p class="px-4 pt-1 text-xs" :style="{ color: 'var(--p-muted)' }">{{ p.note }}</p>

        <!-- chips -->
        <div class="flex gap-2 px-4 pt-3">
          <span
            class="rounded-full px-3 py-1.5 text-xs font-medium"
            :style="{ background: 'var(--p-card)', border: '1px solid var(--p-border)' }"
          >
            Guitars &amp; Instruments
          </span>
          <span
            class="rounded-full px-3 py-1.5 text-xs font-medium"
            :style="{ background: 'var(--p-card)', border: '1px solid var(--p-border)' }"
          >
            Footwear
          </span>
        </div>

        <!-- product card -->
        <div class="flex gap-3 p-4">
          <div
            class="w-1/2 overflow-hidden rounded-xl"
            :style="{ background: 'var(--p-card)', border: '1px solid var(--p-border)' }"
          >
            <div class="aspect-square" :style="{ background: 'var(--p-tile)' }" />
            <div class="space-y-1 p-2.5">
              <p class="text-sm font-medium leading-tight">Concert Classical Guitar</p>
              <p class="text-base font-semibold" :style="{ color: 'var(--p-primary)' }">₱24,500</p>
              <p class="flex items-center gap-1 text-xs" :style="{ color: 'var(--p-muted)' }">
                <span
                  class="inline-block size-2.5 rounded-full"
                  :style="{ background: 'var(--p-accent)' }"
                />
                Abuno Guitar Works
              </p>
            </div>
          </div>

          <div class="flex w-1/2 flex-col gap-2">
            <button
              class="rounded-xl py-2.5 text-sm font-semibold"
              :style="{ background: 'var(--p-primary)', color: 'var(--p-primary-fg)' }"
            >
              Add · ₱24,500
            </button>
            <button
              class="rounded-xl py-2.5 text-sm font-semibold"
              :style="{ background: 'transparent', color: 'var(--p-fg)', border: '1px solid var(--p-border)' }"
            >
              Message shop
            </button>
            <span
              class="self-start rounded-full px-2.5 py-1 text-[0.6875rem] font-medium"
              :style="{ background: 'var(--p-accent)', color: 'var(--p-accent-fg)' }"
            >
              Verified maker
            </span>
            <span
              class="self-start rounded-full px-2.5 py-1 text-[0.6875rem] font-medium"
              :style="{ background: 'var(--p-tile)', color: 'var(--p-fg)' }"
            >
              Made to order · 45 days
            </span>
            <p class="pt-1 text-xs leading-relaxed" :style="{ color: 'var(--p-muted)' }">
              Secondary copy sits here, at the size it actually appears.
            </p>
          </div>
        </div>

        <!-- bottom nav -->
        <div
          class="flex items-center justify-around px-4 py-2.5"
          :style="{ background: 'var(--p-card)', borderTop: '1px solid var(--p-border)' }"
        >
          <span class="text-[0.6875rem] font-semibold" :style="{ color: 'var(--p-primary)' }">Home</span>
          <span class="text-[0.6875rem]" :style="{ color: 'var(--p-muted)' }">Explore</span>
          <span class="text-[0.6875rem]" :style="{ color: 'var(--p-muted)' }">Cart</span>
          <span class="text-[0.6875rem]" :style="{ color: 'var(--p-muted)' }">Account</span>
        </div>
      </section>
    </div>
  </div>
</template>
