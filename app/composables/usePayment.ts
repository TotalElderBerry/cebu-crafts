import { Capacitor } from '@capacitor/core'

/**
 * Sends the buyer to PayMongo's hosted checkout and brings them back.
 *
 * The two targets behave differently, and getting this wrong is the main way a
 * WebView payment flow breaks:
 *
 *   Web    — a normal redirect. PayMongo returns to success_url.
 *   Mobile — `window.location` would navigate the WebView away from the bundled
 *            app, and PayMongo's return URL points at the website, so the app
 *            would never come back. Instead the session opens in an in-app
 *            browser (SFSafariViewController / Chrome Custom Tab) and we
 *            reconcile when the buyer dismisses it.
 */
export function usePayment() {
  const { $api } = useNuxtApp()

  async function openCheckout(checkoutUrl: string, orderId: string) {
    if (!Capacitor.isNativePlatform()) {
      window.location.href = checkoutUrl
      return { returned: false }
    }

    const { Browser } = await import('@capacitor/browser')

    // Resolve when the sheet closes — whether they paid, cancelled or swiped
    // it away. We do not get told which, so we ask our own server afterwards.
    const closed = new Promise<void>((resolve) => {
      const listener = Browser.addListener('browserFinished', () => {
        listener.then((l) => l.remove())
        resolve()
      })
    })

    await Browser.open({ url: checkoutUrl, presentationStyle: 'popover' })
    await closed

    await navigateTo(`/orders/${orderId}?returned=1`)
    return { returned: true }
  }

  /**
   * Ask the server to reconcile against PayMongo. Safe to call repeatedly: the
   * endpoint is idempotent and returns early once the order is paid.
   *
   * Retries a few times because the buyer often lands back before PayMongo has
   * finished settling, especially on GCash.
   */
  async function confirmPayment(orderId: string, attempts = 4) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const result = await $api<{ paymentStatus: string; changed: boolean }>(
          `/api/orders/${orderId}/payment`,
          { method: 'POST' },
        )
        if (result.paymentStatus === 'paid') return true
      } catch {
        // A failed check is not a failed payment — the webhook may still land.
      }

      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
    return false
  }

  return { openCheckout, confirmPayment }
}
