<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    title?: string
    back?: boolean | string
    /** Transparent until the page scrolls, for hero screens. */
    transparent?: boolean
  }>(),
  { back: false, transparent: false },
)

const router = useRouter()
const scrolled = ref(false)
const sentinel = ref<HTMLElement | null>(null)

function goBack() {
  if (typeof props.back === 'string') {
    navigateTo(props.back)
  } else if (history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

/**
 * The header only grows a border once content is behind it, a small thing that
 * reads as native rather than as a static web bar.
 *
 * Driven by a zero-height sentinel at the top of the page rather than a scroll
 * listener. A scroll handler runs on every frame the user scrolls, which is the
 * most reliable way to drop frames on a mid-range phone, and this app's whole
 * point is feeling native on one. The observer fires twice: once when the top
 * of the page leaves the viewport and once when it comes back.
 */
useIntersectionObserver(sentinel, ([entry]) => {
  scrolled.value = !entry?.isIntersecting
})
</script>

<template>
  <!--
    On desktop the fixed top nav already occupies the top of the screen, so this
    bar stops being sticky and stops drawing a background, otherwise there are
    two stacked bars and the page title sits under the nav.
  -->
  <!-- Sits above the sticky header in document flow, so it scrolls away. -->
  <div ref="sentinel" aria-hidden="true" class="h-px" />

  <header
    class="sticky top-0 z-40 -mt-px pt-safe transition-colors duration-200 lg:static lg:pt-2 lg:pb-1"
    :class="[
      transparent && !scrolled
        ? 'bg-transparent'
        : 'border-b border-border bg-background/95 backdrop-blur-lg lg:border-0 lg:bg-transparent lg:backdrop-blur-none',
    ]"
  >
    <div class="flex min-h-[3.25rem] items-center gap-1 px-2 lg:px-0">
      <!-- Back is a phone affordance; desktop has browser chrome and the nav. -->
      <button
        v-if="back"
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-md transition active:scale-90 active:bg-muted lg:hidden"
        aria-label="Go back"
        @click="goBack"
      >
        <ChevronLeft class="size-6" />
      </button>
      <div v-else class="w-2 lg:hidden" />

      <h1 v-if="title" class="font-display truncate text-base font-semibold lg:text-2xl lg:font-medium">
        {{ title }}
      </h1>
      <slot name="title" />

      <div class="ml-auto flex items-center gap-1 pr-1">
        <slot name="actions" />
      </div>
    </div>
    <slot name="below" />
  </header>
</template>
