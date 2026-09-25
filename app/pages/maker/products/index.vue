<script setup lang="ts">
import { Eye, Plus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatPeso, leadTimeLabel } from '~/lib/utils'

definePageMeta({ middleware: 'maker' })

const { data: listings, status, refresh } = await useApiFetch<any[]>('/api/maker/products')
const { $api } = useNuxtApp()
const busyId = ref<string | null>(null)

async function togglePublished(product: any) {
  busyId.value = product.id
  const next = product.status === 'published' ? 'draft' : 'published'

  try {
    await $api(`/api/maker/products/${product.id}`, { method: 'PATCH', body: { status: next } })
    await refresh()
    toast.success(next === 'published' ? 'Listing is live.' : 'Listing hidden.')
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not update the listing.'))
  } finally {
    busyId.value = null
  }
}

useSeoMeta({ title: 'My listings · Likha Cebu' })
</script>

<template>
  <div>
    <AppHeader title="My listings" back="/maker">
      <template #actions>
        <Button as-child size="sm">
          <NuxtLink to="/maker/products/new"><Plus class="mr-1 size-4" />New</NuxtLink>
        </Button>
      </template>
    </AppHeader>

    <div v-if="status === 'pending'" class="space-y-3 p-4 lg:px-0">
      <Skeleton v-for="n in 4" :key="n" class="h-24 rounded-md" />
    </div>

    <EmptyState
      v-else-if="!listings?.length"
      title="Nothing listed yet"
      description="Add your first piece. Clear photos and an honest lead time sell better than a low price."
      action-label="Add a listing"
      action-to="/maker/products/new"
    />

    <ul v-else class="space-y-3 p-4 lg:px-0">
      <li
        v-for="product in listings"
        :key="product.id"
        class="flex gap-3 rounded-md editorial-surface p-3"
      >
        <img
          v-if="product.images?.[0]"
          :src="product.images[0]"
          :alt="product.title"
          class="size-20 shrink-0 rounded-lg object-cover"
        />
        <div v-else class="size-20 shrink-0 rounded-lg bg-muted" />

        <div class="min-w-0 flex-1">
          <p class="line-clamp-2 text-sm font-medium">{{ product.title }}</p>
          <p class="text-sm font-semibold text-primary-ink">
            {{ formatPeso(product.priceCentavos, { compact: true }) }}
          </p>

          <p class="text-xs text-muted-foreground">
            <template v-if="product.isMadeToOrder">{{ leadTimeLabel(product.leadTimeDays) }}</template>
            <template v-else>{{ product.stock }} in stock</template>
            · <Eye class="inline size-3" /> {{ product.viewCount }}
          </p>

          <div class="mt-2 flex items-center gap-2">
            <Badge
              :variant="product.status === 'published' ? 'default' : 'secondary'"
              class="capitalize"
            >
              {{ product.status }}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              class="ml-auto h-8"
              :disabled="busyId === product.id"
              @click="togglePublished(product)"
            >
              {{ product.status === 'published' ? 'Unpublish' : 'Publish' }}
            </Button>

            <Button as-child size="sm" variant="ghost" class="h-8">
              <NuxtLink :to="`/products/${product.slug}`">View</NuxtLink>
            </Button>
          </div>

          <p
            v-if="product.status === 'published' && !product.isMadeToOrder && product.stock === 0"
            class="mt-1.5 text-xs text-warning"
          >
            Out of stock. Buyers can see this but cannot order it.
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
