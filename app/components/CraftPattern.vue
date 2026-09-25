<script setup lang="ts">
/**
 * A decorative weave laid behind content.
 *
 * Deliberately `aria-hidden` and `pointer-events-none`: it carries no meaning,
 * and it must never interfere with a tap. It is also never placed directly
 * behind body text — only behind bands, headers and hero areas — because a
 * patterned backdrop under paragraphs wrecks legibility no matter how faint.
 */
const props = withDefaults(
  defineProps<{
    name?: 'hablon' | 'banig' | 'capiz' | 'nito' | 'sawali'
    tone?: 'ink' | 'tangerine'
    /** Pattern alpha. The default is faint on purpose. */
    alpha?: number
    /** Fades the weave out toward the bottom, so it does not end on a hard line. */
    fade?: boolean
  }>(),
  { name: 'hablon', tone: 'ink', alpha: 0.14, fade: true },
)

const style = computed(() => ({
  backgroundImage: `url("/pattern/${props.name}?tone=${props.tone}&a=${props.alpha}")`,
  ...(props.fade
    ? {
        maskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
      }
    : {}),
}))
</script>

<template>
  <div class="pointer-events-none absolute inset-0 -z-10" :style="style" aria-hidden="true" />
</template>
