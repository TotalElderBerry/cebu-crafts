import { useLocalStorage } from '@vueuse/core'

export type CartLine = {
  productId: string
  variantId: string | null
  quantity: number
  /** Display snapshot so the cart renders instantly and offline. The server
   *  re-prices everything at checkout, so a stale snapshot cannot be exploited
   *  — it can only look wrong for a moment. */
  title: string
  slug: string
  image: string | null
  variantName: string | null
  priceCentavos: number
  minOrderQty: number
  makerName: string
  makerSlug: string
  leadTimeDays: number | null
}

const KEY = 'likha.cart.v1'

export function useCart() {
  // useLocalStorage is SSR-safe: it yields the initial value on the server and
  // hydrates from storage on the client.
  const lines = useLocalStorage<CartLine[]>(KEY, [], { initOnMounted: true })

  const count = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0))
  const subtotalCentavos = computed(() =>
    lines.value.reduce((n, l) => n + l.priceCentavos * l.quantity, 0),
  )
  const isEmpty = computed(() => lines.value.length === 0)

  /** Lines grouped by shop — an order can span several makers and buyers need
   *  to see that, because each shop ships and crafts on its own schedule. */
  const byMaker = computed(() => {
    const groups = new Map<string, { makerName: string; makerSlug: string; lines: CartLine[] }>()
    for (const line of lines.value) {
      const group = groups.get(line.makerSlug) ?? {
        makerName: line.makerName,
        makerSlug: line.makerSlug,
        lines: [],
      }
      group.lines.push(line)
      groups.set(line.makerSlug, group)
    }
    return [...groups.values()]
  })

  const keyOf = (l: Pick<CartLine, 'productId' | 'variantId'>) => `${l.productId}:${l.variantId ?? ''}`

  function add(line: Omit<CartLine, 'quantity'>, quantity = 1) {
    const qty = Math.max(quantity, line.minOrderQty || 1)
    const existing = lines.value.find((l) => keyOf(l) === keyOf(line))

    if (existing) {
      existing.quantity += qty
    } else {
      lines.value = [...lines.value, { ...line, quantity: qty }]
    }
  }

  function setQuantity(line: Pick<CartLine, 'productId' | 'variantId'>, quantity: number) {
    const existing = lines.value.find((l) => keyOf(l) === keyOf(line))
    if (!existing) return

    if (quantity < (existing.minOrderQty || 1)) {
      remove(line)
      return
    }
    existing.quantity = quantity
  }

  function remove(line: Pick<CartLine, 'productId' | 'variantId'>) {
    lines.value = lines.value.filter((l) => keyOf(l) !== keyOf(line))
  }

  function clear() {
    lines.value = []
  }

  return { lines, byMaker, count, subtotalCentavos, isEmpty, add, setQuantity, remove, clear }
}
