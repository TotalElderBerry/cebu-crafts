<script setup lang="ts">
import { LogOut, Search, ShoppingBag, Store, UserRound } from 'lucide-vue-next'

/**
 * Desktop navigation. Hidden below `lg`, where the bottom tab bar takes over.
 *
 * The packaged app never reaches `lg` — a WebView is always phone-width — so
 * nothing in here can affect the mobile build. It exists purely for the web
 * target, which is also the one search engines see.
 */
const route = useRoute()
const { count } = useCart()
const { loggedIn, user, clear } = useUserSession()
const { $api } = useNuxtApp()

const search = ref((route.query.q as string) ?? '')

function submitSearch() {
  navigateTo({ path: '/explore', query: search.value ? { q: search.value } : {} })
}

async function signOut() {
  await $api('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/')
}

const links = [
  { to: '/explore', label: 'Explore', match: (p: string) => p.startsWith('/explore') },
  { to: '/explore?view=shops', label: 'Workshops', match: (p: string) => p.startsWith('/shops') },
  { to: '/inquiries', label: 'Messages', match: (p: string) => p.startsWith('/inquiries') },
]
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 hidden border-b border-border bg-background/95 lg:block"
  >
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
      <NuxtLink to="/" class="shrink-0">
        <span class="block text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Likha
        </span>
        <span class="font-display -mt-0.5 block text-lg font-medium leading-none">Cebu</span>
      </NuxtLink>

      <nav class="flex items-center gap-1" aria-label="Primary">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="border-b-2 border-transparent px-2.5 py-2 text-sm font-medium transition-colors hover:text-foreground"
          :class="link.match(route.path) ? 'border-primary text-primary-ink' : 'text-muted-foreground'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <form class="ml-auto max-w-sm flex-1" @submit.prevent="submitSearch">
        <label class="relative block">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            v-model="search"
            type="search"
            placeholder="Search crafts or workshops"
            class="h-10 w-full rounded-md bg-background pl-9 pr-3 text-sm outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring"
          />
        </label>
      </form>

      <div class="flex shrink-0 items-center gap-1">
        <NuxtLink
          to="/cart"
          class="relative grid size-10 place-items-center rounded-md transition hover:bg-muted"
          aria-label="Cart"
        >
          <ShoppingBag class="size-5" />
          <span
            v-if="count > 0"
            class="absolute right-1 top-1 grid min-w-[1.05rem] place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground"
          >
            {{ count > 99 ? '99+' : count }}
          </span>
        </NuxtLink>

        <template v-if="loggedIn">
          <NuxtLink
            v-if="user?.makerId"
            to="/maker"
            class="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Store class="size-4" />My shop
          </NuxtLink>
          <NuxtLink
            to="/account"
            class="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <UserRound class="size-4" />{{ user?.name?.split(' ')[0] }}
          </NuxtLink>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-md text-muted-foreground transition hover:bg-muted"
            aria-label="Sign out"
            @click="signOut"
          >
            <LogOut class="size-4" />
          </button>
        </template>

        <template v-else>
          <Button as-child variant="ghost" size="sm"><NuxtLink to="/login">Sign in</NuxtLink></Button>
          <Button as-child size="sm"><NuxtLink to="/register">Register</NuxtLink></Button>
        </template>
      </div>
    </div>
  </header>
</template>
