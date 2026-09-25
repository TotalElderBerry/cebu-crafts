<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from '~/lib/cebu'
import { formatPeso, relativeTime } from '~/lib/utils'

definePageMeta({ middleware: 'auth' })

const { data: threads, status } = await useApiFetch<any[]>('/api/inquiries')

const statusClass: Record<string, string> = {
  open: 'bg-warning/15 text-warning-foreground ring-warning/30',
  quoted: 'bg-accent/15 text-accent ring-accent/30',
  accepted: 'bg-success/15 text-success ring-success/30',
  declined: 'bg-muted text-muted-foreground ring-border',
  closed: 'bg-muted text-muted-foreground ring-border',
}

useSeoMeta({ title: 'Messages · Likha Cebu' })
</script>

<template>
  <div>
    <AppHeader title="Messages" />

    <div v-if="status === 'pending'" class="space-y-3 p-4 lg:px-0">
      <Skeleton v-for="n in 4" :key="n" class="h-20 rounded-xl" />
    </div>

    <EmptyState
      v-else-if="!threads?.length"
      title="No conversations yet"
      description="Ask a workshop about a custom piece or a bulk order and the thread will appear here, with the quote written down, not lost in a chat."
      action-label="Find a workshop"
      action-to="/explore?view=shops"
    >
    </EmptyState>

    <ul v-else class="divide-y divide-border lg:rounded-xl lg:border lg:border-border lg:bg-card">
      <li v-for="thread in threads" :key="thread.id">
        <NuxtLink :to="`/inquiries/${thread.id}`" class="flex gap-3 p-4 transition active:bg-muted">
          <img
            v-if="thread.makerLogo"
            :src="thread.makerLogo"
            :alt="thread.makerName"
            class="size-11 shrink-0 rounded-xl object-cover"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span class="truncate text-sm font-semibold">
                {{ thread.side === 'buyer' ? thread.makerName : thread.buyerName }}
              </span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">
                {{ relativeTime(thread.updatedAt) }}
              </span>
            </div>

            <p class="truncate text-sm">{{ thread.subject }}</p>
            <p v-if="thread.lastMessage" class="truncate text-xs text-muted-foreground">
              {{ thread.lastMessage }}
            </p>

            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium">
                {{ INQUIRY_TYPE_LABELS[thread.type] }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1"
                :class="statusClass[thread.status]"
              >
                {{ INQUIRY_STATUS_LABELS[thread.status] }}
              </span>
              <span v-if="thread.quantity" class="text-[0.6875rem] text-muted-foreground">
                {{ thread.quantity }} pcs
              </span>
              <span v-if="thread.quotedPriceCentavos" class="text-[0.6875rem] font-medium text-primary-ink">
                {{ formatPeso(thread.quotedPriceCentavos, { compact: true }) }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
