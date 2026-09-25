<script setup lang="ts">
import {
  Amphora,
  Armchair,
  Axe,
  Cookie,
  Footprints,
  Gem,
  Guitar,
  Lamp,
  Package,
  Shell,
  Shirt,
  ShoppingBasket,
} from 'lucide-vue-next'

/**
 * Resolves the lucide icon name stored on each category row.
 *
 * Explicitly mapped rather than dynamically imported: lucide has well over a
 * thousand icons, and a dynamic lookup would defeat tree-shaking and pull the
 * lot into the bundle. Eleven named imports cost nothing.
 */
const ICONS: Record<string, unknown> = {
  guitar: Guitar,
  footprints: Footprints,
  armchair: Armchair,
  shell: Shell,
  shirt: Shirt,
  amphora: Amphora,
  gem: Gem,
  'shopping-basket': ShoppingBasket,
  axe: Axe,
  lamp: Lamp,
  cookie: Cookie,
  package: Package,
}

const props = defineProps<{ name?: string | null }>()

const component = computed(() => ICONS[props.name ?? ''] ?? Package)
</script>

<template>
  <component :is="component" />
</template>
