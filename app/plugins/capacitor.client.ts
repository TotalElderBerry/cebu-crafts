import { Capacitor } from '@capacitor/core'

type Haptic = { light: () => void; medium: () => void; success: () => void }

const noopHaptic: Haptic = { light: () => {}, medium: () => {}, success: () => {} }

/**
 * Everything that makes the WebView behave like an app rather than a browser
 * tab. All of it degrades to a no-op on the web build, so the same components
 * ship to both targets without branching.
 */
export default defineNuxtPlugin(async () => {
  const isNative = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android'

  useState('native', () => ({ isNative, platform }))
  document.documentElement.dataset.platform = platform

  if (!isNative) {
    return { provide: { haptic: noopHaptic } }
  }

  const router = useRouter()

  const [{ App }, { StatusBar, Style }, { Keyboard }, { Haptics, ImpactStyle }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/keyboard'),
    import('@capacitor/haptics'),
  ])

  // --- Android hardware back button -------------------------------------
  // Without this, back closes the whole app from any screen — the single most
  // obvious "this is a website" tell on Android.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && router.currentRoute.value.path !== '/') {
      router.back()
    } else {
      App.exitApp()
    }
  })

  // --- Status bar -------------------------------------------------------
  const applyStatusBar = (dark: boolean) => {
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
    if (platform === 'android') {
      StatusBar.setBackgroundColor({ color: dark ? '#1e1d1c' : '#f3f3f2' }).catch(() => {})
    }
  }
  const scheme = window.matchMedia('(prefers-color-scheme: dark)')
  applyStatusBar(scheme.matches)
  scheme.addEventListener('change', (e) => applyStatusBar(e.matches))

  // --- Keyboard ---------------------------------------------------------
  // Expose the keyboard height as a CSS variable so sticky footers lift above
  // it instead of being covered — the usual iOS WebView layout bug.
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
    document.documentElement.dataset.keyboard = 'open'
  })
  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--keyboard-height', '0px')
    delete document.documentElement.dataset.keyboard
  })

  // --- Haptics ----------------------------------------------------------
  // Cheap, and it is most of what separates "responsive" from "native".
  const haptic: Haptic = {
    light: () => void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
    medium: () => void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
    success: () => void Haptics.notification().catch(() => {}),
  }

  return { provide: { haptic } }
})
