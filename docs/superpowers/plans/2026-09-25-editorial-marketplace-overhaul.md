# Editorial Marketplace UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Likha Cebu's repeated starter-style card and pill language with an editorial marketplace interface that prioritizes real craft imagery while preserving existing routes, data behavior, and commerce flows.

**Architecture:** Keep the current Nuxt/Vue/Tailwind v4 architecture and semantic CSS-variable theme system. Make the redesign through shared shell primitives, shared browse components, and page-level composition changes, with public browsing surfaces implemented before transactional surfaces. No new UI dependency is required.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind CSS v4, shadcn-style owned primitives, Lucide icons already present in the project, existing Plus Jakarta Sans and Outfit fonts, `pnpm typecheck`, `pnpm build`.

**Spec:** `docs/superpowers/specs/2026-09-25-editorial-marketplace-overhaul-design.md`

## Global Constraints

- Do not change URL structure, route slugs, primary navigation labels, form field names, or checkout behavior.
- Do not replace the Likha Cebu logo or invent a new brand identity.
- Do not add a third-party design system or visual dependency.
- Keep the existing neutral shell and tangerine accent as the brand anchor.
- Cards and media frames use a consistent medium radius; full pills are limited to tags, filter chips, and compact status indicators.
- All automatic motion must respect reduced-motion settings.
- Preserve visible focus rings, semantic headings, alt text, keyboard navigation, and contrast targets.
- Every desktop asymmetric composition collapses to one clear column below the mobile breakpoint.
- Do not ship visible em dashes, decorative version labels, fake metrics, or placeholder brand names.

## Review Focus

- **Mobile safe areas:** fixed bottom navigation and sticky purchase bars must keep their existing safe-area offsets while their visual chrome is simplified. Test `/`, `/cart`, and `/products/:slug` at narrow width.
- **Dark mode hierarchy:** reduced borders and open layouts must still separate actionable groups in both themes. Test home, explore, product, and shop in light and dark mode.
- **Catalog edge states:** product and maker cards must still render missing images, sold-out products, made-to-order labels, ratings, long names, and missing maker data without layout collapse. Test through existing fallback props and seeded catalog data.
- **Search and filter state:** visual changes must not alter query parameters, debounced search behavior, tab state, or active filter removal. Test `/explore?q=`, category, city, made-to-order, sort, and shops view.
- **Transactional density:** cart, checkout, account, order, maker, and admin surfaces should become calmer without hiding totals, statuses, errors, or primary actions. Test loading, empty, error, signed-out, and signed-in states where available.

---

### Task 1: Shared tokens and application shell

**Files:**
- Modify: `app/assets/css/tailwind.css`
- Modify: `app/layouts/default.vue`
- Modify: `app/components/AppTopNav.vue`
- Modify: `app/components/AppBottomNav.vue`
- Modify: `app/components/AppHeader.vue`

**Interfaces:**
- Consumes: existing semantic CSS variables, `useCart`, `useUserSession`, current route matching, and safe-area utilities.
- Produces: shared shell spacing, shape, elevation, focus, and navigation treatments consumed by all pages.

- [ ] **Step 1: Inspect the current token and shell selectors before editing.**

  Confirm the existing semantic variables (`--background`, `--card`, `--border`, `--primary`, `--radius`) and the current safe-area utilities. Keep those names stable so all existing components continue to compile.

- [ ] **Step 2: Add the editorial shape and spacing rules without changing the theme contract.**

  Update the shared utilities so the default content grouping is open and medium-radius, while retaining `card-surface` for transactional surfaces. Use a documented class pattern:

  ```css
  @utility editorial-surface {
    background-color: var(--card);
    border: 1px solid color-mix(in oklab, var(--border) 72%, transparent);
  }

  @utility editorial-rule {
    border-top: 1px solid color-mix(in oklab, var(--border) 82%, transparent);
  }
  ```

  Do not add a second accent color or remove the light/dark variable overrides.

- [ ] **Step 3: Simplify the desktop top navigation into one quiet row.**

  In `AppTopNav.vue`, keep the existing link destinations, search submit behavior, cart count, signed-in actions, and signed-out actions. Replace filled hover surfaces and stacked visual emphasis with a simple active underline or accent text treatment, while retaining a bordered search field and visible focus ring.

- [ ] **Step 4: Simplify the mobile bottom navigation chrome.**

  In `AppBottomNav.vue`, keep all five tabs and their route matching. Remove the floating/pill-like visual treatment, keep the bottom border and safe-area padding, and reserve tangerine for the active tab and cart count. Keep the signed-out account indicator only if it continues to convey a real state.

- [ ] **Step 5: Make page headers and the default layout use the same rhythm.**

  In `AppHeader.vue` and `default.vue`, preserve back navigation, transparent hero mode, sentinel-based scroll state, and desktop/mobile breakpoints. Reduce the feeling of stacked bars by aligning title spacing, action spacing, and main-content top padding.

- [ ] **Step 6: Run a shell-only typecheck.**

  Run:

  ```powershell
  pnpm typecheck
  ```

  Expected: the command completes without new TypeScript errors.

---

### Task 2: Editorial browse components

**Files:**
- Modify: `app/components/SectionHeading.vue`
- Modify: `app/components/ProductCard.vue`
- Modify: `app/components/MakerCard.vue`
- Review and modify only if needed: `app/components/CraftFallback.vue`, `app/components/ShopMark.vue`

**Interfaces:**
- Consumes: existing product and maker prop shapes, `formatPeso`, `cityLabel`, `VerifiedMark`, `CraftFallback`, and `ShopMark`.
- Produces: product and maker presentation components with the same props and routes but reduced card chrome.

- [ ] **Step 1: Replace the decorative section heading treatment with a plain editorial rule.**

  Keep `title`, `to`, and `linkLabel` props unchanged. Remove the hand-drawn SVG selvedge strip from the default section heading and use a compact title row plus a single semantic divider or whitespace break. Keep the link label and arrow accessible.

- [ ] **Step 2: Make `ProductCard` image-first and metadata-light.**

  Keep the product route, alt text, fallback, sold-out behavior, made-to-order state, minimum-order state, price, compare-at price, maker, and rating. Move labels below the image where possible, keep only true state overlays on the image, and replace the outer `card-surface` container with an open image-plus-text block on browse surfaces. Preserve `active:scale` feedback and desktop image hover scale.

- [ ] **Step 3: Make `MakerCard` read as a workshop profile rather than a generic card.**

  Keep the shop route, cover image, fallback, mark, verification, location, artisan count, rating, and listing count. Remove the overlapping mark treatment if it makes the card feel like a template; use a clean cover-to-profile transition with a medium radius and sparse metadata.

- [ ] **Step 4: Verify edge-state markup manually through the existing component inputs.**

  Confirm the final markup handles these cases without changing the prop API:

  ```text
  Product: image present, no image, sold out, made to order, minOrderQty > 1, long title, no maker.
  Maker: cover present, no cover, verified, unverified, no tagline, tagline containing city, long shop name.
  ```

- [ ] **Step 5: Run typecheck after shared component changes.**

  Run:

  ```powershell
  pnpm typecheck
  ```

  Expected: PASS with unchanged prop compatibility.

---

### Task 3: Homepage composition

**Files:**
- Modify: `app/pages/index.vue`
- Use: `app/components/SectionHeading.vue`, `app/components/ProductCard.vue`, `app/components/MakerCard.vue`, existing `/public/listings/hero.webp` and `/public/listings/hero-wide.webp`

**Interfaces:**
- Consumes: existing category, maker, newest, made-to-order, refresh, error, and loading data flows.
- Produces: editorial homepage composition with unchanged API requests, links, and refresh behavior.

- [ ] **Step 1: Preserve the current page data contract before changing markup.**

  Keep the four existing fetches, `refreshAll`, load-error computation, `mtoLead`, `mtoRest`, SEO metadata, and all existing link destinations. Only change template composition and classes unless a shared component contract requires an adjustment.

- [ ] **Step 2: Recompose the hero around one image and one browse action.**

  Keep the desktop asymmetric split and mobile image-led treatment, but reduce duplicated controls and decorative pattern usage. The visible hero stack should be limited to brand label, headline, concise supporting copy, and the primary browse action. Keep custom orders as a secondary link outside the hero's main visual competition.

- [ ] **Step 3: Replace category pills with a quiet category rail.**

  Keep each category link and query string. Use text links with a subtle active/hover accent and a restrained divider rather than rounded filled chips. Preserve horizontal scrolling on mobile and wrapping on desktop.

- [ ] **Step 4: Rebuild the explanatory and custom-order section with one bounded action.**

  Keep the existing copy and `/inquiries/new` destination. Use an open editorial statement for “Why order here” and a single bounded custom-order action. Remove decorative `CraftPattern` usage from behind the action unless it remains legible and materially useful.

- [ ] **Step 5: Recompose workshop and product sections with varied hierarchy.**

  Keep the existing section titles, links, rails, grids, loading skeletons, and data loops. Use a larger lead workshop or product treatment where the data supports it, then let secondary items use quieter open cards. Do not create a three-equal-card feature strip or invent additional content.

- [ ] **Step 6: Keep all loading and error states visually consistent with the new system.**

  Preserve the catalogue error message and skeleton behavior. Replace any remaining decorative panel treatment with the shared editorial surfaces and ensure the error state still has a readable heading, explanation, and restart guidance.

- [ ] **Step 7: Verify the homepage at two viewport classes and both themes.**

  Check `/` at narrow mobile and wide desktop in light and dark mode. Confirm the hero fits the initial viewport, the category rail does not trap horizontal scrolling, all section links remain visible, and product/maker images reserve stable space.

---

### Task 4: Explore and filter surface

**Files:**
- Modify: `app/pages/explore.vue`
- Review and modify only if needed: `app/components/ExploreFilters.vue`

**Interfaces:**
- Consumes: existing route query synchronization, debounced search, product/shop fetches, category data, filters, and result states.
- Produces: calmer browse/filter presentation with identical query behavior and result contracts.

- [ ] **Step 1: Preserve all explore state and query behavior.**

  Keep `view`, `search`, `category`, `city`, `madeToOrder`, `sort`, `filtersOpen`, `debouncedSearch`, `productQuery`, `shopQuery`, `activeFilterCount`, `clearFilters`, `watchEffect`, and the canonical URL behavior unchanged.

- [ ] **Step 2: Simplify the header search and view tabs.**

  Keep the search input label and placeholder, filter button, tab labels, and route behavior. Replace filled pill tabs with a compact text-tab treatment using an accent underline or border. Keep the filter count indicator because it conveys real state.

- [ ] **Step 3: Rebuild the desktop filter rail as grouped controls.**

  Keep filters visible on desktop and in the mobile sheet. Reduce nested card surfaces and use section labels, control spacing, and one clear action. Preserve every `v-model` binding and the `show-sort` condition.

- [ ] **Step 4: Simplify active filter chips without removing state visibility.**

  Keep category, city, and made-to-order removal actions. Use compact chips only for active filters and avoid decorative chip rows when no filters are set.

- [ ] **Step 5: Apply the new result grid and empty/loading treatments.**

  Keep product and shop loops, skeleton count, total count, empty states, and error handling. Let the updated `ProductCard` and `MakerCard` carry the visual change, and remove any extra result-level panel wrapper that duplicates their hierarchy.

- [ ] **Step 6: Verify query combinations manually.**

  Check these URLs and interactions without changing the expected parameters:

  ```text
  /explore
  /explore?q=guitar
  /explore?category=...
  /explore?city=...
  /explore?madeToOrder=true
  /explore?sort=newest
  /explore?view=shops
  ```

---

### Task 5: Product and shop detail surfaces

**Files:**
- Modify: `app/pages/products/[slug].vue`
- Modify: `app/pages/shops/[slug].vue`
- Reuse: updated `SectionHeading.vue`, `ProductCard.vue`, `ShopMark.vue`

**Interfaces:**
- Consumes: existing product detail API shape, maker detail API shape, add-to-cart logic, variants, reviews, map, custom-order routes, and related-product data.
- Produces: image-led product detail and workshop profile surfaces with unchanged purchase and inquiry behavior.

- [ ] **Step 1: Preserve product detail logic before changing layout.**

  Keep active image state, variant selection, quantity limits, sold-out computation, add-to-cart behavior, product JSON-LD, SEO metadata, related products, and sticky mobile purchase behavior.

- [ ] **Step 2: Make the product gallery the dominant visual anchor.**

  Keep the mobile horizontal gallery and desktop gallery grid, but remove unnecessary nested surface treatment. Preserve explicit aspect ratios, alt text, and the existing transparent header behavior.

- [ ] **Step 3: Separate buying information from craft information through spacing.**

  Keep price, stock/lead-time status, min order, variants, maker link, description, details, inquiry, reviews, and purchase controls. Replace multiple stacked cards with open sections and sparse rules, keeping the primary add-to-cart action visually dominant.

- [ ] **Step 4: Rework maker and details blocks without changing content.**

  Keep the maker route and all location/verification data. Use a quieter workshop link and a grouped details layout that does not look like a generic bordered table. Preserve review readability and timestamps.

- [ ] **Step 5: Apply the same hierarchy to the shop page.**

  Keep cover, shop mark, verification, location, artisan count, years, rating, unverified notice, custom/wholesale inquiry, story, map, catalogue, and empty state. Remove decorative pattern dependence from the story heading and make the catalogue the dominant follow-on surface.

- [ ] **Step 6: Verify purchase and inquiry affordances.**

  Confirm the add-to-cart button, quantity stepper, variants, custom-order link, maker link, map, related products, and mobile sticky action remain reachable and readable in both themes.

---

### Task 6: Transactional and account consistency pass

**Files:**
- Review and modify where needed: `app/pages/cart.vue`
- Review and modify where needed: `app/pages/checkout.vue`
- Review and modify where needed: `app/pages/account.vue`
- Review and modify where needed: `app/pages/orders/index.vue`
- Review and modify where needed: `app/pages/orders/[id].vue`
- Review and modify where needed: `app/pages/maker/index.vue`
- Review and modify where needed: `app/pages/maker/orders.vue`
- Review and modify where needed: `app/pages/maker/products/index.vue`
- Review and modify where needed: `app/pages/maker/products/new.vue`
- Review and modify where needed: `app/pages/admin/index.vue`

**Interfaces:**
- Consumes: existing auth middleware, API fetches, cart/payment logic, order status maps, maker actions, and admin actions.
- Produces: consistent transactional visual treatment without changing business logic or form contracts.

- [ ] **Step 1: Inventory each page's real hierarchy before editing.**

  Identify the primary action, status/error boundaries, totals, and data grouping on each page. Keep cards only where they communicate one of those boundaries.

- [ ] **Step 2: Remove decorative marketing treatment from transactional pages.**

  Remove pattern backgrounds, excess tinted promo panels, and repeated rounded containers while preserving all copy, form labels, buttons, status badges, and links.

- [ ] **Step 3: Preserve fixed mobile actions and safe-area spacing.**

  Keep cart checkout bar, product purchase bar, and any page-specific fixed action offsets. Reuse the shared shell surface and border treatment from Task 1.

- [ ] **Step 4: Normalize list rows and status hierarchy.**

  Keep order status colors and labels, maker publish state, admin verification state, loading skeletons, empty states, and error toasts. Reduce visual noise by making row titles and primary actions carry the hierarchy.

- [ ] **Step 5: Verify auth and empty-state branches.**

  Check signed-out account, signed-in account, empty cart, populated cart, no orders, populated orders, no listings, populated listings, and form validation states without changing middleware or API behavior.

---

### Task 7: Verification and delivery

**Files:**
- Modify: any files required by verification findings from Tasks 1-6
- Review: `docs/superpowers/specs/2026-09-25-editorial-marketplace-overhaul-design.md`
- Review: `docs/superpowers/plans/2026-09-25-editorial-marketplace-overhaul.md`

**Interfaces:**
- Consumes: completed UI changes and the acceptance criteria from the design spec.
- Produces: a verified build with documented remaining limitations, if any.

- [ ] **Step 1: Run typecheck.**

  Run:

  ```powershell
  pnpm typecheck
  ```

  Expected: PASS.

- [ ] **Step 2: Run the production build.**

  Run:

  ```powershell
  pnpm build
  ```

  Expected: PASS with no route-generation or CSS compilation errors.

- [ ] **Step 3: Run a visible local preview.**

  Start the existing dev server with:

  ```powershell
  pnpm dev --host 127.0.0.1
  ```

  Inspect `/`, `/explore`, a product route, a shop route, `/cart`, `/account`, and one maker route at mobile and desktop widths. If the browser preview is unavailable, record that limitation and rely on typecheck/build plus deterministic route inspection.

- [ ] **Step 4: Check the design-taste pre-flight.**

  Confirm the final surfaces use one accent color, one shape system, no em dashes in visible copy, no decorative version labels, no repeated three-card feature rows, no unnecessary pills, no fake metrics, real images with stable aspect ratios, reduced-motion-safe transitions, and paired light/dark tokens.

- [ ] **Step 5: Report exact verification evidence.**

  Include the commands run, their results, the routes inspected, and any blocked visual check. Do not claim completion without output from the final verification commands.

