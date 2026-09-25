export type ThemeChoice = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'likha.theme'

/**
 * Light / dark / follow-system, persisted per device.
 *
 * The default is **light**, not system. Dark mode existed in the stylesheet for
 * a while but nothing ever applied it, so every user had a light app; quietly
 * switching them to system-follow changes the product out from under them. Dark
 * is opt-in, and "system" is there for people who want it.
 */
export function useTheme() {
  const choice = useState<ThemeChoice>('theme', () => 'light')

  const prefersDark = () =>
    import.meta.client && window.matchMedia('(prefers-color-scheme: dark)').matches

  const resolved = computed<'light' | 'dark'>(() =>
    choice.value === 'system' ? (prefersDark() ? 'dark' : 'light') : choice.value,
  )

  function apply() {
    if (!import.meta.client) return
    const dark = resolved.value === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    // Tells the browser to theme form controls and scrollbars to match.
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }

  function set(next: ThemeChoice) {
    choice.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Private mode or blocked storage — the choice just will not persist.
      }
      apply()
    }
  }

  return { choice, resolved, set, apply }
}
