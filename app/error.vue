<script setup lang="ts">
import { House, Search } from 'lucide-vue-next'
import type { NuxtError } from '#app'

/**
 * The branded error page.
 *
 * Without this file a bad listing URL fell through to Nuxt's own stock page,
 * titled "404 - Listing not found | Nuxt". The brand disappeared at exactly the
 * moment someone hit a dead link, and the only way onward was the back button.
 *
 * A 404 on a marketplace is usually a delisted piece, so the useful thing to
 * offer is the catalogue, not an apology.
 */
const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error?.statusCode === 404)

const heading = computed(() =>
  isNotFound.value ? 'That page has moved on' : 'Something went wrong',
)

const body = computed(() =>
  isNotFound.value
    ? 'The piece or workshop you were looking for is not here any more. It may have sold, or the shop may have taken it down.'
    : 'We could not load this page. It is worth trying again in a moment.',
)

useSeoMeta({ title: () => `${heading.value} · Likha Cebu` })
</script>

<template>
  <div class="min-h-dvh bg-background">
    <main
      class="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 pb-16 pt-safe lg:max-w-2xl"
    >
      <div class="relative isolate overflow-hidden rounded-2xl card-surface p-6 lg:p-10">
        <CraftPattern name="banig" tone="ink" :alpha="0.14" />

        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Likha Cebu
        </p>
        <h1 class="font-display mt-1 text-2xl font-semibold leading-tight lg:text-4xl">
          {{ heading }}
        </h1>
        <p class="prose-measure mt-2 text-sm leading-relaxed text-muted-foreground lg:text-base">
          {{ body }}
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" @click="clearError({ redirect: '/explore' })">
            <Search class="mr-1.5 size-4" />Browse the catalogue
          </Button>
          <Button size="lg" variant="outline" @click="clearError({ redirect: '/' })">
            <House class="mr-1.5 size-4" />Home
          </Button>
        </div>

        <!-- The status code is worth showing, but only as a footnote: it means
             something to whoever is debugging and nothing to a buyer. -->
        <p v-if="error?.statusCode" class="mt-6 text-xs text-muted-foreground">
          Error {{ error.statusCode }}
        </p>
      </div>
    </main>
  </div>
</template>
