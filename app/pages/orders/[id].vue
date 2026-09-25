<script setup lang="ts">
import { Check, CircleDot, CreditCard, Loader2, MapPin, PartyPopper } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_HINTS, ORDER_STATUS_LABELS } from '~/lib/cebu'
import { formatDate, formatPeso } from '~/lib/utils'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { $api, $haptic } = useNuxtApp()

const { data: order, refresh, error } = await useApiFetch<any>(() => `/api/orders/${route.params.id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Order not found', fatal: true })
}

const justPlaced = computed(() => route.query.placed === '1')
const updating = ref(false)

const { confirmPayment, openCheckout } = usePayment()
const checkingPayment = ref(false)
const retryingPayment = ref(false)

const awaitingPayment = computed(
  () =>
    order.value?.paymentMethod === 'paymongo' &&
    order.value?.paymentStatus !== 'paid' &&
    !['cancelled', 'refunded'].includes(order.value?.status),
)

/**
 * Reconcile on return from PayMongo. The webhook is authoritative, but the
 * buyer usually gets back first — and in local development there is no public
 * URL for the webhook to reach at all.
 */
onMounted(async () => {
  const returned = route.query.paid === '1' || route.query.returned === '1'
  if (!returned || !awaitingPayment.value) return

  checkingPayment.value = true
  const paid = await confirmPayment(String(route.params.id))
  checkingPayment.value = false

  await refresh()

  if (paid) {
    $haptic.success()
    toast.success('Payment received.')
  } else {
    toast.info('We have not seen your payment yet. It may take a moment to confirm.')
  }
})

async function retryPayment() {
  retryingPayment.value = true
  try {
    const { checkoutUrl } = await $api<{ checkoutUrl: string }>(
      `/api/orders/${route.params.id}/pay`,
      { method: 'POST' },
    )
    await openCheckout(checkoutUrl, String(route.params.id))
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not reopen the payment page.'))
  } finally {
    retryingPayment.value = false
  }
}

/** The happy path, in order. Cancelled and refunded orders drop out of it and
 *  render as a plain event list instead. */
const TRACK = ['pending', 'confirmed', 'crafting', 'ready_to_ship', 'shipped', 'delivered'] as const

const derailed = computed(() => ['cancelled', 'refunded'].includes(order.value?.status))
const currentStep = computed(() => TRACK.indexOf(order.value?.status))

/** What this viewer is allowed to do next, mirroring the server state machine. */
const actions = computed(() => {
  if (!order.value) return []
  const role = order.value.viewerRole
  const status = order.value.status

  if (role === 'maker') {
    const next: Record<string, { status: string; label: string }[]> = {
      pending: [{ status: 'confirmed', label: 'Accept order' }],
      confirmed: [{ status: 'crafting', label: 'Start making' }],
      crafting: [{ status: 'ready_to_ship', label: 'Mark ready to ship' }],
      ready_to_ship: [{ status: 'shipped', label: 'Mark shipped' }],
    }
    return next[status] ?? []
  }

  if (role === 'buyer') {
    if (status === 'shipped') return [{ status: 'delivered', label: 'I received this' }]
    if (status === 'pending' || status === 'confirmed') {
      return [{ status: 'cancelled', label: 'Cancel order' }]
    }
  }

  return []
})

async function setStatus(status: string) {
  updating.value = true
  try {
    await $api(`/api/orders/${route.params.id}/status`, { method: 'PATCH', body: { status } })
    await refresh()
    $haptic.success()
    toast.success(`Order marked ${ORDER_STATUS_LABELS[status]?.toLowerCase()}.`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not update the order.'))
  } finally {
    updating.value = false
  }
}

useSeoMeta({ title: () => `Order ${order.value?.orderNumber ?? ''} · Likha Cebu` })
</script>

<template>
  <div v-if="order" class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader :title="order.orderNumber" back="/orders" />

    <div class="space-y-4 p-4">
      <div
        v-if="justPlaced"
        class="relative isolate flex items-start gap-3 overflow-hidden rounded-md bg-success/10 p-3.5 ring-1 ring-success/20"
      >
        <CraftPattern name="hablon" tone="ink" :alpha="0.12" :fade="false" />
        <PartyPopper class="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <p class="font-display text-base font-medium">Salamat, order placed</p>
          <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            The workshop has been notified. You will see the status change here as they accept it
            and start work.
          </p>
        </div>
      </div>

      <!-- Payment still outstanding -->
      <section
        v-if="awaitingPayment"
        class="rounded-md bg-warning/10 p-3.5 ring-1 ring-warning/25"
      >
        <h2 class="flex items-center gap-2 text-sm font-semibold">
          <Loader2 v-if="checkingPayment" class="size-4 animate-spin" />
          <CreditCard v-else class="size-4" />
          {{ checkingPayment ? 'Confirming your payment…' : 'Payment not completed' }}
        </h2>
        <p v-if="!checkingPayment" class="mt-1 text-sm leading-relaxed text-muted-foreground">
          This order is saved and your items are held, but it has not been paid. You can finish
          paying now, or cancel it and the stock goes back.
        </p>
        <div v-if="!checkingPayment" class="mt-3 flex gap-2">
          <Button class="flex-1" :disabled="retryingPayment" @click="retryPayment">
            <Loader2 v-if="retryingPayment" class="mr-2 size-4 animate-spin" />
            Pay {{ formatPeso(order.totalCentavos) }}
          </Button>
        </div>
      </section>

      <!-- Status -->
      <section class="rounded-md editorial-surface p-4">
        <div class="flex items-center gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-sm font-medium"
            :class="ORDER_STATUS_CLASSES[order.status]"
          >
            {{ ORDER_STATUS_LABELS[order.status] }}
          </span>
          <span class="ml-auto text-xs text-muted-foreground">
            Placed {{ formatDate(order.placedAt) }}
          </span>
        </div>

        <p class="mt-2 text-sm text-muted-foreground">{{ ORDER_STATUS_HINTS[order.status] }}</p>

        <!-- Progress track -->
        <ol v-if="!derailed" class="mt-4 space-y-0">
          <li
            v-for="(step, index) in TRACK"
            :key="step"
            class="flex gap-3"
          >
            <div class="flex flex-col items-center">
              <span
                class="grid size-6 shrink-0 place-items-center rounded-full ring-1 transition"
                :class="index <= currentStep
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-background text-muted-foreground ring-border'"
              >
                <Check v-if="index < currentStep" class="size-3.5" />
                <CircleDot v-else-if="index === currentStep" class="size-3.5" />
                <span v-else class="size-1.5 rounded-full bg-current" />
              </span>
              <span
                v-if="index < TRACK.length - 1"
                class="w-px flex-1 transition"
                :class="index < currentStep ? 'bg-primary' : 'bg-border'"
                style="min-height: 1.25rem"
              />
            </div>
            <span
              class="pb-3 text-sm"
              :class="index <= currentStep ? 'font-medium' : 'text-muted-foreground'"
            >
              {{ ORDER_STATUS_LABELS[step] }}
            </span>
          </li>
        </ol>

        <!-- Actions -->
        <div v-if="actions.length" class="mt-3 flex gap-2">
          <Button
            v-for="action in actions"
            :key="action.status"
            :variant="action.status === 'cancelled' ? 'outline' : 'default'"
            class="flex-1"
            :disabled="updating"
            @click="setStatus(action.status)"
          >
            <Loader2 v-if="updating" class="mr-2 size-4 animate-spin" />
            {{ action.label }}
          </Button>
        </div>
      </section>

      <!-- Items -->
      <section class="overflow-hidden rounded-md editorial-surface">
        <h2 class="border-b border-border px-3 py-2.5 text-sm font-semibold">Items</h2>
        <ul class="divide-y divide-border">
          <li v-for="item in order.items" :key="item.id" class="flex gap-3 p-3">
            <img
              v-if="item.imageSnapshot"
              :src="item.imageSnapshot"
              :alt="item.titleSnapshot"
              class="size-16 shrink-0 rounded-lg object-cover"
            />
            <div class="min-w-0 flex-1">
              <NuxtLink
                v-if="item.productSlug"
                :to="`/products/${item.productSlug}`"
                class="line-clamp-2 text-sm font-medium"
              >
                {{ item.titleSnapshot }}
              </NuxtLink>
              <p v-else class="line-clamp-2 text-sm font-medium">{{ item.titleSnapshot }}</p>

              <p class="text-xs text-muted-foreground">
                {{ item.makerName }}<template v-if="item.variantSnapshot"> · {{ item.variantSnapshot }}</template>
              </p>
              <p class="mt-1 text-sm">
                {{ formatPeso(item.unitPriceCentavos, { compact: true }) }} × {{ item.quantity }}
                <span class="ml-1 font-semibold text-primary-ink">
                  {{ formatPeso(item.lineTotalCentavos, { compact: true }) }}
                </span>
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Totals -->
      <section class="editorial-surface space-y-1.5 rounded-md p-3 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Subtotal</span>
          <span>{{ formatPeso(order.subtotalCentavos) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Shipping</span>
          <span>{{ formatPeso(order.shippingCentavos) }}</span>
        </div>
        <Separator class="my-1" />
        <div class="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span class="text-primary-ink">{{ formatPeso(order.totalCentavos) }}</span>
        </div>
        <p class="pt-1 text-xs text-muted-foreground">
          {{
            order.paymentMethod === 'cod'
              ? 'Cash on delivery'
              : order.paymentMethod === 'paymongo'
                ? `Paid online${order.paymentRail ? ` · ${order.paymentRail.replace('_', ' ')}` : ''}`
                : 'Card (demo)'
          }} ·
          {{ order.paymentStatus === 'paid' ? 'Paid' : 'Not yet paid' }}
        </p>
      </section>

      <!-- Address -->
      <section class="rounded-md editorial-surface p-3">
        <h2 class="flex items-center gap-1.5 pb-1.5 text-sm font-semibold">
          <MapPin class="size-4 text-muted-foreground" />Delivering to
        </h2>
        <address class="text-sm not-italic leading-relaxed text-muted-foreground">
          {{ order.shippingAddress.fullName }}<br />
          {{ order.shippingAddress.line1 }}, {{ order.shippingAddress.barangay }}<br />
          {{ order.shippingAddress.city }}, {{ order.shippingAddress.province }}
          {{ order.shippingAddress.postalCode }}<br />
          {{ order.shippingAddress.phone }}
          <template v-if="order.shippingAddress.notes">
            <br /><span class="italic">{{ order.shippingAddress.notes }}</span>
          </template>
        </address>
      </section>

      <p v-if="order.buyerNote" class="rounded-md bg-muted p-3 text-sm leading-relaxed">
        <span class="font-medium">Note for the maker:</span> {{ order.buyerNote }}
      </p>

      <!-- History -->
      <section v-if="order.events?.length" class="rounded-md editorial-surface p-3">
        <h2 class="pb-2 text-sm font-semibold">History</h2>
        <ul class="space-y-2">
          <li v-for="event in order.events" :key="event.id" class="flex gap-2 text-sm">
            <span class="w-24 shrink-0 text-xs text-muted-foreground">
              {{ formatDate(event.createdAt) }}
            </span>
            <span>
              <span class="font-medium">{{ ORDER_STATUS_LABELS[event.status] }}</span>
              <span v-if="event.note" class="block text-xs text-muted-foreground">
                {{ event.note }}
              </span>
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
