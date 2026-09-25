import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Prices are stored as integer centavos. Never do money math in floats. */
export function formatPeso(centavos: number, opts: { compact?: boolean } = {}) {
  const pesos = centavos / 100
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: opts.compact && pesos % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pesos)
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function relativeTime(value: string | Date) {
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Lead-time copy for made-to-order items, which is most of this catalogue. */
export function leadTimeLabel(days: number | null | undefined) {
  if (!days) return 'Ready to ship'
  if (days <= 7) return `Made to order · ${days} days`
  const weeks = Math.round(days / 7)
  return `Made to order · ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}
