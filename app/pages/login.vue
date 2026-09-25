<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const { $api } = useNuxtApp()

const form = reactive({ email: '', password: '' })
const submitting = ref(false)

async function signIn() {
  submitting.value = true
  try {
    await $api('/api/auth/login', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo((route.query.redirect as string) || '/account')
  } catch (error) {
    toast.error(apiErrorMessage(error, 'Could not sign you in.'))
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Sign in · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="Sign in" back />

    <!-- Sign-in is otherwise the blankest screen in the app; a banig band gives
         it the same character as everything behind it. -->
    <div class="relative isolate overflow-hidden px-4 pb-1 pt-4">
      <CraftPattern name="banig" tone="ink" :alpha="0.18" />
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Likha Cebu</p>
      <h2 class="font-display text-2xl font-medium leading-tight">Maayong pag-abot</h2>
      <p class="pt-1 text-sm text-muted-foreground">Welcome back.</p>
    </div>

    <form class="space-y-4 p-4" @submit.prevent="signIn">
      <div class="space-y-1">
        <Label for="email">Email</Label>
        <Input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          inputmode="email"
          required
        />
      </div>

      <div class="space-y-1">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <Button type="submit" class="h-11 w-full" :disabled="submitting">
        <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />
        Sign in
      </Button>

      <p class="text-center text-sm text-muted-foreground">
        New here?
        <NuxtLink
          :to="`/register${route.query.redirect ? `?redirect=${route.query.redirect}` : ''}`"
          class="font-medium text-primary-ink"
        >
          Create an account
        </NuxtLink>
      </p>

      <!--
        Two columns rather than "email - role" on one line. The dash that used
        to separate them was an em-dash; removing it left the address and the
        role running straight into each other, which is worse than either. A
        column does the separating job that punctuation was doing.
      -->
      <div class="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        <p class="font-medium text-foreground">Demo accounts</p>
        <dl class="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <dt><code>andrea@example.com</code></dt>
          <dd class="text-right">Buyer</dd>
          <dt><code>rene@abunoguitars.ph</code></dt>
          <dd class="text-right">Maker</dd>
          <dt><code>admin@likhacebu.ph</code></dt>
          <dd class="text-right">Admin</dd>
        </dl>
        <p class="mt-2 border-t border-border pt-2">
          Password for all: <code class="text-foreground">password123</code>
        </p>
      </div>
    </form>
  </div>
</template>
