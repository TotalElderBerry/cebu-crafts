<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

defineProps<{
  title: string
  to?: string
  linkLabel?: string
}>()
</script>

<template>
  <div class="px-4 pb-3 lg:px-0">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-display text-lg font-medium">{{ title }}</h2>
      <NuxtLink
        v-if="to"
        :to="to"
        class="flex shrink-0 items-center gap-0.5 text-sm text-primary-ink"
      >
        {{ linkLabel ?? 'See all' }} <ArrowRight class="size-3.5" />
      </NuxtLink>
    </div>

    <div class="editorial-rule mt-3" aria-hidden="true" />
  </div>
</template>
