import type { UseFetchOptions } from 'nuxt/app'

/**
 * useFetch bound to the same base URL and credentials as `$api`, so data
 * fetching behaves identically in the browser and inside the Capacitor shell.
 */
export function useApiFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {},
) {
  const config = useRuntimeConfig()

  return useFetch(url, {
    ...options,
    baseURL: config.public.apiBase || undefined,
    credentials: 'include',
    $fetch: useNuxtApp().$api as typeof $fetch,
  } as UseFetchOptions<T>)
}

/** Turns an H3 error into something worth showing a person. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  const e = error as { data?: { statusMessage?: string; message?: string }; statusMessage?: string }
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || fallback
}
