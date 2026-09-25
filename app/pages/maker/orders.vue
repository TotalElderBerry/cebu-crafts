<script setup lang="ts">
import { Receipt } from 'lucide-vue-next'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from '~/lib/cebu'
import { formatPeso, relativeTime } from '~/lib/utils'

definePageMeta({ middleware: 'maker' })

const { data: orders, status } = await useApiFetch<any[]>('/api/maker/orders')
const filter = ref<'active' | 'all'>('active')

const ACTIVE = ['pending', 'confirmed', 'crafting', 'ready_to_ship', 'shipped']

const visible = computed(() =>
  filter.value === 'all' ? orders.value : orders.value?.filter((o) => ACTIVE.includes(o.status)),
)

useSeoMeta({ title: 'Shop orders · Likha Cebu' })
</script>

<template>
  <div>
    <AppHeader title="Shop orders" back="/maker">
      <template #below>
        <div class="flex gap-1 px-3 pb-2">
          <button
            v-for="tab in (['active', 'all'] as const)"
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

    <div v-if="status === 'pending'" class="space-y-3 p-4 lg:px-0">
      <Skeleton v-for="n in 4" :key="n" class="h-28 rounded-md" />
    </div>

    <EmptyState
      v-else-if="!visible?.length"
      :title="filter === 'active' ? 'Nothing to work on' : 'No orders yet'"
      :description="filter === 'active'
        ? 'No orders are waiting on you right now.'
        : 'Orders from buyers will appear here.'"
    >
    </EmptyState>

    <ul v-else class="space-y-3 p-4 lg:px-0">
      <li v-for="order in visible" :key="order.id">
        <NuxtLink
          :to="`/orders/${order.id}`"
          class="block rounded-md editorial-surface p-3 transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-medium">{{ order.orderNumber }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="ORDER_STATUS_CLASSES[order.status]"
            >
              {{ ORDER_STATUS_LABELS[order.status] }}
            </span>
            <span class="ml-auto text-xs text-muted-foreground">
              {{ relativeTime(order.placedAt) }}
            </span>
          </div>

          <p class="mt-1.5 text-sm">
            {{ order.buyerName }} ·
            <span class="text-muted-foreground">
              {{ order.shippingAddress.city }}, {{ order.shippingAddress.province }}
            </span>
          </p>

          <ul class="mt-2 space-y-0.5">
            <li
              v-for="(item, index) in order.myItems"
              :key="index"
              class="truncate text-xs text-muted-foreground"
            >
              {{ item.qty }} × {{ item.title }}
            </li>
          </ul>

          <div class="mt-2 flex items-center justify-between">
            <span class="text-xs text-muted-foreground">
              {{ order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid by card' }}
            </span>
            <span class="font-semibold text-primary-ink">
              {{ formatPeso(order.myTotalCentavos) }}
            </span>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
