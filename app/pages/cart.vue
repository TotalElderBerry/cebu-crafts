<script setup lang="ts">
import { Clock, Minus, Plus, ShoppingBag, Store, Trash2 } from 'lucide-vue-next'
import { formatPeso, leadTimeLabel } from '~/lib/utils'

const cart = useCart()
const { loggedIn } = useUserSession()
const { $haptic } = useNuxtApp()

// The longest lead time in the basket is what the buyer actually waits for, so
// say that up front rather than letting them discover it after paying.
const longestLeadTime = computed(() =>
  cart.lines.value.reduce((max, line) => Math.max(max, line.leadTimeDays ?? 0), 0),
)

useSeoMeta({ title: 'Cart · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="Cart" />

    <EmptyState
      v-if="cart.isEmpty.value"
      title="Your cart is empty"
      description="Browse the workshops and add something made by hand."
      action-label="Explore crafts"
      action-to="/explore"
    >
    </EmptyState>

    <template v-else>
      <div class="space-y-4 p-4">
        <!-- Grouped by shop: each maker crafts and ships on their own clock. -->
        <section
          v-for="group in cart.byMaker.value"
          :key="group.makerSlug"
          class="overflow-hidden rounded-md editorial-surface"
        >
          <NuxtLink
            :to="`/shops/${group.makerSlug}`"
            class="flex items-center gap-2 border-b border-border px-3 py-2.5 text-sm font-medium"
          >
            <Store class="size-4 text-muted-foreground" />
            {{ group.makerName }}
          </NuxtLink>

          <ul class="divide-y divide-border">
            <li
              v-for="line in group.lines"
              :key="`${line.productId}:${line.variantId}`"
              class="flex gap-3 p-3"
            >
              <NuxtLink :to="`/products/${line.slug}`" class="shrink-0">
                <img
                  v-if="line.image"
                  :src="line.image"
                  :alt="line.title"
                  class="size-20 rounded-lg object-cover"
                />
                <div v-else class="size-20 rounded-lg bg-muted" />
              </NuxtLink>

              <div class="min-w-0 flex-1">
                <NuxtLink :to="`/products/${line.slug}`" class="line-clamp-2 text-sm font-medium">
                  {{ line.title }}
                </NuxtLink>
                <p v-if="line.variantName" class="text-xs text-muted-foreground">
                  {{ line.variantName }}
                </p>
                <p
                  v-if="line.leadTimeDays"
                  class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Clock class="size-3" />{{ leadTimeLabel(line.leadTimeDays) }}
                </p>

                <div class="mt-2 flex items-center justify-between gap-2">
                  <span class="font-semibold text-primary-ink">
                    {{ formatPeso(line.priceCentavos * line.quantity, { compact: true }) }}
                  </span>

                  <div class="flex items-center rounded-md ring-1 ring-border">
                    <button
                      type="button"
                      class="grid size-9 place-items-center rounded-l-lg transition active:bg-muted"
                      :aria-label="`Decrease quantity of ${line.title}`"
                      @click="cart.setQuantity(line, line.quantity - 1); $haptic.light()"
                    >
                      <Minus class="size-3.5" />
                    </button>
                    <span class="min-w-8 text-center text-sm tabular-nums">{{ line.quantity }}</span>
                    <button
                      type="button"
                      class="grid size-9 place-items-center rounded-r-lg transition active:bg-muted"
                      :aria-label="`Increase quantity of ${line.title}`"
                      @click="cart.setQuantity(line, line.quantity + 1); $haptic.light()"
                    >
                      <Plus class="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    class="grid size-9 place-items-center rounded-lg text-muted-foreground transition active:bg-muted"
                    :aria-label="`Remove ${line.title}`"
                    @click="cart.remove(line); $haptic.medium()"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>

                <p v-if="line.minOrderQty > 1" class="mt-1 text-xs text-muted-foreground">
                  This shop's minimum is {{ line.minOrderQty }}.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <p v-if="longestLeadTime > 0" class="rounded-md bg-warning/10 p-3 text-sm leading-relaxed ring-1 ring-warning/20">
          Some pieces here are made after you order. Expect the last of this basket in about
          <strong>{{ longestLeadTime }} days</strong>.
        </p>
      </div>

      <div class="h-28" />

      <!-- Sticky summary -->
      <div
        class="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg"
      >
        <div class="mx-auto max-w-lg space-y-2 p-3">
          <div class="flex items-baseline justify-between text-sm">
            <span class="text-muted-foreground">Subtotal ({{ cart.count.value }} items)</span>
            <span class="text-lg font-semibold">{{ formatPeso(cart.subtotalCentavos.value) }}</span>
          </div>
          <p class="text-xs text-muted-foreground">Shipping is calculated at checkout.</p>

          <Button as-child class="h-11 w-full text-base">
            <NuxtLink :to="loggedIn ? '/checkout' : '/login?redirect=/checkout'">
              {{ loggedIn ? 'Checkout' : 'Sign in to checkout' }}
            </NuxtLink>
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
