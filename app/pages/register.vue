<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const { $api } = useNuxtApp()

const form = reactive({ name: '', email: '', phone: '', password: '' })
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

async function register() {
  errors.value = {}
  submitting.value = true

  try {
    await $api('/api/auth/register', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo((route.query.redirect as string) || '/account')
  } catch (error: any) {
    const issues = error?.data?.data?.issues as { path: (string | number)[]; message: string }[] | undefined
    if (issues?.length) {
      for (const issue of issues) errors.value[String(issue.path.at(-1))] = issue.message
    } else {
      toast.error(apiErrorMessage(error, 'Could not create your account.'))
    }
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Create account · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="Create account" back />

    <form class="space-y-4 p-4" @submit.prevent="register">
      <div class="space-y-1">
        <Label for="name">Name</Label>
        <Input id="name" v-model="form.name" autocomplete="name" required />
        <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
      </div>

      <div class="space-y-1">
        <Label for="email">Email</Label>
        <Input id="email" v-model="form.email" type="email" inputmode="email" autocomplete="email" required />
        <p v-if="errors.email" class="text-xs text-destructive">{{ errors.email }}</p>
      </div>

      <div class="space-y-1">
        <Label for="phone">Mobile number (optional)</Label>
        <Input
          id="phone"
          v-model="form.phone"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          placeholder="09171234567"
        />
        <p v-if="errors.phone" class="text-xs text-destructive">{{ errors.phone }}</p>
      </div>

      <div class="space-y-1">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          required
        />
        <p v-if="errors.password" class="text-xs text-destructive">{{ errors.password }}</p>
        <p v-else class="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <Button type="submit" class="h-11 w-full" :disabled="submitting">
        <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />
        Create account
      </Button>

      <p class="text-center text-sm text-muted-foreground">
        Already have one?
        <NuxtLink
          :to="`/login${route.query.redirect ? `?redirect=${route.query.redirect}` : ''}`"
          class="font-medium text-primary-ink"
        >
          Sign in
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
