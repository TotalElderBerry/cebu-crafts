import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ph.cebu.likha',
  appName: 'Likha Cebu',
  // `nuxt generate` with NUXT_MOBILE=true writes the SPA here.
  webDir: '.output/public',
  // NOTE: deliberately no `server.url`. Pointing the WebView at a live site is
  // what gets apps rejected under App Store guideline 4.2 and gives you a white
  // screen with no connection. Assets ship inside the binary; only /api goes out.
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    Keyboard: {
      // Let CSS handle the keyboard instead of the WebView resizing itself,
      // which is the usual source of layout jank on iOS.
      resize: 'native',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f3f3f2',
    },
  },
}

export default config
