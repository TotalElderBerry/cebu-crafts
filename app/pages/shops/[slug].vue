<script setup lang="ts">
import { Hammer, MapPin, MessageSquareQuote, Star, Users } from 'lucide-vue-next'
import { cityLabel } from '~/lib/cebu'

const route = useRoute()

const { data: shop, error } = await useApiFetch<any>(() => `/api/makers/${route.params.slug}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Shop not found', fatal: true })
}

const rating = computed(() => {
  const count = shop.value?.ratingCount ?? 0
  return count ? (shop.value.ratingSum ?? 0) / count : null
})

/**
 * Most taglines already end in the location ("Third-generation luthiers from
 * Abuno, Lapu-Lapu"), and the meta row printed the same place again on the very
 * next line. Drop the tagline when it is already saying where the workshop is.
 */
const tagline = computed(() => {
  const value = shop.value?.tagline
  if (!value) return null
  return value.toLowerCase().includes(cityLabel(shop.value.city).toLowerCase()) ? null : value
})

/** Workshops with no cover photo get their own craft's weave, see CraftFallback. */
const cover = computed(() => shop.value?.coverUrl ?? null)

const catalogueTitle = computed(() => {
  const count = shop.value?.products?.length ?? 0
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`
})

useSeoMeta({
  title: () => `${shop.value?.shopName ?? 'Workshop'} · Likha Cebu`,
  description: () => shop.value?.tagline,
  ogImage: () => shop.value?.coverUrl,
})
</script>

<template>
  <div v-if="shop">
    <AppHeader back transparent />

    <!-- Cover -->
    <div class="-mt-[calc(3.25rem+env(safe-area-inset-top,0px))]">
      <div class="h-40 bg-muted lg:h-56">
        <img
          v-if="cover"
          :src="cover"
          :alt="`${shop.shopName} workshop`"
          class="size-full object-cover"
        />
        <CraftFallback
          v-else
          :category="shop.craftCategories?.[0]"
          :seed="`${shop.slug}-workshop`"
          :label="`${shop.shopName} workshop`"
          :w="900"
          :h="400"
        />
      </div>
    </div>

    <div class="px-4">
      <div class="flex items-end gap-3">
        <ShopMark
          :name="shop.shopName"
          :logo-url="shop.logoUrl"
          size="lg"
          class="-mt-9 ring-4 ring-background"
        />
      </div>

      <div class="pt-2.5">
        <div class="flex items-center gap-1.5">
          <h1 class="text-xl font-semibold leading-tight">{{ shop.shopName }}</h1>
          <VerifiedMark v-if="shop.verification === 'verified'" size="md" />
        </div>
        <p v-if="tagline" class="pt-0.5 text-sm text-muted-foreground">{{ tagline }}</p>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <MapPin class="size-4" />
            {{ shop.barangay ? `${shop.barangay}, ` : '' }}{{ cityLabel(shop.city) }}
          </span>
          <span v-if="shop.artisanCount" class="flex items-center gap-1">
            <Users class="size-4" />{{ shop.artisanCount }} artisans
          </span>
          <span v-if="shop.yearsActive" class="flex items-center gap-1">
            <Hammer class="size-4" />{{ shop.yearsActive }} years
          </span>
          <span v-if="rating" class="flex items-center gap-1">
            <Star class="size-4 fill-warning text-warning" />{{ rating.toFixed(1) }}
          </span>
        </div>
      </div>

      <div v-if="shop.verification !== 'verified'" class="mt-3 rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        This workshop has not been verified yet. Verified shops have had their location and craft
        confirmed in person.
      </div>

      <!-- Custom / bulk CTA -->
      <NuxtLink
        v-if="shop.acceptsCustomOrders || shop.acceptsWholesale"
        :to="`/inquiries/new?maker=${shop.slug}`"
        class="mt-4 flex items-center gap-3 rounded-md editorial-surface p-3.5 transition active:scale-[0.99]"
      >
        <MessageSquareQuote class="size-5 shrink-0 text-accent" />
        <span class="flex-1">
          <span class="block text-sm font-semibold">
            {{ shop.acceptsWholesale ? 'Custom & wholesale enquiries' : 'Custom orders' }}
          </span>
          <span class="block text-xs text-muted-foreground">
            Send specs, get a written quote and lead time
          </span>
        </span>
      </NuxtLink>
    </div>

    <!--
      Story. The provenance is the whole pitch and this is the best copy in the
      product, so it gets the clearest setting on the page.

      The capiz lattice used to sit behind the paragraph itself. CraftPattern's
      own documentation says it is never placed behind body text, for the
      obvious reason: a weave under six lines of prose costs legibility and buys
      nothing. The pattern now runs behind the heading band only, and the story
      sits on a plain card at a readable measure.
    -->
    <section v-if="shop.story" class="editorial-story mt-6">
      <div class="py-4">
        <h2 class="font-display px-4 text-lg font-medium lg:px-0 lg:text-2xl">The workshop</h2>
      </div>
      <div class="px-4 lg:px-0">
        <p
          class="prose-measure editorial-surface whitespace-pre-line rounded-md p-4 text-sm leading-relaxed text-foreground selectable lg:p-6 lg:text-base"
        >
          {{ shop.story }}
        </p>
      </div>
    </section>

    <!--
      Location. Sits after the story and before the catalogue: it answers "is
      this really a Carcar workshop", which is the question the story just
      raised, and it is not what someone came to the page to buy.
    -->
    <ShopMap :shop-name="shop.shopName" :city="shop.city" :barangay="shop.barangay" />

    <!-- Catalogue -->
    <section class="pb-6 pt-6">
      <SectionHeading :title="catalogueTitle" />

      <div v-if="shop.products.length" class="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5 lg:px-0">
        <ProductCard v-for="product in shop.products" :key="product.id" :product="product" />
      </div>

      <EmptyState
        v-else
        title="Nothing listed yet"
        description="This workshop has not published any pieces."
      />
    </section>
  </div>
</template>
