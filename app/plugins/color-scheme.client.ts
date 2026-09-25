import { THEME_STORAGE_KEY, type ThemeChoice } from '~/composables/useTheme'

/**
 * Restores the saved theme and, when set to "system", keeps up with the OS.
 *
 * The class itself is applied by an inline script in nuxt.config before first
 * paint; this rehydrates the reactive state so the settings UI shows the right
 * option, and handles the user changing their OS theme while the app is open.
 */
export default defineNuxtPlugin(() => {
  const { choice, set, apply } = useTheme()

  let stored: ThemeChoice | null = null
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null
  } catch {
    // Blocked storage — fall through to the light default.
  }

  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    choice.value = stored
  }

  apply()

  // Only relevant while following the system.
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (choice.value === 'system') set('system')
    })
})
