/**
 * A single $fetch instance for the whole app.
 *
 * On the web build `apiBase` is empty and requests go to the app's own Nitro
 * server. In the Capacitor build the page is served from the app bundle, so
 * `apiBase` points at the deployed origin and cookies must be sent explicitly
 * — a WebView will not attach them cross-origin otherwise.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiBase || undefined,
    credentials: 'include',
    retry: 1,
    retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],

    onResponseError({ response }) {
      // 401 anywhere means the session lapsed. Clear it so the UI stops
      // pretending the user is signed in.
      if (response.status === 401 && import.meta.client) {
        useUserSession().clear()
      }
    },
  })

  return { provide: { api } }
})
