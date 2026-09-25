<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { CITY_LABELS } from '~/lib/cebu'

definePageMeta({ middleware: 'auth' })

const { user, fetch: refreshSession } = useUserSession()
const { $api, $haptic } = useNuxtApp()

if (user.value?.makerId) await navigateTo('/maker')

const { data: categories } = await useApiFetch<any[]>('/api/categories')

const form = reactive({
  shopName: '',
  tagline: '',
  story: '',
  city: 'cebu_city',
  barangay: '',
  craftCategories: [] as string[],
  yearsActive: undefined as number | undefined,
  artisanCount: 1,
  acceptsCustomOrders: true,
  acceptsWholesale: false,
})

const submitting = ref(false)
const errors = ref<Record<string, string>>({})

function toggleCraft(slug: string) {
  const index = form.craftCategories.indexOf(slug)
  if (index >= 0) form.craftCategories.splice(index, 1)
  else if (form.craftCategories.length < 6) form.craftCategories.push(slug)
}

async function submit() {
  errors.value = {}
  submitting.value = true

  try {
    const shop = await $api<{ slug: string }>('/api/maker/shop', {
      method: 'POST',
      body: { ...form, tagline: form.tagline || undefined, story: form.story || undefined },
    })

    await refreshSession()
    $haptic.success()
    toast.success('Your shop is open.')
    await navigateTo(`/shops/${shop.slug}`)
  } catch (error: any) {
    const issues = error?.data?.data?.issues as { path: (string | number)[]; message: string }[] | undefined
    if (issues?.length) {
      for (const issue of issues) errors.value[String(issue.path.at(-1))] = issue.message
      toast.error('Check the highlighted fields.')
    } else {
      toast.error(apiErrorMessage(error, 'Could not open your shop.'))
    }
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Open a shop · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="Open a shop" back="/account" />

    <form class="space-y-5 p-4" @submit.prevent="submit">
      <p class="rounded-md editorial-surface p-3.5 text-sm leading-relaxed">
        Listing is free and you keep your own prices. Your shop goes live straight away. An admin
        verifies it separately, and verified shops get a badge buyers look for.
      </p>

      <div class="space-y-1">
        <Label for="shopName">Shop name</Label>
        <Input id="shopName" v-model="form.shopName" placeholder="Abuno Guitar Works" required />
        <p v-if="errors.shopName" class="text-xs text-destructive">{{ errors.shopName }}</p>
      </div>

      <div class="space-y-1">
        <Label for="tagline">One line about the shop</Label>
        <Input id="tagline" v-model="form.tagline" placeholder="Third-generation luthiers from Abuno" />
      </div>

      <div class="space-y-1">
        <Label for="story">Your story</Label>
        <Textarea
          id="story"
          v-model="form.story"
          rows="6"
          placeholder="Who makes these, where, and how long you have been at it."
        />
        <p class="text-xs leading-relaxed text-muted-foreground">
          This is what separates you from an import. Buyers read it before they read the price.
        </p>
      </div>

      <div>
        <Label class="mb-2 block">What do you make? (up to 6)</Label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in categories"
            :key="c.slug"
            type="button"
            class="rounded-full px-3 py-1.5 text-sm ring-1 transition"
            :class="form.craftCategories.includes(c.slug)
              ? 'bg-primary text-primary-foreground ring-primary'
              : 'bg-card ring-border'"
            @click="toggleCraft(c.slug)"
          >
            {{ c.name }}
          </button>
        </div>
        <p v-if="errors.craftCategories" class="pt-1 text-xs text-destructive">
          {{ errors.craftCategories }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label for="city">City / municipality</Label>
          <select
            id="city"
            v-model="form.city"
            class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option v-for="(label, value) in CITY_LABELS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </div>
        <div class="space-y-1">
          <Label for="barangay">Barangay</Label>
          <Input id="barangay" v-model="form.barangay" placeholder="Abuno" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label for="years">Years making</Label>
          <Input id="years" v-model.number="form.yearsActive" type="number" inputmode="numeric" min="0" />
        </div>
        <div class="space-y-1">
          <Label for="artisans">People in the workshop</Label>
          <Input id="artisans" v-model.number="form.artisanCount" type="number" inputmode="numeric" min="1" />
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center justify-between rounded-md editorial-surface p-3">
          <span>
            <span class="block text-sm font-medium">Take custom orders</span>
            <span class="block text-xs text-muted-foreground">Buyers can send specs for a quote</span>
          </span>
          <Switch v-model="form.acceptsCustomOrders" />
        </label>

        <label class="flex items-center justify-between rounded-md editorial-surface p-3">
          <span>
            <span class="block text-sm font-medium">Take wholesale / bulk</span>
            <span class="block text-xs text-muted-foreground">Resellers and resorts can ask for volume pricing</span>
          </span>
          <Switch v-model="form.acceptsWholesale" />
        </label>
      </div>

      <Button type="submit" class="h-11 w-full" :disabled="submitting">
        <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />Open my shop
      </Button>
    </form>
  </div>
</template>
