<script setup lang="ts">
import { MapPin, Star, Users } from 'lucide-vue-next'
import { cityLabel } from '~/lib/cebu'

const props = defineProps<{
  maker: {
    slug: string
    shopName: string
    tagline?: string | null
    city: string
    barangay?: string | null
    logoUrl?: string | null
    coverUrl?: string | null
    craftCategories?: string[] | null
    artisanCount?: number | null
    yearsActive?: number | null
    verification?: string
    ratingSum?: number
    ratingCount?: number
    productCount?: number
  }
}>()

const rating = computed(() => {
  const count = props.maker.ratingCount ?? 0
  return count ? (props.maker.ratingSum ?? 0) / count : null
})

const cover = computed(() => props.maker.coverUrl ?? null)

const place = computed(
  () => `${props.maker.barangay ? `${props.maker.barangay}, ` : ''}${cityLabel(props.maker.city)}`,
)

/**
 * Most taglines already end in the location ("Third-generation luthiers from
 * Abuno, Lapu-Lapu"), and the meta row printed it again directly underneath.
 * Drop the tagline when it is already saying where the workshop is.
 */
const tagline = computed(() => {
  const value = props.maker.tagline
  if (!value) return null
  return value.toLowerCase().includes(cityLabel(props.maker.city).toLowerCase()) ? null : value
})
</script>

<template>
  <NuxtLink
    :to="`/shops/${maker.slug}`"
    class="group block overflow-hidden rounded-md editorial-surface transition active:scale-[0.99] lg:hover:shadow-elevation-2"
  >
    <div class="relative h-32 overflow-hidden rounded-t-md bg-muted">
      <img
        v-if="cover"
        :src="cover"
        :alt="`${maker.shopName} workshop`"
        loading="lazy"
        decoding="async"
        class="size-full object-cover transition-transform duration-500 lg:group-hover:scale-[1.03]"
      />
      <CraftFallback
        v-else
        :category="maker.craftCategories?.[0]"
        :seed="`${maker.slug}-workshop`"
        :label="`${maker.shopName} workshop`"
        :w="900"
        :h="400"
      />
    </div>

    <div class="flex gap-3 p-3">
      <ShopMark
        :name="maker.shopName"
        :logo-url="maker.logoUrl"
        size="md"
      />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1">
          <h3 class="truncate font-semibold leading-tight">{{ maker.shopName }}</h3>
          <VerifiedMark v-if="maker.verification === 'verified'" />
        </div>

        <p v-if="tagline" class="line-clamp-1 text-xs text-muted-foreground">
          {{ tagline }}
        </p>

        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            <MapPin class="size-3.5" />
            {{ place }}
          </span>
          <span v-if="maker.artisanCount" class="flex items-center gap-1">
            <Users class="size-3.5" />
            {{ maker.artisanCount }} {{ maker.artisanCount === 1 ? 'artisan' : 'artisans' }}
          </span>
          <span v-if="rating" class="flex items-center gap-1">
            <Star class="size-3.5 fill-warning text-warning" />
            {{ rating.toFixed(1) }}
          </span>
          <span v-if="maker.productCount !== undefined">{{ maker.productCount }} listings</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
