<script setup lang="ts">
// Auto-import would register this file as <Sonner> (its filename); the named
// export is what the rest of the shadcn ecosystem calls it.
import { Toaster } from '~/components/ui/sonner'
</script>

<template>
  <div class="min-h-dvh bg-background">
    <!-- Desktop chrome. `lg:` never matches inside the packaged app, which is
         always phone-width, so the two navigations can never both appear. -->
    <AppTopNav />

    <!--
      Phone: a 512px column with room at the bottom for the fixed tab bar.
      Desktop: a real page width, tab-bar padding dropped, top nav cleared.
    -->
    <main
      class="mx-auto min-h-dvh w-full max-w-lg pb-[4.5rem] lg:max-w-6xl lg:px-8 lg:pb-16 lg:pt-16"
    >
      <slot />
    </main>

    <AppBottomNav />
    <Toaster position="top-center" :duration="2600" rich-colors close-button />
  </div>
</template>
