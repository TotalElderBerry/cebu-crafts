<script setup lang="ts">
import { Home, Search, ShoppingBag, MessageSquare, User } from 'lucide-vue-next'

const route = useRoute()
const { count } = useCart()
const { loggedIn } = useUserSession()
const { $haptic } = useNuxtApp()

const tabs = [
  { to: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { to: '/explore', label: 'Explore', icon: Search, match: (p: string) => p.startsWith('/explore') || p.startsWith('/shops') },
  { to: '/cart', label: 'Cart', icon: ShoppingBag, match: (p: string) => p.startsWith('/cart') || p.startsWith('/checkout') },
  { to: '/inquiries', label: 'Messages', icon: MessageSquare, match: (p: string) => p.startsWith('/inquiries') },
  { to: '/account', label: 'Account', icon: User, match: (p: string) => p.startsWith('/account') || p.startsWith('/orders') || p.startsWith('/maker') },
]
</script>

<template>
  <!--
    Bottom tabs rather than a top nav: on a phone the bottom third is the only
    comfortable reach zone, and it is what every native app the buyer already
    uses does. pb-safe keeps the row clear of the iOS home indicator.
  -->
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-safe lg:hidden"
    aria-label="Primary"
  >
    <ul class="mx-auto flex max-w-lg items-stretch">
      <li v-for="tab in tabs" :key="tab.to" class="flex-1">
        <NuxtLink
          :to="tab.to"
          class="relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors"
          :class="tab.match(route.path) ? 'text-primary-ink' : 'text-muted-foreground'"
          :aria-current="tab.match(route.path) ? 'page' : undefined"
          @click="$haptic.light()"
        >
          <span class="relative">
            <component :is="tab.icon" class="size-[22px]" :stroke-width="tab.match(route.path) ? 2.4 : 1.8" />
            <span
              v-if="tab.to === '/cart' && count > 0"
              class="absolute -right-2 -top-1.5 grid min-w-[1.05rem] place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground"
            >
              {{ count > 99 ? '99+' : count }}
            </span>
            <span
              v-if="tab.to === '/account' && !loggedIn"
              class="absolute -right-1 -top-0.5 size-2 rounded-full bg-accent"
            />
          </span>
          <span class="text-[0.6875rem] font-medium leading-none">{{ tab.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
