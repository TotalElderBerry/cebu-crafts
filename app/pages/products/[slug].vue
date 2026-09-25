<script setup lang="ts">
import {
  BadgeCheck,
  Clock,
  MapPin,
  Minus,
  Package,
  Plus,
  Ruler,
  Star,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { cityLabel } from '~/lib/cebu'
import { formatPeso, leadTimeLabel, relativeTime } from '~/lib/utils'

const route = useRoute()
const cart = useCart()
const { $haptic } = useNuxtApp()

const { data: product, error } = await useApiFetch<any>(() => `/api/products/${route.params.slug}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Listing not found', fatal: true })
}

const activeImage = ref(0)
const selectedVariantId = ref<string | null>(null)
const quantity = ref(product.value?.minOrderQty ?? 1)

const selectedVariant = computed(
  () => product.value?.variants?.find((v: any) => v.id === selectedVariantId.value) ?? null,
)

const unitPrice = computed(
  () => (product.value?.priceCentavos ?? 0) + (selectedVariant.value?.priceDeltaCentavos ?? 0),
)

const rating = computed(() => {
  const count = product.value?.ratingCount ?? 0
  return count ? (product.value.ratingSum ?? 0) / count : null
})

const soldOut = computed(
  () => !product.value?.isMadeToOrder && (product.value?.stock ?? 0) <= 0,
)

const maxQuantity = computed(() =>
  product.value?.isMadeToOrder ? 999 : Math.max(product.value?.stock ?? 0, 0),
)

function addToCart() {
  if (!product.value) return

  cart.add(
    {
      productId: product.value.id,
      variantId: selectedVariant.value?.id ?? null,
      title: product.value.title,
      slug: product.value.slug,
      image: product.value.images?.[0] ?? null,
      variantName: selectedVariant.value?.name ?? null,
      priceCentavos: unitPrice.value,
      minOrderQty: product.value.minOrderQty ?? 1,
      makerName: product.value.maker.shopName,
      makerSlug: product.value.maker.slug,
      leadTimeDays: product.value.leadTimeDays ?? null,
    },
    quantity.value,
  )

  $haptic.success()
  toast.success('Added to cart', { description: product.value.title })
}

// Resolved once here, not inside the head getters: see useSeo.ts.
const abs = useAbsoluteUrl()

useSeoMeta({
  title: () => `${product.value?.title ?? 'Listing'} · Likha Cebu`,
  description: () => product.value?.description?.slice(0, 160),
  ogImage: () => abs(product.value?.images?.[0]),
})

/**
 * Product + Offer structured data.
 *
 * This is what produces a price and an availability line in a search result,
 * and it is the single highest-value piece of SEO for a marketplace whose
 * premise is buyers finding makers through search. There was none on the site.
 */
useJsonLd(() =>
  product.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.value.title,
        description: product.value.description ?? undefined,
        image: (product.value.images ?? []).map((i: string) => abs(i)),
        sku: product.value.slug,
        brand: product.value.maker
          ? { '@type': 'Brand', name: product.value.maker.shopName }
          : undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PHP',
          // schema.org wants a decimal string, and prices are stored in centavos.
          price: (product.value.priceCentavos / 100).toFixed(2),
          availability: product.value.isMadeToOrder
            ? 'https://schema.org/PreOrder'
            : (product.value.stock ?? 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          url: abs(`/products/${product.value.slug}`),
          seller: product.value.maker
            ? { '@type': 'Organization', name: product.value.maker.shopName }
            : undefined,
        },
      }
    : null,
)
</script>

<template>
  <div v-if="product">
    <AppHeader back transparent />

    <!--
      Desktop splits into gallery | buy column. Everything below simply flows
      into the right-hand column at `lg`, so there is one template rather than
      two competing ones.
    -->
    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10 lg:pt-4">
      <!-- Gallery -->
      <div
        class="-mt-[calc(3.25rem+env(safe-area-inset-top,0px))] lg:sticky lg:top-20 lg:mt-0"
      >
        <div
          class="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:hidden"
          @scroll="(e) => {
            const el = e.target as HTMLElement
            activeImage = Math.round(el.scrollLeft / el.clientWidth)
          }"
        >
          <img
            v-for="(image, index) in product.images"
            :key="image"
            :src="image"
            :alt="`${product.title}, photo ${index + 1}`"
            class="aspect-square w-full shrink-0 snap-center object-cover"
          />
        </div>

        <div v-if="product.images.length > 1" class="flex justify-center gap-1.5 py-2.5 lg:hidden">
          <span
            v-for="(_, index) in product.images"
            :key="index"
            class="size-1.5 rounded-full transition-colors"
            :class="index === activeImage ? 'bg-primary' : 'bg-border'"
          />
        </div>

        <!-- Desktop shows the set at once. Swiping is a touch idiom; on a
             pointer device hiding photos behind a horizontal scroll just
             loses them. -->
        <div class="hidden lg:grid lg:grid-cols-2 lg:gap-3">
          <img
            v-for="(image, index) in product.images"
            :key="`d-${image}`"
            :src="image"
            :alt="`${product.title}, photo ${index + 1}`"
            class="aspect-square w-full rounded-md object-cover"
            :class="index === 0 && product.images.length > 1 ? 'col-span-2' : ''"
          />
        </div>
      </div>

      <!-- Right-hand column on desktop: everything that is not the gallery. -->
      <div class="lg:min-w-0">

    <!-- Title + price -->
    <section class="space-y-2 px-4 pt-2 lg:px-0 lg:pt-0">
      <div class="flex flex-wrap items-center gap-1.5">
        <Badge v-if="product.isMadeToOrder" variant="secondary">
          <Clock class="mr-1 size-3" />{{ leadTimeLabel(product.leadTimeDays) }}
        </Badge>
        <Badge v-else-if="soldOut" variant="outline">Sold out</Badge>
        <Badge v-else variant="secondary">{{ product.stock }} in stock</Badge>
        <Badge v-if="product.minOrderQty > 1">Min order {{ product.minOrderQty }}</Badge>
      </div>

      <h1 class="text-xl font-semibold leading-snug">{{ product.title }}</h1>

      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-semibold text-primary-ink">{{ formatPeso(unitPrice, { compact: true }) }}</span>
        <span
          v-if="product.compareAtCentavos && product.compareAtCentavos > unitPrice"
          class="text-sm text-muted-foreground line-through"
        >
          {{ formatPeso(product.compareAtCentavos, { compact: true }) }}
        </span>
      </div>

      <div v-if="rating" class="flex items-center gap-1 text-sm">
        <Star class="size-4 fill-warning text-warning" />
        <span class="font-medium">{{ rating.toFixed(1) }}</span>
        <span class="text-muted-foreground">· {{ product.ratingCount }} reviews</span>
      </div>
    </section>

    <!-- Variants -->
    <section v-if="product.variants?.length" class="px-4 pt-4 lg:px-0">
      <h2 class="pb-2 text-sm font-medium">Options</h2>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="variant in product.variants"
          :key="variant.id"
          type="button"
          class="rounded-md px-3 py-2 text-sm ring-1 transition active:scale-95"
          :class="selectedVariantId === variant.id
            ? 'bg-primary text-primary-foreground ring-primary'
            : 'bg-card ring-border'"
          @click="selectedVariantId = selectedVariantId === variant.id ? null : variant.id"
        >
          {{ variant.name }}
          <span v-if="variant.priceDeltaCentavos" class="opacity-70">
            {{ variant.priceDeltaCentavos > 0 ? '+' : '' }}{{ formatPeso(variant.priceDeltaCentavos, { compact: true }) }}
          </span>
        </button>
      </div>
    </section>

    <!-- Maker -->
    <section class="px-4 pt-5 lg:px-0">
      <NuxtLink
        :to="`/shops/${product.maker.slug}`"
        class="flex items-center gap-3 rounded-md editorial-surface p-3 transition active:scale-[0.99]"
      >
        <img
          v-if="product.maker.logoUrl"
          :src="product.maker.logoUrl"
          :alt="product.maker.shopName"
          class="size-11 shrink-0 rounded-md object-cover"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <span class="truncate text-sm font-semibold">{{ product.maker.shopName }}</span>
            <BadgeCheck
              v-if="product.maker.verification === 'verified'"
              class="size-4 shrink-0 text-accent"
            />
          </div>
          <span class="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin class="size-3" />
            {{ product.maker.barangay ? `${product.maker.barangay}, ` : '' }}{{ cityLabel(product.maker.city) }}
            <template v-if="product.maker.yearsActive">
              · {{ product.maker.yearsActive }} years
            </template>
          </span>
        </div>
        <span class="text-sm text-primary-ink">Visit</span>
      </NuxtLink>
    </section>

    <!-- Description -->
    <section class="px-4 pt-5 lg:px-0">
      <h2 class="pb-1.5 font-semibold">About this listing</h2>
      <p class="whitespace-pre-line text-sm leading-relaxed text-muted-foreground selectable">
        {{ product.description }}
      </p>
    </section>

    <!-- Specs -->
    <section class="px-4 pt-5 lg:px-0">
      <h2 class="pb-2 font-semibold">Details</h2>
      <dl class="grid gap-2 sm:grid-cols-2">
        <div v-if="product.materials?.length" class="editorial-surface flex gap-3 rounded-md p-3">
          <dt class="flex w-28 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Package class="size-4" />Materials
          </dt>
          <dd class="text-sm">{{ product.materials.join(', ') }}</dd>
        </div>
        <div v-if="product.dimensions" class="editorial-surface flex gap-3 rounded-md p-3">
          <dt class="flex w-28 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Ruler class="size-4" />Size
          </dt>
          <dd class="text-sm">{{ product.dimensions }}</dd>
        </div>
        <div v-if="product.isMadeToOrder" class="editorial-surface flex gap-3 rounded-md p-3">
          <dt class="flex w-28 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Clock class="size-4" />Lead time
          </dt>
          <dd class="text-sm">
            About {{ product.leadTimeDays }} days. This piece is started after you order.
          </dd>
        </div>
      </dl>
    </section>

    <!-- Custom / bulk -->
    <section v-if="product.maker.acceptsCustomOrders || product.maker.acceptsWholesale" class="px-4 pt-5 lg:px-0">
      <NuxtLink
        :to="`/inquiries/new?maker=${product.maker.slug}&product=${product.id}`"
        class="block rounded-md editorial-surface p-3.5 transition active:scale-[0.99]"
      >
        <span class="block text-sm font-semibold">Want it different, or want many?</span>
        <span class="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
          Message {{ product.maker.shopName }} with your specs and they will send a written quote
          with a lead time.
        </span>
      </NuxtLink>
    </section>

    <!-- Reviews -->
    <section v-if="product.reviews?.length" class="px-4 pt-5 lg:px-0">
      <h2 class="pb-2 font-semibold">Reviews</h2>
      <ul class="space-y-3">
        <li
          v-for="review in product.reviews"
          :key="review.id"
          class="rounded-md editorial-surface p-3"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ review.buyerName }}</span>
            <span class="flex items-center gap-0.5">
              <Star
                v-for="n in 5"
                :key="n"
                class="size-3.5"
                :class="n <= review.rating ? 'fill-warning text-warning' : 'text-border'"
              />
            </span>
            <span class="ml-auto text-xs text-muted-foreground">
              {{ relativeTime(review.createdAt) }}
            </span>
          </div>
          <p v-if="review.body" class="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {{ review.body }}
          </p>
        </li>
      </ul>
    </section>

      <!-- Desktop: the buy action lives in the column, not pinned to the
           viewport floor. A fixed bar across a 1152px page is a phone habit. -->
      <div class="editorial-product-buy hidden lg:mt-6 lg:block">
        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-md ring-1 ring-border">
            <button
              type="button"
              class="grid size-10 place-items-center rounded-l-md transition hover:bg-muted disabled:opacity-40"
              :disabled="quantity <= (product.minOrderQty ?? 1)"
              aria-label="Decrease quantity"
              @click="quantity--"
            >
              <Minus class="size-4" />
            </button>
            <span class="min-w-9 text-center text-sm font-medium tabular-nums">{{ quantity }}</span>
            <button
              type="button"
              class="grid size-10 place-items-center rounded-r-md transition hover:bg-muted disabled:opacity-40"
              :disabled="quantity >= maxQuantity"
              aria-label="Increase quantity"
              @click="quantity++"
            >
              <Plus class="size-4" />
            </button>
          </div>
          <Button class="h-11 flex-1 text-base" :disabled="soldOut" @click="addToCart">
            {{ soldOut ? 'Sold out' : `Add · ${formatPeso(unitPrice * quantity, { compact: true })}` }}
          </Button>
        </div>
      </div>
    </div>
    </div>

    <!-- More from this shop. Full width below the split, not squeezed into the
         buy column. -->
    <section v-if="product.related?.length" class="pt-6 lg:pt-12">
      <SectionHeading :title="`More from ${product.maker.shopName}`" />
      <div class="no-scrollbar flex gap-3 overflow-x-auto px-4 lg:grid lg:grid-cols-6 lg:gap-5 lg:px-0">
        <div v-for="item in product.related" :key="item.id" class="w-36 shrink-0 lg:w-auto">
          <ProductCard :product="item" />
        </div>
      </div>
    </section>

    <div class="h-28 lg:hidden" />

    <!-- Sticky buy bar -->
    <div
      class="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-border bg-background/95 backdrop-blur-lg lg:hidden"
    >
      <div class="mx-auto flex max-w-lg items-center gap-2 p-3">
        <div class="flex items-center rounded-md ring-1 ring-border">
          <button
            type="button"
            class="grid size-10 place-items-center rounded-l-md transition active:bg-muted disabled:opacity-40"
            :disabled="quantity <= (product.minOrderQty ?? 1)"
            aria-label="Decrease quantity"
            @click="quantity--; $haptic.light()"
          >
            <Minus class="size-4" />
          </button>
          <span class="min-w-9 text-center text-sm font-medium tabular-nums">{{ quantity }}</span>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-r-md transition active:bg-muted disabled:opacity-40"
            :disabled="quantity >= maxQuantity"
            aria-label="Increase quantity"
            @click="quantity++; $haptic.light()"
          >
            <Plus class="size-4" />
          </button>
        </div>

        <Button class="h-11 flex-1 text-base" :disabled="soldOut" @click="addToCart">
          {{ soldOut ? 'Sold out' : `Add · ${formatPeso(unitPrice * quantity, { compact: true })}` }}
        </Button>
      </div>
    </div>
  </div>
</template>
