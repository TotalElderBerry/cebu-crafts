<template>
  <!--
    Matches ProductCard's real shape: square image, two-line title block, price,
    shop line. A spinner in the middle of a grid tells the user nothing about
    what is arriving; this reserves the exact space the card will occupy, so
    nothing shifts when the data lands.
  -->
  <div class="overflow-hidden rounded-xl card-surface" aria-hidden="true">
    <div class="aspect-square animate-pulse bg-muted" />
    <div class="space-y-2 p-2.5 lg:p-3">
      <div class="h-3 w-full animate-pulse rounded bg-muted" />
      <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
      <div class="h-4 w-20 animate-pulse rounded bg-muted" />
      <div class="h-3 w-4/5 animate-pulse rounded bg-muted" />
    </div>
  </div>
</template>
