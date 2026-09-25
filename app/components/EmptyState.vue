<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="grid place-items-center px-6 py-14 text-center">
    <!--
      A themed illustration rather than a grey glyph. It is a loom: warp
      threads, weft, and a shuttle, the same hablon motif the placeholder
      images use, so empty screens still look like part of the product.
      currentColor throughout, so it follows light and dark automatically.
    -->
    <slot name="icon">
      <svg
        viewBox="0 0 120 96"
        class="h-24 w-30 text-primary-ink"
        fill="none"
        aria-hidden="true"
      >
        <!-- frame -->
        <rect
          x="14" y="14" width="92" height="68" rx="6"
          stroke="currentColor" stroke-width="2.5" opacity=".35"
        />
        <!-- warp -->
        <g stroke="currentColor" stroke-width="2" opacity=".22">
          <path d="M30 14v68M44 14v68M58 14v68M72 14v68M86 14v68" />
        </g>
        <!-- woven weft, denser at the bottom: cloth in progress -->
        <g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".55">
          <path d="M22 70h76M22 62h76M22 54h58" />
        </g>
        <g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".25">
          <path d="M22 46h34" />
        </g>
        <!-- shuttle -->
        <path
          d="M56 42h18l6 4-6 4H56l-6-4z"
          fill="currentColor" opacity=".8"
        />
        <circle cx="66" cy="46" r="1.6" fill="var(--card)" />
      </svg>
    </slot>

    <h2 class="font-display mt-4 text-lg font-medium">{{ title }}</h2>
    <p v-if="description" class="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
      {{ description }}
    </p>

    <Button v-if="actionLabel && actionTo" as-child class="mt-5">
      <NuxtLink :to="actionTo">{{ actionLabel }}</NuxtLink>
    </Button>
    <Button v-else-if="actionLabel" class="mt-5" variant="outline" @click="$emit('action')">
      {{ actionLabel }}
    </Button>
  </div>
</template>
