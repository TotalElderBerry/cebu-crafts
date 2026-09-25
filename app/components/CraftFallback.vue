<script setup lang="ts">
/**
 * The woven fallback shown when a listing or workshop has no photograph.
 *
 * Why this is a background image and not an `<img>`:
 *
 * The generator needs to know the theme, because this app's dark mode is an
 * in-app class toggle that is deliberately independent of the OS, so the SVG's
 * own `prefers-color-scheme` query cannot see it. Reading the theme to build a
 * `src` looks obvious and is wrong: the server has no localStorage, so it
 * always renders the light URL, and every dark-mode visitor got a hydration
 * mismatch. Vue does not rectify those in production, so the tile stayed light
 * on a dark page anyway.
 *
 * Both URLs are emitted unconditionally, which is theme-independent and so
 * identical on server and client. The `.dark` class picks between them in CSS,
 * and the browser only fetches the one that wins.
 */
const props = withDefaults(
  defineProps<{
    /** Craft category slug; picks the motif. */
    category?: string | null
    /** Stable seed so the same listing always gets the same variation. */
    seed: string
    label: string
    w?: number
    h?: number
  }>(),
  { category: null, w: 600, h: 600 },
)

const url = (scheme: 'light' | 'dark') =>
  `/placeholder/${props.category ?? 'craft'}/${props.seed}?w=${props.w}&h=${props.h}&scheme=${scheme}`
</script>

<template>
  <div
    class="size-full bg-cover bg-center [background-image:var(--craft-light)] dark:[background-image:var(--craft-dark)]"
    :style="{ '--craft-light': `url('${url('light')}')`, '--craft-dark': `url('${url('dark')}')` }"
    role="img"
    :aria-label="label"
  />
</template>
