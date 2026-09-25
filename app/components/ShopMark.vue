<script setup lang="ts">
/**
 * A workshop's monogram.
 *
 * These shops are invented for the demo, so there is no real logo to show. The
 * seed briefly used a photograph as the logo, which was worse than the mark it
 * replaced: a thumbnail of sandals next to a cover photo of the same sandals
 * reads as a duplicated image, not as a brand.
 *
 * So: initials, drawn from the shop name, on a tint derived from the name. It
 * is deterministic, it costs no bytes, and it is unmistakably a mark rather
 * than a photo. A maker who uploads a real logo gets that instead.
 */
const props = defineProps<{
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}>()

/** Up to two initials, skipping the words that are not part of the name. */
const initials = computed(() => {
  const skip = new Set(['sa', 'the', 'and', 'of', 'co', 'studio', 'works', 'ph'])
  const words = props.name
    .split(/[\s.]+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ''))
    .filter((w) => w && !skip.has(w.toLowerCase()))
  const picked = words.length ? words : props.name.split(/\s+/)
  return picked
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
})

/** Stable hue per shop, kept inside the warm band so it sits with the accent. */
const hue = computed(() => {
  let h = 2166136261
  for (let i = 0; i < props.name.length; i++) {
    h ^= props.name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return 20 + (Math.abs(h) % 60)
})

const box = computed(
  () => ({ sm: 'size-10 text-sm', md: 'size-14 text-lg', lg: 'size-20 text-2xl' })[props.size ?? 'md'],
)
</script>

<template>
  <img
    v-if="logoUrl"
    :src="logoUrl"
    :alt="name"
    loading="lazy"
    decoding="async"
    class="shrink-0 rounded-xl object-cover ring-2 ring-card"
    :class="box"
  />
  <span
    v-else
    class="grid shrink-0 place-items-center rounded-xl font-semibold ring-2 ring-card"
    :class="box"
    :style="{
      backgroundColor: `oklch(0.88 0.06 ${hue})`,
      color: `oklch(0.34 0.11 ${hue})`,
    }"
    aria-hidden="true"
  >
    {{ initials }}
  </span>
</template>
