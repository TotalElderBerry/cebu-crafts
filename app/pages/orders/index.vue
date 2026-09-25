<script setup lang="ts">
import { Receipt } from 'lucide-vue-next'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from '~/lib/cebu'
import { formatPeso, relativeTime } from '~/lib/utils'

definePageMeta({ middleware: 'auth' })

const { data: orders, status, refresh } = await useApiFetch<any[]>('/api/orders')

useSeoMeta({ title: 'My orders · Likha Cebu' })
</script>

<template>
  <PullToRefresh @refresh="refresh">
    <AppHeader title="My orders" back="/account" />

    <div v-if="status === 'pending'" class="space-y-3 p-4 lg:px-0">
      <Skeleton v-for="n in 4" :key="n" class="h-24 rounded-md" />
    </div>

    <EmptyState
      v-else-if="!orders?.length"
      title="No orders yet"
      description="When you buy from a workshop, you can follow it from confirmed through crafting to delivered."
      action-label="Explore crafts"
      action-to="/explore"
    >
    </EmptyState>

    <ul v-else class="space-y-3 p-4 lg:px-0">
      <li v-for="order in orders" :key="order.id">
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

          <div class="mt-2.5 flex items-center gap-2">
            <div class="flex -space-x-2">
              <img
                v-for="(thumb, index) in order.thumbnails.slice(0, 4)"
                :key="index"
                :src="thumb"
                alt=""
                class="size-11 rounded-lg object-cover ring-2 ring-card"
              />
            </div>
            <div class="ml-auto text-right">
              <p class="text-xs text-muted-foreground">{{ order.itemCount }} items</p>
              <p class="font-semibold text-primary-ink">{{ formatPeso(order.totalCentavos) }}</p>
            </div>
          </div>

          <p v-if="order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid'" class="mt-2 text-xs text-muted-foreground">
            Cash on delivery. Pay the courier on arrival.
          </p>
        </NuxtLink>
      </li>
    </ul>
  </PullToRefresh>
</template>
