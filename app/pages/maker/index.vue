<script setup lang="ts">
import { AlertTriangle, MessageSquare, Package, Plus, Receipt } from 'lucide-vue-next'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from '~/lib/cebu'
import { formatPeso, relativeTime } from '~/lib/utils'

definePageMeta({ middleware: 'maker' })

const { data: overview, status } = await useApiFetch<any>('/api/maker/overview')

useSeoMeta({ title: 'Maker dashboard · Likha Cebu' })
</script>

<template>
  <div>
    <AppHeader title="My shop" back="/account">
      <template #actions>
        <Button as-child size="sm">
          <NuxtLink to="/maker/products/new"><Plus class="mr-1 size-4" />List</NuxtLink>
        </Button>
      </template>
    </AppHeader>

    <div v-if="status === 'pending'" class="space-y-3 p-4">
      <Skeleton class="h-24 rounded-md" />
      <Skeleton class="h-32 rounded-md" />
    </div>

    <div v-else-if="overview" class="space-y-4 p-4 lg:px-0">
      <!-- Earnings -->
      <section class="rounded-md editorial-surface p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Earned (delivered)
        </p>
        <p class="text-3xl font-semibold text-primary-ink">
          {{ formatPeso(overview.sales.deliveredRevenue) }}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ formatPeso(overview.sales.inProgressRevenue) }} still in progress ·
          {{ overview.sales.unitsSold }} pieces sold
        </p>
        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">
          Only delivered orders count as earned. Cash-on-delivery orders are not money in hand
          until the courier hands them over.
        </p>
      </section>

      <!-- Counters -->
      <section class="grid grid-cols-3 gap-2 lg:gap-5">
        <NuxtLink
          to="/maker/products"
          class="rounded-md editorial-surface p-3 text-center transition active:scale-95"
        >
          <Package class="mx-auto size-5 text-muted-foreground" />
          <p class="mt-1 text-lg font-semibold">{{ overview.catalogue.published }}</p>
          <p class="text-xs text-muted-foreground">Listed</p>
        </NuxtLink>

        <NuxtLink
          to="/maker/orders"
          class="rounded-md editorial-surface p-3 text-center transition active:scale-95"
        >
          <Receipt class="mx-auto size-5 text-muted-foreground" />
          <p class="mt-1 text-lg font-semibold">{{ overview.sales.orderCount }}</p>
          <p class="text-xs text-muted-foreground">Orders</p>
        </NuxtLink>

        <NuxtLink
          to="/inquiries"
          class="rounded-md editorial-surface p-3 text-center transition active:scale-95"
        >
          <MessageSquare class="mx-auto size-5 text-muted-foreground" />
          <p class="mt-1 text-lg font-semibold">{{ overview.openInquiries }}</p>
          <p class="text-xs text-muted-foreground">Enquiries</p>
        </NuxtLink>
      </section>

      <NuxtLink
        v-if="overview.catalogue.outOfStock > 0"
        to="/maker/products"
        class="flex items-start gap-2.5 rounded-md bg-warning/10 p-3 ring-1 ring-warning/25"
      >
        <AlertTriangle class="mt-0.5 size-4 shrink-0 text-warning" />
        <p class="text-sm leading-relaxed">
          <strong>{{ overview.catalogue.outOfStock }}</strong>
          {{ overview.catalogue.outOfStock === 1 ? 'listing is' : 'listings are' }} published but out
          of stock. Buyers can see them and cannot buy them.
        </p>
      </NuxtLink>

      <p v-if="overview.catalogue.draft" class="text-sm text-muted-foreground">
        {{ overview.catalogue.draft }} draft
        {{ overview.catalogue.draft === 1 ? 'listing' : 'listings' }} not yet published.
      </p>

      <!-- Recent orders -->
      <section>
        <div class="flex items-baseline justify-between pb-2">
          <h2 class="font-semibold">Recent orders</h2>
          <NuxtLink to="/maker/orders" class="text-sm text-primary-ink">All orders</NuxtLink>
        </div>

        <ul v-if="overview.recentOrders.length" class="space-y-2">
          <li v-for="order in overview.recentOrders" :key="order.id">
            <NuxtLink
              :to="`/orders/${order.id}`"
              class="flex items-center gap-2 rounded-md editorial-surface p-3 transition active:scale-[0.99]"
            >
              <div class="min-w-0 flex-1">
                <p class="font-mono text-sm">{{ order.orderNumber }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ order.myItemCount }} items · {{ relativeTime(order.placedAt) }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="ORDER_STATUS_CLASSES[order.status]"
              >
                {{ ORDER_STATUS_LABELS[order.status] }}
              </span>
              <span class="shrink-0 font-semibold text-primary-ink">
                {{ formatPeso(order.myTotalCentavos, { compact: true }) }}
              </span>
            </NuxtLink>
          </li>
        </ul>

        <EmptyState
          v-else
          title="No orders yet"
          description="List a few pieces with good photos and a clear lead time."
          action-label="Add a listing"
          action-to="/maker/products/new"
        />
      </section>
    </div>
  </div>
</template>
