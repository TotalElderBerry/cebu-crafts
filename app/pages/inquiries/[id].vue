<script setup lang="ts">
import { Loader2, Send } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from '~/lib/cebu'
import { formatDate, formatPeso, relativeTime } from '~/lib/utils'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { user } = useUserSession()
const { $api, $haptic } = useNuxtApp()

const { data: thread, refresh, error } = await useApiFetch<any>(
  () => `/api/inquiries/${route.params.id}`,
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Thread not found', fatal: true })
}

const draft = ref('')
const sending = ref(false)
const quoteOpen = ref(false)
const quote = reactive({ price: 0, leadTimeDays: 14, note: '' })
const quoting = ref(false)

const isMaker = computed(() => thread.value?.side === 'maker')
const settled = computed(() => ['accepted', 'declined', 'closed'].includes(thread.value?.status))

async function send() {
  if (!draft.value.trim()) return
  sending.value = true
  try {
    await $api(`/api/inquiries/${route.params.id}/messages`, {
      method: 'POST',
      body: { body: draft.value },
    })
    draft.value = ''
    await refresh()
    $haptic.light()
    await nextTick()
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not send that.'))
  } finally {
    sending.value = false
  }
}

async function act(body: Record<string, unknown>, successMessage: string) {
  quoting.value = true
  try {
    await $api(`/api/inquiries/${route.params.id}/quote`, { method: 'POST', body })
    quoteOpen.value = false
    await refresh()
    $haptic.success()
    toast.success(successMessage)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'That did not work.'))
  } finally {
    quoting.value = false
  }
}

useSeoMeta({ title: () => `${thread.value?.subject ?? 'Thread'} · Likha Cebu` })
</script>

<template>
  <div v-if="thread" class="flex min-h-dvh flex-col lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader back="/inquiries">
      <template #title>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">
            {{ isMaker ? thread.buyerName : thread.makerName }}
          </p>
          <p class="truncate text-xs text-muted-foreground">{{ thread.subject }}</p>
        </div>
      </template>
    </AppHeader>

    <!-- Brief -->
    <section class="space-y-2 border-b border-border bg-card p-4">
      <div class="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{{ INQUIRY_TYPE_LABELS[thread.type] }}</Badge>
        <Badge :variant="thread.status === 'accepted' ? 'default' : 'outline'">
          {{ INQUIRY_STATUS_LABELS[thread.status] }}
        </Badge>
      </div>

      <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <template v-if="thread.quantity">
          <dt class="text-muted-foreground">Quantity</dt>
          <dd>{{ thread.quantity }} pcs</dd>
        </template>
        <template v-if="thread.targetBudgetCentavos">
          <dt class="text-muted-foreground">Target budget</dt>
          <dd>{{ formatPeso(thread.targetBudgetCentavos) }}</dd>
        </template>
        <template v-if="thread.neededBy">
          <dt class="text-muted-foreground">Needed by</dt>
          <dd>{{ formatDate(thread.neededBy) }}</dd>
        </template>
      </dl>

      <NuxtLink
        v-if="thread.productSlug"
        :to="`/products/${thread.productSlug}`"
        class="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm"
      >
        <img
          v-if="thread.productImage?.[0]"
          :src="thread.productImage[0]"
          alt=""
          class="size-9 rounded object-cover"
        />
        <span class="truncate">{{ thread.productTitle }}</span>
      </NuxtLink>

      <!-- The quote itself, pinned rather than buried in the scrollback. -->
      <div
        v-if="thread.quotedPriceCentavos"
        class="rounded-xl p-3 ring-1"
        :class="thread.status === 'accepted'
          ? 'bg-success/10 ring-success/25'
          : 'bg-primary/8 ring-primary/20'"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quote</p>
        <p class="text-xl font-semibold text-primary-ink">
          {{ formatPeso(thread.quotedPriceCentavos) }}
        </p>
        <p class="text-sm text-muted-foreground">
          Ready in about {{ thread.quotedLeadTimeDays }} days
        </p>

        <div v-if="!isMaker && thread.status === 'quoted'" class="mt-3 flex gap-2">
          <Button class="flex-1" :disabled="quoting" @click="act({ action: 'accept' }, 'Quote accepted.')">
            <Loader2 v-if="quoting" class="mr-2 size-4 animate-spin" />Accept
          </Button>
          <Button
            variant="outline"
            class="flex-1"
            :disabled="quoting"
            @click="act({ action: 'decline' }, 'Quote declined.')"
          >
            Decline
          </Button>
        </div>
      </div>

      <Button
        v-if="isMaker && !settled"
        variant="outline"
        class="w-full"
        @click="quoteOpen = true"
      >
        {{ thread.quotedPriceCentavos ? 'Revise quote' : 'Send a quote' }}
      </Button>
    </section>

    <!-- Messages -->
    <ul class="flex-1 space-y-3 p-4">
      <li
        v-for="message in thread.messages"
        :key="message.id"
        class="flex"
        :class="message.senderId === user?.id ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] rounded-2xl px-3.5 py-2.5"
          :class="message.senderId === user?.id
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md card-surface'"
        >
          <p class="whitespace-pre-line text-sm leading-relaxed selectable">{{ message.body }}</p>
          <p
            class="pt-1 text-[0.6875rem]"
            :class="message.senderId === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'"
          >
            {{ relativeTime(message.createdAt) }}
          </p>
        </div>
      </li>
    </ul>

    <div class="h-24" />

    <!-- Composer -->
    <div
      v-if="!settled"
      class="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg"
      :style="{ paddingBottom: 'var(--keyboard-height, 0px)' }"
    >
      <form class="mx-auto flex max-w-lg items-end gap-2 p-2.5" @submit.prevent="send">
        <Textarea
          v-model="draft"
          rows="1"
          placeholder="Write a message…"
          class="max-h-32 min-h-11 flex-1 resize-none"
          @keydown.enter.exact.prevent="send"
        />
        <Button type="submit" size="icon" class="size-11 shrink-0" :disabled="sending || !draft.trim()">
          <Loader2 v-if="sending" class="size-4 animate-spin" />
          <Send v-else class="size-4" />
        </Button>
      </form>
    </div>

    <p v-else class="px-4 pb-6 text-center text-sm text-muted-foreground">
      This conversation is {{ INQUIRY_STATUS_LABELS[thread.status]?.toLowerCase() }}.
    </p>

    <!-- Quote sheet -->
    <Sheet v-model:open="quoteOpen">
      <SheetContent side="bottom" class="rounded-t-2xl pb-safe">
        <SheetHeader class="text-left">
          <SheetTitle>Send a quote</SheetTitle>
          <SheetDescription>
            The buyer sees this pinned at the top of the thread and can accept it in one tap.
          </SheetDescription>
        </SheetHeader>

        <form
          class="space-y-4 px-4 pb-6"
          @submit.prevent="act(
            { action: 'quote', price: quote.price, leadTimeDays: quote.leadTimeDays, note: quote.note || undefined },
            'Quote sent.',
          )"
        >
          <div class="space-y-1">
            <Label for="price">Total price (PHP)</Label>
            <Input id="price" v-model.number="quote.price" type="number" inputmode="numeric" min="1" required />
          </div>

          <div class="space-y-1">
            <Label for="lead">Lead time (days)</Label>
            <Input id="lead" v-model.number="quote.leadTimeDays" type="number" inputmode="numeric" min="0" max="365" required />
          </div>

          <div class="space-y-1">
            <Label for="qnote">Note (optional)</Label>
            <Textarea id="qnote" v-model="quote.note" rows="3" placeholder="What is included, deposit terms, delivery…" />
          </div>

          <Button type="submit" class="h-11 w-full" :disabled="quoting">
            <Loader2 v-if="quoting" class="mr-2 size-4 animate-spin" />Send quote
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>
