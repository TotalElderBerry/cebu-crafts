<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { $api, $haptic } = useNuxtApp()

const makerSlug = route.query.maker as string
if (!makerSlug) await navigateTo('/explore?view=shops')

const { data: shop } = await useApiFetch<any>(() => `/api/makers/${makerSlug}`)

const form = reactive({
  type: (route.query.product ? 'custom' : 'question') as 'custom' | 'bulk' | 'wholesale' | 'question',
  subject: '',
  message: '',
  quantity: undefined as number | undefined,
  targetBudget: undefined as number | undefined,
  neededBy: '',
})

const submitting = ref(false)
const errors = ref<Record<string, string>>({})

const types = computed(() => {
  const list = [{ value: 'question', label: 'Question' }]
  if (shop.value?.acceptsCustomOrders) list.push({ value: 'custom', label: 'Custom piece' })
  if (shop.value?.acceptsWholesale) {
    list.push({ value: 'bulk', label: 'Bulk order' }, { value: 'wholesale', label: 'Wholesale' })
  }
  return list
})

const needsQuantity = computed(() => form.type !== 'question')

async function submit() {
  errors.value = {}
  submitting.value = true

  try {
    const created = await $api<{ id: string }>('/api/inquiries', {
      method: 'POST',
      body: {
        makerSlug,
        productId: (route.query.product as string) || null,
        type: form.type,
        subject: form.subject,
        message: form.message,
        quantity: needsQuantity.value ? form.quantity : null,
        targetBudget: form.targetBudget,
        neededBy: form.neededBy || null,
      },
    })

    $haptic.success()
    await navigateTo(`/inquiries/${created.id}`)
  } catch (error: any) {
    const issues = error?.data?.data?.issues as { path: (string | number)[]; message: string }[] | undefined
    if (issues?.length) {
      for (const issue of issues) errors.value[String(issue.path.at(-1))] = issue.message
    } else {
      toast.error(apiErrorMessage(error, 'Could not send that.'))
    }
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'New enquiry · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="New enquiry" back />

    <form class="space-y-4 p-4" @submit.prevent="submit">
      <div v-if="shop" class="flex items-center gap-3 rounded-xl card-surface p-3">
        <img
          v-if="shop.logoUrl"
          :src="shop.logoUrl"
          :alt="shop.shopName"
          class="size-11 rounded-xl object-cover"
        />
        <div>
          <p class="text-sm font-semibold">{{ shop.shopName }}</p>
          <p class="text-xs text-muted-foreground">{{ shop.tagline }}</p>
        </div>
      </div>

      <div>
        <Label class="mb-2 block">What do you need?</Label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in types"
            :key="option.value"
            type="button"
            class="rounded-full px-3 py-1.5 text-sm ring-1 transition"
            :class="form.type === option.value
              ? 'bg-primary text-primary-foreground ring-primary'
              : 'bg-card ring-border'"
            @click="form.type = option.value as any"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <Label for="subject">Short title</Label>
        <Input
          id="subject"
          v-model="form.subject"
          placeholder="e.g. 40 peacock chairs for a resort"
          required
        />
        <p v-if="errors.subject" class="text-xs text-destructive">{{ errors.subject }}</p>
      </div>

      <div v-if="needsQuantity" class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label for="quantity">Quantity</Label>
          <Input id="quantity" v-model.number="form.quantity" type="number" inputmode="numeric" min="1" />
        </div>
        <div class="space-y-1">
          <Label for="budget">Target budget (PHP)</Label>
          <Input id="budget" v-model.number="form.targetBudget" type="number" inputmode="numeric" min="0" />
        </div>
      </div>

      <div v-if="needsQuantity" class="space-y-1">
        <Label for="neededBy">Needed by (optional)</Label>
        <Input id="neededBy" v-model="form.neededBy" type="date" />
        <p class="text-xs text-muted-foreground">
          Hand work takes time, so saying the date up front saves a round trip.
        </p>
      </div>

      <div class="space-y-1">
        <Label for="message">Details</Label>
        <Textarea
          id="message"
          v-model="form.message"
          rows="6"
          placeholder="Materials, finish, sizes, where it is going, anything that affects the price."
          required
        />
        <p v-if="errors.message" class="text-xs text-destructive">{{ errors.message }}</p>
      </div>

      <Button type="submit" class="h-11 w-full" :disabled="submitting">
        <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />
        Send to {{ shop?.shopName ?? 'workshop' }}
      </Button>
    </form>
  </div>
</template>
