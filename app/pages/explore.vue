<script setup lang="ts">
import { Search, SlidersHorizontal, X } from 'lucide-vue-next'
import { CITY_LABELS, CRAFT_CITIES } from '~/lib/cebu'

const route = useRoute()
const router = useRouter()

const view = ref<'products' | 'shops'>((route.query.view as 'shops') === 'shops' ? 'shops' : 'products')
const search = ref((route.query.q as string) ?? '')
const category = ref((route.query.category as string) ?? '')
const city = ref((route.query.city as string) ?? '')
const madeToOrder = ref(route.query.madeToOrder === 'true')
const sort = ref((route.query.sort as string) ?? 'newest')
const filtersOpen = ref(false)

// Debounced so a search does not fire a request per keystroke on mobile data.
const debouncedSearch = refDebounced(search, 350)

const { data: categories } = await useApiFetch<any[]>('/api/categories')

const productQuery = computed(() => ({
  q: debouncedSearch.value || undefined,
  category: category.value || undefined,
  city: city.value || undefined,
  madeToOrder: madeToOrder.value ? 'true' : undefined,
  sort: sort.value,
  limit: 24,
}))

const { data: products, status: productStatus } = await useApiFetch<{ items: any[]; total: number }>(
  '/api/products',
  { query: productQuery, watch: [productQuery] },
)

const shopQuery = computed(() => ({
  q: debouncedSearch.value || undefined,
  city: city.value || undefined,
  craft: category.value || undefined,
  limit: 24,
}))

const { data: shops, status: shopStatus } = await useApiFetch<any[]>('/api/makers', {
  query: shopQuery,
  watch: [shopQuery],
})

const activeFilterCount = computed(
  () => [category.value, city.value, madeToOrder.value ? 'mto' : ''].filter(Boolean).length,
)

// Keep the URL in step so a filtered view can be shared or restored on back.
watchEffect(() => {
  router.replace({
    query: {
      ...(view.value === 'shops' ? { view: 'shops' } : {}),
      ...(search.value ? { q: search.value } : {}),
      ...(category.value ? { category: category.value } : {}),
      ...(city.value ? { city: city.value } : {}),
      ...(madeToOrder.value ? { madeToOrder: 'true' } : {}),
      ...(sort.value !== 'newest' ? { sort: sort.value } : {}),
    },
  })
})

function clearFilters() {
  category.value = ''
  city.value = ''
  madeToOrder.value = false
  sort.value = 'newest'
}

useSeoMeta({ title: 'Explore · Likha Cebu' })

// /explore takes q, category, sort, madeToOrder and view in free combination,
// so the facet space generates an unbounded number of near-duplicate URLs. They
// all point back at the unfiltered page.
useCanonical(() => '/explore')
</script>

<template>
  <div>
    <AppHeader>
      <template #title>
        <div class="flex-1 pr-1">
          <label class="relative block">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="search"
              type="search"
              enterkeyhint="search"
              placeholder="Search crafts or workshops"
              class="h-10 w-full rounded-md bg-background pl-9 pr-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </template>

      <template #actions>
        <button
          type="button"
          class="relative grid size-10 place-items-center rounded-md transition active:scale-90 active:bg-muted lg:hidden"
          aria-label="Filters"
          @click="filtersOpen = true"
        >
          <SlidersHorizontal class="size-5" />
          <span
            v-if="activeFilterCount"
            class="absolute right-1 top-1 size-2 rounded-full bg-primary"
          />
        </button>
      </template>

      <template #below>
        <div class="editorial-tabs flex gap-5 px-3 pb-2">
          <button
            v-for="tab in (['products', 'shops'] as const)"
            :key="tab"
            type="button"
            class="border-b-2 border-transparent px-0.5 py-1.5 text-sm font-medium capitalize transition-colors"
            :class="view === tab ? 'border-primary text-primary-ink' : 'text-muted-foreground hover:text-foreground'"
            @click="view = tab"
          >
            {{ tab }}
          </button>
        </div>
      </template>
    </AppHeader>

    <div class="lg:flex lg:gap-8 lg:pt-4">
      <!-- Desktop: filters are always visible. A sheet you must open to see
           what is applied is a small-screen compromise, not a preference. -->
      <aside class="hidden shrink-0 lg:block lg:w-64">
        <div class="editorial-filter-rail sticky top-20">
          <div class="flex items-baseline justify-between pb-3">
            <h2 class="font-display text-lg font-medium">Filters</h2>
            <button
              v-if="activeFilterCount"
              type="button"
              class="text-sm text-primary-ink hover:underline"
              @click="clearFilters"
            >
              Clear
            </button>
          </div>
          <ExploreFilters
            v-model:category="category"
            v-model:city="city"
            v-model:sort="sort"
            v-model:made-to-order="madeToOrder"
            :categories="categories"
            :show-sort="view === 'products'"
          />
        </div>
      </aside>

      <div class="min-w-0 flex-1">
    <!-- Active filter chips -->
    <div v-if="activeFilterCount" class="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5 lg:hidden">
      <button
        v-if="category"
        class="flex shrink-0 items-center gap-1 rounded-md bg-primary/12 px-3 py-1 text-xs font-medium text-primary-ink"
        @click="category = ''"
      >
        {{ categories?.find((c) => c.slug === category)?.name ?? category }}
        <X class="size-3" />
      </button>
      <button
        v-if="city"
        class="flex shrink-0 items-center gap-1 rounded-md bg-primary/12 px-3 py-1 text-xs font-medium text-primary-ink"
        @click="city = ''"
      >
        {{ CITY_LABELS[city] }} <X class="size-3" />
      </button>
      <button
        v-if="madeToOrder"
        class="flex shrink-0 items-center gap-1 rounded-md bg-primary/12 px-3 py-1 text-xs font-medium text-primary-ink"
        @click="madeToOrder = false"
      >
        Made to order <X class="size-3" />
      </button>
    </div>

    <!-- Products -->
    <div v-if="view === 'products'" class="px-4 pb-6 pt-2 lg:px-0">
      <div v-if="productStatus === 'pending'" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        <Skeleton v-for="n in 6" :key="n" class="aspect-[3/4] rounded-md" />
      </div>

      <template v-else-if="products?.items?.length">
        <p class="pb-3 text-xs text-muted-foreground">{{ products.total }} results</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          <ProductCard v-for="product in products.items" :key="product.id" :product="product" />
        </div>
      </template>

      <EmptyState
        v-else
        title="Nothing matches yet"
        description="Try a broader search, or clear the filters."
        action-label="Clear filters"
        @action="clearFilters"
      />
    </div>

    <!-- Shops -->
    <div v-else class="space-y-3 px-4 pb-6 pt-2 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:px-0">
      <div v-if="shopStatus === 'pending'" class="space-y-3">
        <Skeleton v-for="n in 4" :key="n" class="h-36 rounded-md" />
      </div>

      <template v-else-if="shops?.length">
        <MakerCard v-for="maker in shops" :key="maker.id" :maker="maker" />
      </template>

      <EmptyState
        v-else
        title="No workshops found"
        description="Try a different craft or city."
        action-label="Clear filters"
        @action="clearFilters"
      />
    </div>
      </div>
    </div>

    <!-- Filter sheet, phone only -->
    <Sheet v-model:open="filtersOpen">
      <SheetContent side="bottom" class="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader class="text-left">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div class="space-y-5 px-4 pb-6">
          <ExploreFilters
            v-model:category="category"
            v-model:city="city"
            v-model:sort="sort"
            v-model:made-to-order="madeToOrder"
            :categories="categories"
            :show-sort="view === 'products'"
          />

          <div class="flex gap-2">
            <Button variant="outline" class="flex-1" @click="clearFilters">Clear</Button>
            <Button class="flex-1" @click="filtersOpen = false">Show results</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
