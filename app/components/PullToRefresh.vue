<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

/**
 * Pull-to-refresh.
 *
 * Every native list the buyer already uses has this, and its absence is one of
 * the clearest "this is a web page" tells. Implemented on raw touch events
 * rather than a library because the whole behaviour is ~60 lines and a library
 * would fight the `overscroll-behavior: none` we set globally.
 *
 * Only engages when the page is already scrolled to the very top, so it never
 * steals a normal upward scroll.
 */
const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ refresh: [] }>()

const THRESHOLD = 72
const MAX = 110

const distance = ref(0)
const refreshing = ref(false)
const startY = ref(0)
const tracking = ref(false)

const { $haptic } = useNuxtApp()
let passedThreshold = false

function onTouchStart(event: TouchEvent) {
  if (props.disabled || refreshing.value) return
  // scrollY must be 0, otherwise this is an ordinary scroll gesture.
  if (window.scrollY > 0) return

  startY.value = event.touches[0]!.clientY
  tracking.value = true
  passedThreshold = false
}

function onTouchMove(event: TouchEvent) {
  if (!tracking.value) return

  const delta = event.touches[0]!.clientY - startY.value

  if (delta <= 0) {
    distance.value = 0
    tracking.value = false
    return
  }

  // Rubber band: the further you pull, the less it gives.
  distance.value = Math.min(MAX, delta * 0.45)

  if (!passedThreshold && distance.value >= THRESHOLD) {
    passedThreshold = true
    $haptic.light()
  }
}

async function onTouchEnd() {
  if (!tracking.value) return
  tracking.value = false

  if (distance.value < THRESHOLD) {
    distance.value = 0
    return
  }

  refreshing.value = true
  distance.value = THRESHOLD
  $haptic.medium()

  try {
    await Promise.resolve(emit('refresh'))
    // A refresh that resolves instantly reads as nothing having happened.
    await new Promise((r) => setTimeout(r, 450))
  } finally {
    refreshing.value = false
    distance.value = 0
  }
}

defineExpose({ refreshing })
</script>

<template>
  <div
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <div
      class="pointer-events-none flex items-center justify-center overflow-hidden"
      :style="{
        height: `${distance}px`,
        transition: tracking ? 'none' : 'height 260ms cubic-bezier(0.32,0.72,0,1)',
      }"
    >
      <span
        class="grid size-9 place-items-center rounded-full bg-card text-primary-ink shadow-elevation-2"
        :style="{
          opacity: Math.min(1, distance / 40),
          transform: `rotate(${refreshing ? 0 : distance * 3}deg) scale(${Math.min(1, 0.6 + distance / 90)})`,
        }"
      >
        <LoaderCircle class="size-4" :class="refreshing && 'animate-spin'" />
      </span>
    </div>

    <slot />
  </div>
</template>
