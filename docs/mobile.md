# Making the WebView feel native

The mobile app is a WebView. That is a deliberate trade — one codebase, one team, one deploy — but
it only works if you close the gap between "web page in a box" and "app". This is what was done and
what it costs.

## Build topology

```
                  ┌─────────────────────────────┐
                  │  Nuxt 4 codebase (one repo) │
                  └──────────┬──────────────────┘
             pnpm build      │      NUXT_MOBILE=true pnpm generate
        ┌───────────────────┘└──────────────────┐
        ▼                                        ▼
┌───────────────────┐                  ┌──────────────────────┐
│ SSR site (Nitro)  │◀──── /api ───────│ Static SPA in the    │
│ Vercel / Node     │    over HTTPS    │ Capacitor binary     │
│ + serves /api     │                  │ (iOS + Android)      │
└───────────────────┘                  └──────────────────────┘
```

The web build renders on the server so Google can index maker profiles — tourists and the diaspora
find these workshops through search. The mobile build is `ssr: false`, bundled into the app, and
calls the same API over the network.

Assets ship **inside** the binary. There is no `server.url` in `capacitor.config.ts`, because:

1. Apple rejects pure remote-URL wrappers under guideline 4.2.
2. A remote URL means a white screen on cold start and a hard failure offline.

## What was done

### Viewport and safe areas

`viewport-fit=cover` in `nuxt.config.ts` is what makes `env(safe-area-inset-*)` resolve to real
numbers. Without it the tab bar sits under the iOS home indicator and the header under the notch.

Custom Tailwind utilities in `app/assets/css/tailwind.css`:

```css
@utility pt-safe { padding-top: calc(env(safe-area-inset-top, 0px) + var(--pt-extra, 0px)); }
@utility pb-safe { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--pb-extra, 0px)); }
```

### The "this is a website" tells, removed

All in the `@layer base` block:

| Tell | Fix |
| --- | --- |
| Blue flash on every tap | `-webkit-tap-highlight-color: transparent` |
| Long-press "Save image" menu | `-webkit-touch-callout: none` |
| Rubber-band past the end of the page | `overscroll-behavior-y: none` |
| 300 ms delay before a tap registers | `touch-action: manipulation` |
| Text selection when dragging the UI | `select-none` on buttons, links, nav |
| Viewport zooms when a field is focused | `input { font-size: max(16px, 1rem) }` |
| `:hover` sticking after a tap | Hover transitions disabled under `@media (hover: none)` |
| Font resizes on rotation | `-webkit-text-size-adjust: 100%` |
| Visible scrollbars on carousels | `.no-scrollbar` |

Text that people actually want to select — descriptions, maker stories, messages — is opted back in
with `.selectable`.

### Navigation

Bottom tab bar, not a top nav. On a phone the bottom third is the only comfortable reach zone, and
it matches every app the buyer already has. Tab targets are ≥ 52 px tall.

Headers are translucent with `backdrop-blur` and only grow a border once content scrolls under
them (`AppHeader.vue`) — a small thing, but static bars read as web.

### Native bridge

`app/plugins/capacitor.client.ts`, all no-ops on the web build:

- **Android hardware back** → `router.back()`, and `App.exitApp()` only at the root. Without this,
  back closes the whole app from any screen. This is the single most obvious tell on Android.
- **Status bar** style and colour, following the system light/dark scheme.
- **Keyboard height** published as `--keyboard-height` so sticky footers (the inquiry composer)
  lift above the keyboard instead of being covered. This is the usual iOS WebView layout bug.
- **Haptics** provided as `$haptic` — light on taps, success on add-to-cart and order placement.
  Cheap, and it is most of what separates "responsive" from "native" on a phone.

### Perceived speed

- Skeletons instead of spinners on every list.
- Cart state is in `localStorage`, so it renders instantly and survives a cold start.
- `active:scale-[0.98]` on cards and buttons — immediate physical feedback while the network works.
- Search input is debounced 350 ms so typing does not fire a request per keystroke on mobile data.

## What a WebView still cannot match

Worth stating plainly rather than discovering during a demo:

- **Gesture-driven interactions.** Interactive back-swipe that tracks your finger,
  swipe-to-dismiss sheets, true rubber-banding. Approximations only.
- **Long list performance.** A few hundred rows is fine; several thousand virtualised rows are
  noticeably worse than native.
- **Keyboard behaviour on iOS.** Improved by the plugin above, not eliminated.
- **Deep OS integration.** Widgets, Live Activities, share-sheet targets. These need native code in
  the shell alongside the WebView.

For a catalogue-and-checkout app, none of these are load-bearing. For a gesture-heavy or
animation-heavy app, they would be.

## App Store guideline 4.2

Apple rejects apps that are a repackaged website with no native functionality. The mitigations
already in place: assets bundled rather than remote, hardware back handling, status bar control,
keyboard handling, and haptics. Before submitting, add at least one more genuinely native
capability — **push notifications** is the obvious one, since makers need to know an order arrived.
Google Play is considerably more relaxed about this.
