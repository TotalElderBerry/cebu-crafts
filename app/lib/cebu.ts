/** Display labels for the `cebu_city` enum stored in the database. */
export const CITY_LABELS: Record<string, string> = {
  cebu_city: 'Cebu City',
  mandaue: 'Mandaue',
  lapu_lapu: 'Lapu-Lapu',
  talisay: 'Talisay',
  carcar: 'Carcar',
  danao: 'Danao',
  naga: 'Naga',
  toledo: 'Toledo',
  bogo: 'Bogo',
  argao: 'Argao',
  dalaguete: 'Dalaguete',
  oslob: 'Oslob',
  moalboal: 'Moalboal',
  barili: 'Barili',
  sibonga: 'Sibonga',
  cordova: 'Cordova',
  consolacion: 'Consolacion',
  liloan: 'Liloan',
  compostela: 'Compostela',
  minglanilla: 'Minglanilla',
  asturias: 'Asturias',
  bantayan: 'Bantayan',
  other: 'Cebu',
}

export const cityLabel = (value?: string | null) =>
  (value && CITY_LABELS[value]) || 'Cebu'

/** Cities that actually have craft clusters — used for the explore filter, so
 *  buyers are not scrolling past twenty municipalities with nothing in them. */
export const CRAFT_CITIES = [
  'cebu_city',
  'mandaue',
  'lapu_lapu',
  'carcar',
  'argao',
  'danao',
  'talisay',
  'cordova',
] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  crafting: 'Being made',
  ready_to_ship: 'Ready to ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const ORDER_STATUS_HINTS: Record<string, string> = {
  pending: 'Waiting for the maker to accept.',
  confirmed: 'The maker has accepted your order.',
  crafting: 'Your piece is being made by hand.',
  ready_to_ship: 'Finished and packed, waiting for pickup.',
  shipped: 'On the way to you.',
  delivered: 'Delivered. Enjoy it.',
  cancelled: 'This order was cancelled.',
  refunded: 'This order was refunded.',
}

/** Tailwind classes per status. Amber for anything the buyer is waiting on,
 *  green only once the thing actually arrived. */
export const ORDER_STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-warning/15 text-warning-foreground ring-1 ring-warning/30',
  confirmed: 'bg-accent/15 text-accent ring-1 ring-accent/30',
  crafting: 'bg-primary/12 text-primary-ink ring-1 ring-primary/25',
  ready_to_ship: 'bg-accent/15 text-accent ring-1 ring-accent/30',
  shipped: 'bg-accent/20 text-accent ring-1 ring-accent/35',
  delivered: 'bg-success/15 text-success ring-1 ring-success/30',
  cancelled: 'bg-muted text-muted-foreground ring-1 ring-border',
  refunded: 'bg-muted text-muted-foreground ring-1 ring-border',
}

export const INQUIRY_TYPE_LABELS: Record<string, string> = {
  custom: 'Custom order',
  bulk: 'Bulk order',
  wholesale: 'Wholesale',
  question: 'Question',
}

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  open: 'Awaiting reply',
  quoted: 'Quoted',
  accepted: 'Accepted',
  declined: 'Declined',
  closed: 'Closed',
}
