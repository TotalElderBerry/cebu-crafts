<script setup lang="ts">
import { useIntersectionObserver, usePreferredReducedMotion } from '@vueuse/core'

/**
 * Fades a section up as it enters the viewport, once.
 *
 * Why it exists: the rails below the fold all arrived fully formed, so a long
 * scroll read as one flat sheet with no sense of where one section ended and
 * the next began. The reveal is doing hierarchy work, not decoration.
 *
 * IntersectionObserver rather than a scroll listener: a scroll handler fires on
 * every frame and is the single most reliable way to make a phone drop frames.
 *
 * Reduced motion is not a degraded variant here. It renders the content plainly
 * and never registers the observer at all.
 */
const props = withDefaults(
  defineProps<{
    /** Stagger, in ms, for sibling reveals. */
    delay?: number
  }>(),
  { delay: 0 },
)

const el = ref<HTMLElement | null>(null)
const shown = ref(false)
const reduced = usePreferredReducedMotion()

// SSR renders the content visible. Only a client with motion enabled hides it
// first, so the page is never blank for a crawler or with JS disabled.
const armed = ref(false)
onMounted(() => {
  if (reduced.value === 'reduce') return
  armed.value = true
})

const { stop } = useIntersectionObserver(
  el,
  ([entry]) => {
    if (!entry?.isIntersecting) return
    shown.value = true
    stop()
  },
  { threshold: 0.12 },
)

const visible = computed(() => !armed.value || shown.value)
</script>

<template>
  <div
    ref="el"
    class="motion-safe:transition-[opacity,transform] motion-safe:duration-[600ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'"
    :style="visible && props.delay ? undefined : { transitionDelay: `${props.delay}ms` }"
  >
    <slot />
  </div>
</template>
