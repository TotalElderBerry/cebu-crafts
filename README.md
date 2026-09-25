# Likha Cebu

A mobile marketplace that lets Cebu craft makers sell directly to buyers, instead of through
exporters, consolidators and tiangge resellers who take most of the margin.

Built as a **Nuxt 4 web app** that is also packaged as a **WebView mobile app** with Capacitor —
one codebase, two targets.

---

## The problem it addresses

Cebu has real craft clusters — guitars in Abuno (Lapu-Lapu), footwear in Carcar, rattan in Mandaue,
shellcraft on Olango, weaving in Argao. Most of these makers share the same four obstacles:

| Obstacle | What this system does about it |
| --- | --- |
| No direct market access; sales go through middlemen | Every shop is the workshop itself. Makers set their own prices. |
| Custom and bulk deals happen in unrecorded Messenger threads | A structured **inquiry → quote → accept** flow, with the price and lead time written down. |
| Made-to-order work does not fit normal e-commerce | First-class made-to-order listings with a committed lead time and a `crafting` order state. |
| Buyers cannot tell a real workshop from a reseller | Admin-verified maker profiles with location, artisan count, and the maker's own story. |

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Nuxt 4** (Vue 3 + Nitro) | Vue fullstack — SFC frontend and API routes in one repo |
| Styling | **Tailwind CSS v4** | CSS-first config, no `tailwind.config.js` |
| Components | **shadcn-vue** (reka-ui) | Owned, editable components rather than a locked dependency |
| Database | **Neon Postgres** | Serverless Postgres over HTTP — no connection pool to leak |
| ORM | **Drizzle** | Typed SQL, migrations from the schema file |
| Auth | **nuxt-auth-utils** | Sealed cookie sessions, scrypt password hashing |
| Payments | **PayMongo** Checkout Sessions | GCash, Maya, GrabPay, cards — without touching card data |
| Mobile | **Capacitor 7** | WebView shell with native back button, status bar, keyboard, haptics |

---

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Create a Neon database

Sign up at [console.neon.tech](https://console.neon.tech), create a project, and copy the
**pooled** connection string (the host contains `-pooler`).

```bash
cp .env.example .env
```

Paste the connection string into `DATABASE_URL`, then generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put that in `NUXT_SESSION_PASSWORD`.

### 3. Create the tables and seed demo data

```bash
pnpm db:push
pnpm db:seed
```

This creates 8 workshops, 21 listings, 11 craft categories and a sample quote thread.

### 4. Run it

```bash
pnpm dev
```

Open <http://localhost:3000>. Use a phone viewport — the layout is mobile-first.

### Demo accounts

All use the password `password123`:

| Email | Role |
| --- | --- |
| `andrea@example.com` | Buyer |
| `rene@abunoguitars.ph` | Maker — Abuno Guitar Works |
| `joel@tamborattan.ph` | Maker — Tambo Rattan Studio (has a live bulk enquiry) |
| `admin@likhacebu.ph` | Admin — can verify shops |

---

## Building the mobile app

The mobile target is the **same code** built as a static SPA and bundled into a native shell. It
talks to your deployed Nitro API over the network.

### 1. Deploy the web app first

Deploy to Vercel, Netlify or any Node host. Note the origin, e.g. `https://likha.vercel.app`.

### 2. Point the mobile build at it

```env
NUXT_PUBLIC_API_BASE="https://likha.vercel.app"
```

### 3. Add the native platforms (once)

```bash
pnpm exec cap add android
pnpm exec cap add ios
```

### 4. Build and open

```bash
pnpm mobile:android
pnpm mobile:ios
```

These run `nuxt generate` with `NUXT_MOBILE=true` (which flips `ssr: false`), sync the output into
the native project, and open Android Studio / Xcode.

> **Note on `capacitor.config.ts`:** there is deliberately no `server.url`. Pointing the WebView at
> a live site is what gets apps rejected under App Store guideline 4.2, and it gives users a white
> screen with no connection. Assets ship inside the binary; only `/api` calls go out.

See [`docs/mobile.md`](docs/mobile.md) for what was done to make the WebView feel native.

---

## Payments

Cash on delivery works with no setup. For GCash, Maya, GrabPay and cards, add a PayMongo test key:

```env
PAYMONGO_SECRET_KEY="sk_test_..."
PAYMONGO_WEBHOOK_SECRET="whsk_..."
```

Without a key the checkout falls back to a simulated card, so the app still demos end to end.

Card details are entered on PayMongo's hosted page and never reach this application, which keeps it
outside PCI scope. Payment is confirmed two ways — a signed webhook (authoritative) and a polling
fallback when the buyer returns — so it also works in local development with no public URL.

Full setup, the sequence diagram and the security properties are in
[`docs/payments.md`](docs/payments.md).

---

## Project layout

```
app/
  assets/css/tailwind.css   theme tokens + the "not a website" CSS reset
  components/               ProductCard, MakerCard, AppBottomNav, AppHeader…
  components/ui/            shadcn-vue primitives
  composables/              useCart, useApiFetch
  lib/                      cn, formatPeso, Cebu city labels, status labels
  middleware/               auth, maker
  pages/                    file-based routes
  plugins/                  api ($fetch instance), capacitor (native bridge)
server/
  api/                      Nitro endpoints
  database/schema.ts        Drizzle schema — the single source of truth
  database/seed.ts          demo data
  utils/guards.ts           requireAuth / requireMaker / requireAdmin, shipping
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build (SSR web) |
| `pnpm typecheck` | `vue-tsc` over the whole project |
| `pnpm db:push` | Push the schema to Neon (no migration files) |
| `pnpm db:generate` | Generate SQL migrations instead |
| `pnpm db:studio` | Drizzle Studio — browse the data |
| `pnpm db:seed` | Reset and reseed demo data |
| `pnpm db:validate` | Check the seed data offline — no database needed |
| `pnpm test:signature` | Verify the PayMongo webhook signature logic |
| `pnpm mobile:build` | Static SPA + `cap sync` |
| `pnpm mobile:android` / `:ios` | Build, sync, open the native IDE |

---

## Design decisions worth knowing

**Money is stored as integer centavos.** `priceCentavos`, never a float. Forms take pesos and
convert at the boundary.

**Prices are re-read from the database at checkout.** The client sends product IDs and quantities
only. A stale cart snapshot can look wrong for a moment; it can never underpay.

**Order status is a state machine.** `server/api/orders/[id]/status.patch.ts` declares both the
legal transitions and who may make each one. Buyers confirm delivery, not makers — a seller
closing out their own COD delivery is where disputes start.

**Checkout writes through `db.batch()`.** Neon's HTTP driver has no interactive transactions, so the
order, its line items, the first event and the stock decrements are sent as one batch, which Neon
runs inside a single server-side transaction. That is why the handler generates its own UUIDs.

**Order items carry snapshots.** Title, image, variant and unit price are copied onto the line so a
receipt does not change when the maker later edits the listing.

**Made-to-order is not "out of stock".** Those listings have no stock limit but must declare a lead
time, and they skip the stock decrement entirely.

---

## What is stubbed

- **Maker payouts.** PayMongo is wired up (see below), but funds land in one account — there is no
  automatic split to individual makers. A real multi-vendor setup needs PayMongo's marketplace
  product or an out-of-band settlement process.
- **Refunds.** An admin can set an order to `refunded`, but it does not call PayMongo's refund API.
- **Expiring unpaid orders.** Stock is reserved at order time and returned on cancellation, but
  nothing yet auto-cancels a PayMongo order abandoned for 24 hours.
- **Images.** Listings take pasted URLs. Wire up Cloudinary (the config keys are already in
  `.env.example`) for camera uploads.
- **Shipping rates.** `computeShippingCentavos` in `server/utils/guards.ts` is a flat rate by
  region. Replace with a J&T or Lalamove rate API.
- **Notifications.** No push or email yet. Capacitor's push plugin is the natural next step, since
  makers need to know an order arrived.
