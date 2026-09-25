<script setup lang="ts">
import { CITY_LABELS, CRAFT_CITIES } from '~/lib/cebu'

/**
 * The filter controls, extracted so the same markup can be a bottom sheet on a
 * phone and a persistent sidebar on desktop. Duplicating them would guarantee
 * the two drift apart the first time a filter is added.
 */
defineProps<{
  categories?: { slug: string; name: string }[] | null
  showSort: boolean
}>()

const category = defineModel<string>('category', { required: true })
const city = defineModel<string>('city', { required: true })
const sort = defineModel<string>('sort', { required: true })
const madeToOrder = defineModel<boolean>('madeToOrder', { required: true })

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'rating', label: 'Best rated' },
]
</script>

<template>
  <div class="space-y-5">
    <div>
      <h3 class="pb-2 text-sm font-medium">Craft</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="c in categories"
          :key="c.slug"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm ring-1 transition"
          :class="category === c.slug
            ? 'bg-primary text-primary-foreground ring-primary'
            : 'bg-card ring-border hover:bg-muted'"
          @click="category = category === c.slug ? '' : c.slug"
        >
          {{ c.name }}
        </button>
      </div>
    </div>

    <div>
      <h3 class="pb-2 text-sm font-medium">Where it is made</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="c in CRAFT_CITIES"
          :key="c"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm ring-1 transition"
          :class="city === c
            ? 'bg-primary text-primary-foreground ring-primary'
            : 'bg-card ring-border hover:bg-muted'"
          @click="city = city === c ? '' : c"
        >
          {{ CITY_LABELS[c] }}
        </button>
      </div>
    </div>

    <div v-if="showSort">
      <h3 class="pb-2 text-sm font-medium">Sort by</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in SORTS"
          :key="option.value"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm ring-1 transition"
          :class="sort === option.value
            ? 'bg-primary text-primary-foreground ring-primary'
            : 'bg-card ring-border hover:bg-muted'"
          @click="sort = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <label
      v-if="showSort"
      class="flex cursor-pointer items-center justify-between rounded-md editorial-surface p-3"
    >
      <span>
        <span class="block text-sm font-medium">Made to order only</span>
        <span class="block text-xs text-muted-foreground">
          Pieces started after you buy, with a stated lead time
        </span>
      </span>
      <Switch v-model="madeToOrder" />
    </label>
  </div>
</template>
