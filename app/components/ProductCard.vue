<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { cityLabel } from '~/lib/cebu'
import { formatPeso } from '~/lib/utils'

const props = defineProps<{
  product: {
    slug: string
    title: string
    priceCentavos: number
    compareAtCentavos?: number | null
    images: string[]
    stock?: number
    isMadeToOrder?: boolean
    leadTimeDays?: number | null
    minOrderQty?: number
    ratingSum?: number
    ratingCount?: number
    category?: { slug: string } | null
    maker?: { shopName: string; slug: string; city: string; verification?: string } | null
  }
}>()

const rating = computed(() => {
  const count = props.product.ratingCount ?? 0
  return count ? (props.product.ratingSum ?? 0) / count : null
})

const soldOut = computed(
  () => !props.product.isMadeToOrder && (props.product.stock ?? 0) <= 0,
)

/** Listings with no photo get the woven fallback, see CraftFallback. */
const image = computed(() => props.product.images?.[0] ?? null)

/**
 * The shop line used to print "{shop} · {city}" unconditionally, which on a
 * truncated name rendered as "Mandaue… · Mandaue". Only add the city when the
 * shop name does not already carry it.
 */
const makerLocation = computed(() => {
  const maker = props.product.maker
  if (!maker) return null
  const city = cityLabel(maker.city)
  return maker.shopName.toLowerCase().includes(city.toLowerCase()) ? null : city
})
</script>

<template>
  <NuxtLink
    :to="`/products/${product.slug}`"
    class="group block overflow-hidden rounded-md editorial-surface transition active:scale-[0.98] lg:hover:shadow-elevation-2"
  >
    <div class="relative aspect-square overflow-hidden rounded-t-md bg-muted">
      <img
        v-if="image"
        :src="image"
        :alt="product.title"
        loading="lazy"
        decoding="async"
        class="size-full object-cover transition-transform duration-500 lg:group-hover:scale-[1.03]"
      />
      <CraftFallback
        v-else
        :category="product.category?.slug"
        :seed="product.slug"
        :label="product.title"
      />

      <span
        v-if="product.isMadeToOrder"
        class="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-[0.6875rem] font-medium"
      >
        Made to order
      </span>

      <span
        v-else-if="soldOut"
        class="absolute inset-0 grid place-items-center bg-background/70 text-sm font-semibold backdrop-blur-[2px]"
      >
        Sold out
      </span>

      <span
        v-if="(product.minOrderQty ?? 1) > 1"
        class="absolute bottom-2 left-2 rounded-md bg-primary/90 px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground"
      >
        Min {{ product.minOrderQty }}
      </span>
    </div>

    <div class="space-y-1 p-2.5 lg:p-3">
      <h3 class="line-clamp-2 text-sm font-medium leading-tight">
        {{ product.title }}
      </h3>

      <div class="flex items-baseline gap-1.5">
        <span class="text-base font-semibold text-primary-ink">
          {{ formatPeso(product.priceCentavos, { compact: true }) }}
        </span>
        <span
          v-if="product.compareAtCentavos && product.compareAtCentavos > product.priceCentavos"
          class="text-xs text-muted-foreground line-through"
        >
          {{ formatPeso(product.compareAtCentavos, { compact: true }) }}
        </span>
      </div>

      <div v-if="product.maker" class="flex items-center gap-1 text-xs text-muted-foreground">
        <VerifiedMark v-if="product.maker.verification === 'verified'" />
        <span class="truncate">{{ product.maker.shopName }}</span>
        <span v-if="makerLocation" class="shrink-0">· {{ makerLocation }}</span>
      </div>

      <div v-if="rating" class="flex items-center gap-0.5 text-xs text-muted-foreground">
        <Star class="size-3.5 fill-warning text-warning" />
        <span class="font-medium text-foreground">{{ rating.toFixed(1) }}</span>
        <span>({{ product.ratingCount }})</span>
      </div>
    </div>
  </NuxtLink>
</template>
