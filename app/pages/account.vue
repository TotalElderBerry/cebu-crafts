<script setup lang="ts">
import { ChevronRight, LogOut, Monitor, Moon, Receipt, Shield, Store, Sun, UserRound } from 'lucide-vue-next'

const { loggedIn, user, clear } = useUserSession()
const { $api, $haptic } = useNuxtApp()

const { choice: theme, set: setTheme } = useTheme()

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

async function signOut() {
  await $api('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/')
}

useSeoMeta({ title: 'Account · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="Account" />

    <!-- Appearance sits above the sign-in prompt so it is reachable whether or
         not someone has an account. -->
    <section class="px-4 pt-4">
      <h2 class="pb-2 text-sm font-medium">Appearance</h2>
      <div class="flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Theme">
        <button
          v-for="option in THEMES"
          :key="option.value"
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition"
          :class="theme === option.value
            ? 'bg-card text-foreground shadow-elevation-1'
            : 'text-muted-foreground'"
          :aria-pressed="theme === option.value"
          @click="setTheme(option.value); $haptic.light()"
        >
          <component :is="option.icon" class="size-4" />
          {{ option.label }}
        </button>
      </div>
    </section>

    <!-- Signed out -->
    <div v-if="!loggedIn" class="p-4">
      <div class="rounded-md editorial-surface p-5 text-center">
        <div class="mx-auto grid size-14 place-items-center rounded-2xl bg-muted">
          <UserRound class="size-7 text-muted-foreground" />
        </div>
        <h2 class="mt-3 font-semibold">Sign in to Likha Cebu</h2>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Track your orders, message workshops, and open a shop of your own.
        </p>
        <div class="mt-4 flex gap-2">
          <Button as-child class="flex-1"><NuxtLink to="/login">Sign in</NuxtLink></Button>
          <Button as-child variant="outline" class="flex-1">
            <NuxtLink to="/register">Register</NuxtLink>
          </Button>
        </div>
      </div>
    </div>

    <!-- Signed in -->
    <template v-else>
      <div class="flex items-center gap-3 p-4">
        <Avatar class="size-14">
          <AvatarImage v-if="user?.avatarUrl" :src="user.avatarUrl" :alt="user.name" />
          <AvatarFallback>{{ user?.name?.slice(0, 2).toUpperCase() }}</AvatarFallback>
        </Avatar>
        <div class="min-w-0">
          <p class="truncate font-semibold">{{ user?.name }}</p>
          <p class="truncate text-sm text-muted-foreground">{{ user?.email }}</p>
          <Badge v-if="user?.role !== 'buyer'" variant="secondary" class="mt-1 capitalize">
            {{ user?.role }}
          </Badge>
        </div>
      </div>

      <nav class="px-4">
        <ul class="divide-y divide-border overflow-hidden rounded-md editorial-surface">
          <li>
            <NuxtLink to="/orders" class="flex min-h-12 items-center gap-3 px-3 transition active:bg-muted">
              <Receipt class="size-5 text-muted-foreground" />
              <span class="flex-1 text-sm">My orders</span>
              <ChevronRight class="size-4 text-muted-foreground" />
            </NuxtLink>
          </li>

          <li v-if="user?.makerId">
            <NuxtLink to="/maker" class="flex min-h-12 items-center gap-3 px-3 transition active:bg-muted">
              <Store class="size-5 text-muted-foreground" />
              <span class="flex-1 text-sm">Maker dashboard</span>
              <ChevronRight class="size-4 text-muted-foreground" />
            </NuxtLink>
          </li>
          <li v-else>
            <NuxtLink to="/maker/open-shop" class="flex min-h-12 items-center gap-3 px-3 transition active:bg-muted">
              <Store class="size-5 text-muted-foreground" />
              <span class="flex-1 text-sm">Open a shop</span>
              <ChevronRight class="size-4 text-muted-foreground" />
            </NuxtLink>
          </li>

          <li v-if="user?.role === 'admin'">
            <NuxtLink to="/admin" class="flex min-h-12 items-center gap-3 px-3 transition active:bg-muted">
              <Shield class="size-5 text-muted-foreground" />
              <span class="flex-1 text-sm">Verify makers</span>
              <ChevronRight class="size-4 text-muted-foreground" />
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Sell-side pitch, for buyers who are also makers -->
      <div v-if="!user?.makerId" class="p-4">
        <div class="rounded-md editorial-surface p-4">
          <h2 class="text-sm font-semibold">Do you make things?</h2>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
            Listing is free. You set your own prices and lead times, and you talk to buyers
            directly instead of through a consolidator.
          </p>
          <Button as-child variant="outline" class="mt-3 w-full">
            <NuxtLink to="/maker/open-shop">Open a shop</NuxtLink>
          </Button>
        </div>
      </div>

      <div class="p-4">
        <Button variant="ghost" class="w-full text-destructive" @click="signOut">
          <LogOut class="mr-2 size-4" />Sign out
        </Button>
      </div>
    </template>
  </div>
</template>
