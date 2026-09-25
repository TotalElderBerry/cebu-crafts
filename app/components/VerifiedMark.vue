<script setup lang="ts">
import { BadgeCheck } from 'lucide-vue-next'

/**
 * The admin-verified workshop mark.
 *
 * Pulled out of the three components that each drew their own so the one piece
 * of trust signalling in the product cannot drift in size or colour between a
 * card, a rail and a shop header. It stays graphite rather than the usual blue
 * tick: in a single-accent palette a blue would read as a second brand colour.
 */
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' })
</script>

<template>
  <BadgeCheck
    class="shrink-0 text-accent"
    :class="size === 'md' ? 'size-5' : 'size-3.5'"
    aria-label="Verified workshop"
  />
</template>
