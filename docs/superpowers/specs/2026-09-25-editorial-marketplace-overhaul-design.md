# Editorial Marketplace UI Overhaul

Date: 2026-09-25
Status: Draft for review

## Design read

Likha Cebu is a consumer marketplace for handmade goods and direct maker relationships. The redesign should feel editorial and place-aware, with the product photography and maker stories carrying the character instead of generic component decoration.

Design dials:

- `DESIGN_VARIANCE: 7` - asymmetry and varied media proportions, while keeping browsing predictable.
- `MOTION_INTENSITY: 4` - restrained entry and feedback motion, never motion for its own sake.
- `VISUAL_DENSITY: 4` - enough information for commerce, with more breathing room around the important objects.

## Goals

1. Make Likha Cebu feel like a distinct craft marketplace rather than a customized starter UI.
2. Put real product and workshop imagery ahead of generic card chrome.
3. Reduce the repeated rounded-card, pill, border, and muted-panel patterns that currently flatten the hierarchy.
4. Preserve the existing commerce behavior, accessibility, responsive behavior, theme toggle, and direct-maker positioning.
5. Keep the redesign compatible with the current Nuxt, Vue, Tailwind v4, and owned shadcn-style component setup.

## Non-goals and preservation rules

- Do not change URL structure, route slugs, primary navigation labels, form field names, or checkout behavior.
- Do not replace the Likha Cebu logo or invent a new brand identity.
- Do not add a third-party design system or visual dependency.
- Do not rewrite the product catalog, maker data, legal copy, or transactional copy as part of the visual pass.
- Do not introduce fake testimonials, fake metrics, decorative status dots, version labels, or generated product previews.

## Visual system

### Theme and color

Keep the existing neutral shell and tangerine accent as the brand anchor, but reduce how often the accent appears. Tangerine is reserved for primary actions, prices, selected states, and meaningful links. Surfaces rely on the existing semantic CSS variables so light and dark mode remain paired.

The page uses one visual theme at a time. No alternating light and dark section blocks. Decorative patterns are removed from the primary hero and used only when they clarify a real craft or material reference.

### Typography

Keep the existing self-hosted Plus Jakarta Sans and Outfit pairing. Use Outfit for page titles and short section headlines, and Plus Jakarta Sans for navigation, body copy, metadata, and controls. Reduce headline size where hierarchy can come from spacing and image scale instead.

### Shape and material

Adopt a documented shape rule:

- Cards and media frames use a consistent medium radius.
- Buttons and filters use a smaller radius, not a universal pill.
- Full pills are limited to tags, filter chips, and compact status indicators.
- Elevation is reserved for floating or actionable surfaces. Most content groups use spacing and one sparse divider instead of a container.

The existing `card-surface` utility remains available for transactional hierarchy, but marketing and browse sections should prefer open layout, image framing, or a single hairline.

### Motion

Keep the current page transition and pull-to-refresh behavior. Use only small opacity and translate reveals for sections already using `RevealOnScroll`, plus tactile active states for buttons and product links. All automatic motion must respect reduced-motion settings.

## Information architecture

The existing IA remains unchanged:

- Home: `/`
- Browse: `/explore`
- Product detail: `/products/:slug`
- Shop detail: `/shops/:slug`
- Cart and checkout: `/cart`, `/checkout`
- Account and order flows: existing routes
- Maker and admin flows: existing routes

Desktop and mobile navigation keep their current destinations. The redesign changes hierarchy and visual treatment, not the navigation model.

## Surface design

### Shared shell

- Simplify the desktop top navigation into one clear row with logo, browse/search, and account/cart actions.
- Keep the mobile bottom navigation, but reduce surrounding container treatment so it reads as application chrome rather than a floating pill.
- Increase page-level horizontal rhythm on desktop and keep mobile content flush to a deliberate inset.
- Establish shared spacing tokens for hero, section, and card gaps instead of per-page ad hoc values.

### Homepage

The homepage becomes the main expression of the new visual language.

- Hero: asymmetric split with one strong workshop image, short headline, concise supporting line, and one primary browse action. Keep the mobile image-led treatment but remove duplicated search and decorative scrim complexity where the image can carry the composition.
- Categories: replace the rounded chip row with a quieter horizontal text rail or compact link list. The selected or hovered state uses the existing accent, not a filled pill by default.
- Why Likha: turn the current explanatory block into a simple editorial statement paired with the custom-order action. Only the action gets a bounded surface.
- Verified workshops: use larger workshop imagery and open profile rows or varied-width cards rather than identical enclosed cards.
- Just listed: keep the catalog grid, but introduce a deliberate lead item and varied image proportions on desktop. Do not change the underlying product data.
- Made to order: keep the lead tile concept, but make the lead product visibly larger and let supporting items sit in a quieter secondary grid.
- Footer text: keep it minimal and functional.

### Explore

- Keep the search, products/shops tabs, filters, query parameters, and results behavior.
- Make the filter area visually lighter: one heading, grouped controls, and a single clear action instead of multiple nested panels.
- Keep active filters visible on mobile, but use compact text chips only where they convey an active state.
- Let product images and titles carry the result grid. Reduce border and shadow treatment on each result.
- Use a stronger empty state composition with a clear next action and no excess panel decoration.

### Product detail

- Make the image gallery the visual anchor.
- Separate purchase information from descriptive craft information through spacing and typography, not multiple stacked cards.
- Keep price, stock, lead time, variant selection, quantity, add-to-cart, inquiry, and maker links intact.
- Use a single prominent purchase action and a quieter secondary custom-order path.

### Shop detail

- Treat the maker header as a workshop profile with image, location, verification, and concise description.
- Make the shop's product collection the dominant follow-on section.
- Keep map, contact, inquiry, and product actions accessible without turning each into a separate colored card.

### Transactional and account surfaces

- Keep the higher-density card treatment where it communicates grouping, totals, status, or a destructive boundary.
- Remove decorative patterns and marketing-style hero treatment from cart, checkout, account, orders, maker, and admin pages.
- Use consistent list rows, compact status badges, and clear primary actions.
- Preserve loading, empty, error, and signed-in/signed-out states.

## Component changes

Likely shared components to update:

- `AppTopNav.vue`
- `AppBottomNav.vue`
- `AppHeader.vue`
- `SectionHeading.vue`
- `ProductCard.vue`
- `MakerCard.vue`
- `CraftPattern.vue` usage, not necessarily the component itself
- shared button, badge, card, and layout token styles in `app/assets/css/tailwind.css`

Likely page surfaces to update first:

- `app/pages/index.vue`
- `app/pages/explore.vue`
- `app/pages/products/[slug].vue`
- `app/pages/shops/[slug].vue`

Transactional pages will receive a consistency pass after the public browsing surfaces are stable.

## Accessibility and responsive behavior

- Preserve visible focus rings, semantic headings, alt text, keyboard navigation, and contrast targets.
- Preserve the existing mobile-first layout and safe-area handling.
- Every desktop asymmetric composition collapses to one clear column below the mobile breakpoint.
- Product and maker images keep explicit dimensions or aspect-ratio boxes to avoid layout shift.
- No new interaction relies on hover, pointer position, or motion to reveal essential information.
- Test both light and dark themes, narrow mobile, wide desktop, keyboard focus, reduced motion, loading, empty, and error states.

## Implementation order

1. Update design tokens and shared shell primitives.
2. Redesign the homepage and shared product/maker cards.
3. Redesign explore and filter presentation without changing query behavior.
4. Redesign product and shop detail surfaces.
5. Apply the consistency pass to cart, checkout, account, orders, maker, and admin screens.
6. Run typecheck/build and perform visual checks across themes and breakpoints.

## Acceptance criteria

- The home, explore, product, and shop surfaces no longer read as repeated rounded-card layouts.
- The first screen on desktop and mobile clearly prioritizes real craft imagery and one primary action.
- Pills are limited to filters, statuses, and compact control states.
- Primary and secondary actions are visually distinct without duplicating intent.
- Existing routes, data loading, query parameters, checkout flow, and auth/maker boundaries continue to work.
- Light and dark themes retain equivalent hierarchy and readable contrast.
- No visible copy contains em dashes, decorative version labels, fake metrics, or placeholder brand names.
- `pnpm typecheck` and `pnpm build` complete successfully.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The redesign changes too much at once | Preserve IA and implement in the order above, validating each public surface before moving to transactional pages. |
| Less card chrome harms scanability | Keep image framing, spacing, clear headings, and restrained dividers where grouping is meaningful. |
| Dark mode diverges from the new light mode | Use existing semantic tokens and verify both themes after each shared token change. |
| Image variation creates unstable layouts | Keep explicit aspect ratios and reserved media boxes. |
| The browser preview is unavailable during validation | Use local build/typecheck plus deterministic component and route inspection, then re-check when the preview is available. |
