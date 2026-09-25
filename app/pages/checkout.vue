<script setup lang="ts">
import { Banknote, CreditCard, Loader2, Smartphone } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatPeso } from '~/lib/utils'

definePageMeta({ middleware: 'auth' })

const cart = useCart()
const { user } = useUserSession()
const { $api, $haptic } = useNuxtApp()
const { openCheckout } = usePayment()

// Mirrors whether a PayMongo secret key is configured on the server. Without
// one the page offers the mock card instead, so a fresh clone still demos.
const paymongoEnabled = useRuntimeConfig().public.paymongoEnabled

// The cart lives in localStorage and, to stay SSR-safe, only reads it on mount.
// So it always looks empty during setup — bouncing to /cart here would make
// checkout unreachable. Wait until it has actually hydrated before judging.
const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
  if (cart.isEmpty.value) navigateTo('/cart')
})

const submitting = ref(false)
const errors = ref<Record<string, string>>({})

const form = reactive({
  fullName: user.value?.name ?? '',
  phone: '',
  line1: '',
  barangay: '',
  city: '',
  province: 'Cebu',
  postalCode: '',
  notes: '',
  paymentMethod: 'cod' as 'cod' | 'mock_card' | 'paymongo',
  buyerNote: '',
})

/** PayMongo will not take anything under PHP 100. */
const PAYMONGO_MIN_CENTAVOS = 10_000

/** Mirrors computeShippingCentavos on the server so the buyer sees the real
 *  number before they commit. The server value is authoritative. */
const shippingCentavos = computed(() => {
  const province = form.province.trim().toLowerCase()
  const city = form.city.trim().toLowerCase()
  if (!province) return 0

  if (province === 'cebu') {
    const metro = ['cebu city', 'mandaue', 'mandaue city', 'lapu-lapu', 'lapu-lapu city', 'talisay', 'talisay city', 'consolacion', 'cordova']
    return metro.includes(city) ? 8000 : 15000
  }
  const visayas = ['bohol', 'negros oriental', 'negros occidental', 'leyte', 'samar', 'iloilo', 'aklan', 'antique', 'capiz', 'guimaras', 'southern leyte', 'biliran', 'siquijor']
  return visayas.includes(province) ? 22000 : 28000
})

const total = computed(() => cart.subtotalCentavos.value + shippingCentavos.value)

const belowOnlineMinimum = computed(
  () => paymongoEnabled && total.value > 0 && total.value < PAYMONGO_MIN_CENTAVOS,
)

// Silently leaving an unusable option selected would fail only on submit.
watch(belowOnlineMinimum, (below) => {
  if (below && form.paymentMethod === 'paymongo') form.paymentMethod = 'cod'
})

async function placeOrder() {
  errors.value = {}
  submitting.value = true

  try {
    const order = await $api<{ id: string; orderNumber: string; checkoutUrl: string | null }>('/api/orders', {
      method: 'POST',
      body: {
        items: cart.lines.value.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
        })),
        shippingAddress: {
          fullName: form.fullName,
          phone: form.phone,
          line1: form.line1,
          barangay: form.barangay,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          notes: form.notes || undefined,
        },
        paymentMethod: form.paymentMethod,
        buyerNote: form.buyerNote || undefined,
      },
    })

    // The order exists on the server now, so the cart has done its job. Keeping
    // it would risk a duplicate order if the payment page is reloaded.
    cart.clear()
    $haptic.success()

    if (order.checkoutUrl) {
      await openCheckout(order.checkoutUrl, order.id)
      return
    }

    await navigateTo(`/orders/${order.id}?placed=1`)
  } catch (error: any) {
    // Zod field errors come back in data.data; anything else is a plain message.
    const issues = error?.data?.data?.issues as { path: (string | number)[]; message: string }[] | undefined
    if (issues?.length) {
      for (const issue of issues) {
        errors.value[String(issue.path.at(-1))] = issue.message
      }
      toast.error('Check the highlighted fields.')
    } else {
      toast.error(apiErrorMessage(error, 'Could not place the order.'))
    }
    $haptic.medium()
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Checkout · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="Checkout" back="/cart" />

    <!-- Held until the cart has read localStorage, so the totals are never
         rendered as zero and then corrected a frame later. -->
    <div v-if="!hydrated" class="space-y-3 p-4">
      <Skeleton class="h-6 w-40 rounded" />
      <Skeleton v-for="n in 5" :key="n" class="h-11 rounded-md" />
      <Skeleton class="h-28 rounded-md" />
    </div>

    <form v-else class="space-y-5 p-4" @submit.prevent="placeOrder">
      <!-- Delivery -->
      <section class="space-y-3">
        <h2 class="font-semibold">Delivery address</h2>

        <div class="space-y-1">
          <Label for="fullName">Full name</Label>
          <Input id="fullName" v-model="form.fullName" autocomplete="name" required />
          <p v-if="errors.fullName" class="text-xs text-destructive">{{ errors.fullName }}</p>
        </div>

        <div class="space-y-1">
          <Label for="phone">Mobile number</Label>
          <Input
            id="phone"
            v-model="form.phone"
            type="tel"
            inputmode="numeric"
            autocomplete="tel"
            placeholder="09171234567"
            required
          />
          <p v-if="errors.phone" class="text-xs text-destructive">{{ errors.phone }}</p>
          <p v-else class="text-xs text-muted-foreground">
            The courier and the maker will use this, so make sure it can receive calls.
          </p>
        </div>

        <div class="space-y-1">
          <Label for="line1">House / street</Label>
          <Input id="line1" v-model="form.line1" autocomplete="address-line1" required />
          <p v-if="errors.line1" class="text-xs text-destructive">{{ errors.line1 }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="barangay">Barangay</Label>
            <Input id="barangay" v-model="form.barangay" required />
            <p v-if="errors.barangay" class="text-xs text-destructive">{{ errors.barangay }}</p>
          </div>
          <div class="space-y-1">
            <Label for="city">City / municipality</Label>
            <Input id="city" v-model="form.city" autocomplete="address-level2" required />
            <p v-if="errors.city" class="text-xs text-destructive">{{ errors.city }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="province">Province</Label>
            <Input id="province" v-model="form.province" autocomplete="address-level1" required />
            <p v-if="errors.province" class="text-xs text-destructive">{{ errors.province }}</p>
          </div>
          <div class="space-y-1">
            <Label for="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              v-model="form.postalCode"
              inputmode="numeric"
              maxlength="4"
              autocomplete="postal-code"
              required
            />
            <p v-if="errors.postalCode" class="text-xs text-destructive">{{ errors.postalCode }}</p>
          </div>
        </div>

        <div class="space-y-1">
          <Label for="notes">Landmark or delivery note (optional)</Label>
          <Textarea id="notes" v-model="form.notes" rows="2" />
        </div>
      </section>

      <Separator />

      <!-- Payment -->
      <section class="space-y-2">
        <h2 class="font-semibold">Payment</h2>

        <label
          class="flex cursor-pointer items-start gap-3 rounded-md editorial-surface p-3 transition"
          :class="form.paymentMethod === 'cod' ? 'bg-primary/8 ring-primary' : 'bg-card ring-border'"
        >
          <input v-model="form.paymentMethod" type="radio" value="cod" class="sr-only" />
          <Banknote class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <span>
            <span class="block text-sm font-medium">Cash on delivery</span>
            <span class="block text-xs leading-relaxed text-muted-foreground">
              Pay the courier when it arrives. Most buyers here use this.
            </span>
          </span>
        </label>

        <!-- Real gateway, when a PayMongo key is configured -->
        <label
          v-if="paymongoEnabled"
          class="flex items-start gap-3 rounded-md editorial-surface p-3 transition"
          :class="[
            form.paymentMethod === 'paymongo' ? 'bg-primary/8 ring-primary' : 'bg-card ring-border',
            belowOnlineMinimum ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
          ]"
        >
          <input
            v-model="form.paymentMethod"
            type="radio"
            value="paymongo"
            class="sr-only"
            :disabled="belowOnlineMinimum"
          />
          <Smartphone class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <span>
            <span class="block text-sm font-medium">Pay online</span>
            <span class="block text-xs leading-relaxed text-muted-foreground">
              GCash, Maya, GrabPay or card. You finish on PayMongo's secure page, so your card
              details never touch this app.
            </span>
            <span v-if="belowOnlineMinimum" class="mt-1 block text-xs font-medium text-warning">
              Online payment needs a total of at least {{ formatPeso(PAYMONGO_MIN_CENTAVOS) }}.
              Use cash on delivery for this order.
            </span>
          </span>
        </label>

        <!-- Keyless fallback so the app still demos without credentials -->
        <label
          v-else
          class="flex cursor-pointer items-start gap-3 rounded-md editorial-surface p-3 transition"
          :class="form.paymentMethod === 'mock_card' ? 'bg-primary/8 ring-primary' : 'bg-card ring-border'"
        >
          <input v-model="form.paymentMethod" type="radio" value="mock_card" class="sr-only" />
          <CreditCard class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <span>
            <span class="block text-sm font-medium">
              Card <Badge variant="secondary" class="ml-1 align-middle">Demo</Badge>
            </span>
            <span class="block text-xs leading-relaxed text-muted-foreground">
              Simulated: no card details are collected and no money moves. Add a
              <code>PAYMONGO_SECRET_KEY</code> to enable real GCash and card payments.
            </span>
          </span>
        </label>
      </section>

      <Separator />

      <!-- Summary -->
      <section class="space-y-2">
        <h2 class="font-semibold">Summary</h2>
        <dl class="editorial-surface space-y-1.5 rounded-md p-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Subtotal ({{ cart.count.value }} items)</dt>
            <dd>{{ formatPeso(cart.subtotalCentavos.value) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Shipping</dt>
            <dd>{{ shippingCentavos ? formatPeso(shippingCentavos) : 'Not yet set' }}</dd>
          </div>
          <Separator class="my-1" />
          <div class="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd class="text-primary-ink">{{ formatPeso(total) }}</dd>
          </div>
        </dl>

        <div class="space-y-1">
          <Label for="buyerNote">Note for the maker (optional)</Label>
          <Textarea
            id="buyerNote"
            v-model="form.buyerNote"
            rows="2"
            placeholder="Engraving, colour preference, gift note…"
          />
        </div>
      </section>

      <Button type="submit" class="h-12 w-full text-base" :disabled="submitting">
        <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />
        {{
          submitting
            ? form.paymentMethod === 'paymongo'
              ? 'Opening payment…'
              : 'Placing order…'
            : form.paymentMethod === 'paymongo'
              ? `Pay ${formatPeso(total)}`
              : `Place order · ${formatPeso(total)}`
        }}
      </Button>

      <p class="pb-4 text-center text-xs leading-relaxed text-muted-foreground">
        Each workshop confirms its own items. You will see the status per order in Account →
        Orders.
      </p>
    </form>
  </div>
</template>
