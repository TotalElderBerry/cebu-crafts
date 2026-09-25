<script setup lang="ts">
import { BadgeCheck, Loader2, MapPin } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { cityLabel } from '~/lib/cebu'
import { formatDate } from '~/lib/utils'

definePageMeta({ middleware: 'auth' })

const { user } = useUserSession()
if (user.value?.role !== 'admin') {
  throw createError({ statusCode: 403, statusMessage: 'Admins only', fatal: true })
}

const { data: shops, status, refresh } = await useApiFetch<any[]>('/api/admin/makers')
const { $api } = useNuxtApp()
const busyId = ref<string | null>(null)
const filter = ref<'pending' | 'all'>('pending')

const visible = computed(() =>
  filter.value === 'all' ? shops.value : shops.value?.filter((s) => s.verification === 'pending'),
)

async function setVerification(id: string, verification: string) {
  busyId.value = id
  try {
    await $api(`/api/admin/makers/${id}`, { method: 'PATCH', body: { verification } })
    await refresh()
    toast.success(verification === 'verified' ? 'Shop verified.' : 'Shop updated.')
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not update the shop.'))
  } finally {
    busyId.value = null
  }
}

useSeoMeta({ title: 'Verify makers · Likha Cebu' })
</script>

<template>
  <div>
    <AppHeader title="Verify makers" back="/account">
      <template #below>
        <div class="flex gap-1 px-3 pb-2">
          <button
            v-for="tab in (['pending', 'all'] as const)"
            :key="tab"
            type="button"
            class="rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition"
            :class="filter === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            @click="filter = tab"
          >
            {{ tab }}
          </button>
        </div>
      </template>
    </AppHeader>

    <div v-if="status === 'pending'" class="space-y-3 p-4">
      <Skeleton v-for="n in 3" :key="n" class="h-40 rounded-md" />
    </div>

    <EmptyState
      v-else-if="!visible?.length"
      title="Nothing waiting"
      description="No shops are pending verification."
    >
    </EmptyState>

    <ul v-else class="space-y-3 p-4">
      <li v-for="shop in visible" :key="shop.id" class="rounded-md editorial-surface p-3.5">
        <div class="flex gap-3">
          <img
            v-if="shop.logoUrl"
            :src="shop.logoUrl"
            :alt="shop.shopName"
            class="size-12 shrink-0 rounded-md object-cover"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <NuxtLink :to="`/shops/${shop.slug}`" class="truncate font-semibold">
                {{ shop.shopName }}
              </NuxtLink>
              <BadgeCheck
                v-if="shop.verification === 'verified'"
                class="size-4 shrink-0 text-accent"
              />
            </div>
            <p class="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin class="size-3" />
              {{ shop.barangay ? `${shop.barangay}, ` : '' }}{{ cityLabel(shop.city) }}
            </p>
          </div>
          <Badge variant="outline" class="h-fit shrink-0 capitalize">{{ shop.verification }}</Badge>
        </div>

        <p v-if="shop.story" class="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {{ shop.story }}
        </p>

        <dl class="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt class="text-muted-foreground">Owner</dt>
          <dd>{{ shop.ownerName }}</dd>
          <dt class="text-muted-foreground">Email</dt>
          <dd class="truncate">{{ shop.ownerEmail }}</dd>
          <dt v-if="shop.ownerPhone" class="text-muted-foreground">Phone</dt>
          <dd v-if="shop.ownerPhone">{{ shop.ownerPhone }}</dd>
          <dt class="text-muted-foreground">Listings</dt>
          <dd>{{ shop.productCount }}</dd>
          <dt class="text-muted-foreground">Registered</dt>
          <dd>{{ formatDate(shop.createdAt) }}</dd>
        </dl>

        <div class="mt-3 flex gap-2">
          <Button
            v-if="shop.verification !== 'verified'"
            class="flex-1"
            :disabled="busyId === shop.id"
            @click="setVerification(shop.id, 'verified')"
          >
            <Loader2 v-if="busyId === shop.id" class="mr-2 size-4 animate-spin" />Verify
          </Button>
          <Button
            v-if="shop.verification !== 'rejected'"
            variant="outline"
            class="flex-1"
            :disabled="busyId === shop.id"
            @click="setVerification(shop.id, 'rejected')"
          >
            Reject
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>
