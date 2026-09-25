import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const includes = async (path, text) => {
  const source = await read(path)
  assert.ok(source.includes(text), `${path} should include ${JSON.stringify(text)}`)
}

await includes('app/assets/css/tailwind.css', '@utility editorial-surface')
await includes('app/assets/css/tailwind.css', '@utility editorial-rule')
await includes('app/components/AppTopNav.vue', 'border-b border-border bg-background/95')
await includes('app/components/AppBottomNav.vue', 'pb-safe')
await includes('app/components/AppHeader.vue', 'lg:static lg:pt-2')

const sectionHeading = await read('app/components/SectionHeading.vue')
assert.ok(sectionHeading.includes('editorial-rule'), 'SectionHeading should use the editorial rule')
assert.ok(!sectionHeading.includes('<svg'), 'SectionHeading should not render a decorative SVG')

await includes('app/components/ProductCard.vue', 'editorial-surface')
await includes('app/components/MakerCard.vue', 'editorial-surface')

const home = await read('app/pages/index.vue')
const mobileHero = home.slice(home.indexOf('<!-- Phone hero -->'), home.indexOf('<!-- Desktop hero -->'))
assert.ok(home.includes('editorial-rule no-scrollbar'), 'Homepage categories should use a quiet rail rule')
assert.ok(home.includes('rounded-md editorial-surface'), 'Homepage custom action should use an editorial surface')
assert.ok(home.includes('max-w-none text-[2rem]'), 'Mobile hero headline should not be width-constrained')
assert.ok(mobileHero.includes('src="/listings/hero.webp"'), 'Mobile hero should use the portrait workshop image')
assert.ok(mobileHero.includes('bg-foreground') && mobileHero.includes('text-background'), 'Mobile hero copy should sit on a deliberate ink panel')
assert.ok(mobileHero.includes('brightness-[0.88] saturate-[1.12]'), 'Mobile hero image should retain photographic color')
assert.ok(mobileHero.includes('bg-background') && mobileHero.includes('text-foreground'), 'Mobile hero search should use a neutral field')
assert.ok(!mobileHero.includes('bg-primary px-3.5 text-sm font-medium'), 'Mobile hero search should not be orange')
assert.ok(!home.includes('CraftPattern name="banig"'), 'Homepage hero should not use a decorative pattern')
assert.ok(!home.includes('CraftPattern name="hablon"'), 'Homepage custom action should not use a decorative pattern')

const explore = await read('app/pages/explore.vue')
assert.ok(explore.includes('editorial-tabs'), 'Explore should use the editorial tab treatment')
assert.ok(explore.includes('editorial-filter-rail'), 'Explore should expose a calmer filter rail')
assert.ok(!explore.includes('rounded-full px-3.5 py-1.5 text-sm font-medium capitalize'), 'Explore tabs should not use default pills')

const filterControls = await read('app/components/ExploreFilters.vue')
assert.ok(filterControls.includes('rounded-md px-3 py-1.5'), 'Filter controls should use the editorial radius')
assert.ok(filterControls.includes('editorial-surface'), 'Made-to-order filter should use the shared surface')
assert.ok(!filterControls.includes('rounded-full px-3 py-1.5 text-sm ring-1'), 'Filter controls should not all be pills')

const product = await read('app/pages/products/[slug].vue')
assert.ok(product.includes('editorial-product-buy'), 'Product detail should have an editorial purchase section')
assert.ok(product.includes('editorial-surface'), 'Product detail should use the shared editorial surface')
assert.ok(!product.includes('rounded-xl card-surface'), 'Product detail should not stack generic card surfaces')

const shop = await read('app/pages/shops/[slug].vue')
assert.ok(shop.includes('editorial-story'), 'Shop detail should identify the editorial story section')
assert.ok(!shop.includes('CraftPattern name="capiz"'), 'Shop story should not depend on a decorative pattern')

for (const path of [
  'app/pages/cart.vue',
  'app/pages/checkout.vue',
  'app/pages/account.vue',
  'app/pages/orders/index.vue',
  'app/pages/maker/index.vue',
]) {
  await includes(path, 'editorial-surface')
}

console.log('Editorial shell and browse contracts passed')
