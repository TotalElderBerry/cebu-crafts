<script setup lang="ts">
import { ArrowRight, MessageSquareQuote, Search, TriangleAlert } from 'lucide-vue-next'

type Category = { id: string; slug: string; name: string; icon: string; productCount: number }

const { data: categories, error: categoriesError, refresh: rCats } = await useApiFetch<Category[]>('/api/categories')
const { data: makers, refresh: rMakers } = await useApiFetch<any[]>('/api/makers', {
  query: { verifiedOnly: 'true', limit: 6 },
})
const {
  data: newest,
  error: newestError,
  pending: newestPending,
  refresh: rNew,
} = await useApiFetch<{ items: any[] }>('/api/products', {
  query: { sort: 'newest', limit: 8 },
  lazy: true,
})
const {
  data: madeToOrder,
  pending: mtoPending,
  refresh: rMto,
} = await useApiFetch<{ items: any[] }>('/api/products', {
  query: { madeToOrder: 'true', sort: 'popular', limit: 7 },
  lazy: true,
})

// An empty catalogue and a broken API look identical on this page, which makes
// a misconfigured database very slow to diagnose. Say which one it is.
const loadError = computed(() => categoriesError.value ?? newestError.value)
const loadErrorMessage = computed(() =>
  loadError.value ? apiErrorMessage(loadError.value, 'Could not reach the server.') : null,
)

/** The lead tile in "Made to order" is the first item; the rest support it. */
const mtoLead = computed(() => madeToOrder.value?.items?.[0] ?? null)
const mtoRest = computed(() => madeToOrder.value?.items?.slice(1) ?? [])

/** Pull-to-refresh reloads every rail at once rather than one at a time. */
async function refreshAll() {
  await Promise.all([rCats(), rMakers(), rNew(), rMto()])
}

useSeoMeta({
  title: 'Likha Cebu · buy directly from Cebu craft makers',
  description:
    'Guitars from Abuno, shoes from Carcar, rattan from Mandaue, shellcraft from Olango. Order direct from the workshop, no middleman.',
})
</script>

<template>
  <PullToRefresh @refresh="refreshAll">
    <!-- =====================================================================
         Hero.

         Phone: a full-bleed photograph with the headline sitting on the solid
         end of a bottom-up scrim. The phone hero previously had no image at all
         (eyebrow, headline, search pill on flat grey), which on a marketplace
         selling handmade objects is the one thing the top of the page cannot
         afford. The text never sits on the photograph itself: the gradient is
         fully opaque behind the copy, so contrast does not depend on how dark
         the picture happens to be.

         Desktop: an asymmetric split. The top nav already carries a search box
         there, so the pill would be a second one, and the space goes to the
         photograph and the two real entry points instead.
         ===================================================================== -->
    <header class="relative isolate lg:pt-0">
      <!-- Phone hero -->
      <div class="relative overflow-hidden lg:hidden">
        <div class="relative h-[18rem]">
          <img
            src="/listings/hero.webp"
            alt="A Cebu workshop bench mid-build"
            width="800"
            height="960"
            fetchpriority="high"
            class="size-full object-cover object-[52%_42%] brightness-[0.88] saturate-[1.12]"
          />
        </div>

        <div class="relative bg-foreground px-4 pb-5 pt-4 text-background">
          <p class="text-xs font-medium uppercase tracking-wider text-background/65">
            Likha Cebu
          </p>
          <h1 class="font-display mt-0.5 max-w-none text-[2rem] font-semibold leading-[1.1] tracking-tight">
            <span class="block">Straight from the</span>
            <span class="block">workshop</span>
          </h1>
          <p class="mt-2 max-w-[30rem] text-sm leading-relaxed text-background/75">
            Guitars from Abuno, shoes from Carcar, rattan from Mandaue. Ordered direct.
          </p>

          <NuxtLink
            to="/explore"
            class="mt-4 flex min-h-11 items-center gap-2 rounded-md bg-background px-3.5 text-sm font-medium text-foreground shadow-elevation-1 ring-1 ring-background/20 transition active:scale-[0.98]"
          >
            <Search class="size-4" />
            Search guitars, sandals, rattan…
          </NuxtLink>
        </div>
      </div>

      <!-- Desktop hero -->
      <div class="relative isolate hidden lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-8 lg:pt-10">
        <div class="lg:col-span-7">
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Likha Cebu
          </p>
          <h1 class="font-display mt-2 max-w-[8ch] text-6xl font-semibold leading-[1.02]">
            <span class="block">Straight from the</span>
            <span class="block">workshop</span>
          </h1>
          <p class="prose-measure mt-3 text-lg leading-relaxed text-muted-foreground">
            Guitars from Abuno, shoes from Carcar, rattan from Mandaue. Ordered direct from the
            workshop that made them.
          </p>

          <div class="mt-6 flex items-center gap-3">
            <Button as-child size="lg">
              <NuxtLink to="/explore">Browse the catalogue</NuxtLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <NuxtLink to="/inquiries/new">Request a custom order</NuxtLink>
            </Button>
          </div>
        </div>

        <div class="lg:col-span-5">
          <img
            src="/listings/hero.webp"
            alt="A Cebu workshop bench mid-build"
            width="800"
            height="960"
            class="aspect-[5/6] w-full rounded-md object-cover shadow-elevation-3"
          />
        </div>
      </div>
    </header>

    <!-- Loading the catalogue failed. Almost always DATABASE_URL. -->
    <section v-if="loadErrorMessage" class="px-4 py-3 lg:px-0">
      <div class="rounded-xl bg-destructive/10 p-4 ring-1 ring-destructive/25">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <TriangleAlert class="size-4 text-destructive" />Could not load the catalogue
        </h2>
        <p class="prose-measure mt-1 text-sm leading-relaxed text-muted-foreground">
          {{ loadErrorMessage }}
        </p>
        <p class="prose-measure mt-2 text-xs leading-relaxed text-muted-foreground">
          If you have just edited <code>.env</code>, restart the dev server. Nuxt reads it once at
          startup.
        </p>
      </div>
    </section>

    <!-- Categories: a scroll strip on a phone, a wrapped set on desktop where
         there is room for all eleven without hiding any behind a swipe. -->
    <section class="pb-2 lg:pb-0 lg:pt-2">
      <div
        class="editorial-rule no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 pt-1 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
      >
        <NuxtLink
          v-for="category in categories"
          :key="category.id"
          :to="`/explore?category=${category.slug}`"
          class="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground transition active:scale-95 hover:border-primary hover:text-foreground"
        >
          <CategoryIcon :name="category.icon" class="size-4 text-primary-ink" />
          {{ category.name }}
          <span class="text-xs text-muted-foreground">{{ category.productCount }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- =====================================================================
         Why-this-exists, paired with the custom order route. On desktop these
         sit side by side, which puts the product's actual differentiator (a
         written quote instead of a Messenger thread) in the first screenful
         rather than four rails down.
         ===================================================================== -->
    <RevealOnScroll>
      <section class="py-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 lg:py-10">
        <!--
          These two used to be identical tinted cards stacked on top of each
          other, which gave the reader no idea which one mattered. Only one of
          them is an action. So the pitch is now plain type under a hairline,
          and the enquiry is the only card in the section.
        -->
        <div class="border-t border-border px-4 pt-4 lg:col-span-5 lg:border-0 lg:px-0 lg:pt-0">
          <h2 class="font-display text-base font-semibold lg:text-2xl">Why order here</h2>
          <p class="prose-measure mt-1.5 text-sm leading-relaxed text-muted-foreground lg:mt-3 lg:text-base">
            Cebu craft usually reaches you through an exporter, a stall, or a reseller, and the
            maker sees a fraction of what you paid. Every shop here is the workshop itself.
          </p>
        </div>

        <div class="mt-5 px-4 lg:col-span-7 lg:mt-0 lg:px-0">
          <NuxtLink
            to="/inquiries/new"
            class="flex items-start gap-3 rounded-md editorial-surface p-4 transition active:scale-[0.99] lg:p-6 lg:hover:border-primary/40"
          >
            <MessageSquareQuote class="mt-0.5 size-5 shrink-0 text-primary-ink" />
            <div>
              <h2 class="font-display text-sm font-semibold lg:text-xl">
                Need something custom, or in bulk?
              </h2>
              <p class="prose-measure mt-0.5 text-sm leading-relaxed text-muted-foreground lg:mt-2 lg:text-base">
                Send a workshop your specs and they will quote a price and a lead time. The same
                conversation that usually happens over Messenger, with the quote written down.
              </p>
              <span class="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-primary-ink">
                Request a custom order <ArrowRight class="size-4" />
              </span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </RevealOnScroll>

    <!-- Verified makers: a snap rail on a phone, a real grid on desktop. -->
    <RevealOnScroll>
      <section class="py-3 lg:py-10">
        <SectionHeading title="Verified workshops" to="/explore?view=shops" link-label="All shops" />

        <!-- scroll-px-4 matches px-4. Without it, snap-mandatory aligns the first
             card to the raw scroll-port edge, scrolling away the left padding and
             leaving the card flush against the screen while every other section
             stays inset. -->
        <div
          class="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0"
        >
          <div
            v-for="maker in makers"
            :key="maker.id"
            class="w-[17rem] shrink-0 snap-start lg:w-auto"
          >
            <MakerCard :maker="maker" />
          </div>
        </div>
      </section>
    </RevealOnScroll>

    <!-- Just listed: a plain catalogue grid. -->
    <RevealOnScroll>
      <section class="py-3 lg:py-10">
        <SectionHeading title="Just listed" to="/explore?sort=newest" />
        <div class="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5 lg:px-0">
          <template v-if="newestPending && !newest">
            <ProductCardSkeleton v-for="i in 8" :key="i" />
          </template>
          <ProductCard v-for="product in newest?.items" v-else :key="product.id" :product="product" />
        </div>
      </section>
    </RevealOnScroll>

    <!-- =====================================================================
         Made to order. Deliberately NOT the same grid as "Just listed": one
         lead tile carrying the commission story, with the rest supporting it.
         Two identical product grids in a row was the flattest part of the page.
         ===================================================================== -->
    <RevealOnScroll>
      <section class="py-3 lg:py-10">
        <SectionHeading title="Made to order" to="/explore?madeToOrder=true" />

        <div v-if="mtoPending && !madeToOrder" class="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:gap-5 lg:px-0">
          <ProductCardSkeleton v-for="i in 6" :key="i" />
        </div>

        <div v-else class="px-4 lg:px-0">
          <div class="grid gap-3 lg:grid-cols-12 lg:gap-5">
            <div v-if="mtoLead" class="lg:col-span-5">
              <ProductCard :product="mtoLead" />
            </div>
            <div class="grid grid-cols-2 gap-3 lg:col-span-7 lg:grid-cols-3 lg:gap-5">
              <ProductCard v-for="product in mtoRest" :key="product.id" :product="product" />
            </div>
          </div>
        </div>
      </section>
    </RevealOnScroll>

    <p class="px-4 py-8 text-center text-xs text-muted-foreground lg:py-12">
      Likha Cebu · built for Cebu's craft makers
    </p>
  </PullToRefresh>
</template>
