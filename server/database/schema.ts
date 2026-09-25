import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/* ===========================================================================
   Enums
   =========================================================================== */

export const userRole = pgEnum('user_role', ['buyer', 'maker', 'admin'])

/** Where a maker works. Craft in Cebu is strongly place-bound — Carcar means
 *  footwear, Abuno in Lapu-Lapu means guitars — so location is a real filter,
 *  not just an address field. */
export const cebuCity = pgEnum('cebu_city', [
  'cebu_city',
  'mandaue',
  'lapu_lapu',
  'talisay',
  'carcar',
  'danao',
  'naga',
  'toledo',
  'bogo',
  'argao',
  'dalaguete',
  'oslob',
  'moalboal',
  'barili',
  'sibonga',
  'cordova',
  'consolacion',
  'liloan',
  'compostela',
  'minglanilla',
  'asturias',
  'bantayan',
  'other',
])

export const productStatus = pgEnum('product_status', ['draft', 'published', 'archived'])

/** The order lifecycle. `crafting` exists because most of this catalogue is
 *  made to order — collapsing it into "processing" hides the longest wait and
 *  is the single biggest source of "where is my order" messages. */
export const orderStatus = pgEnum('order_status', [
  'pending',
  'confirmed',
  'crafting',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
])

/** `mock_card` is the keyless demo fallback; `paymongo` is the real gateway
 *  (GCash, Maya, GrabPay and cards all arrive under that one method — the
 *  specific rail the buyer picked is recorded in `payment_rail`). */
export const paymentMethod = pgEnum('payment_method', ['cod', 'mock_card', 'paymongo'])

export const paymentStatus = pgEnum('payment_status', [
  'unpaid',
  'authorized',
  'paid',
  'failed',
  'refunded',
])

export const inquiryType = pgEnum('inquiry_type', ['custom', 'bulk', 'wholesale', 'question'])

export const inquiryStatus = pgEnum('inquiry_status', [
  'open',
  'quoted',
  'accepted',
  'declined',
  'closed',
])

export const verificationStatus = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
])

/* ===========================================================================
   Users
   =========================================================================== */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: userRole('role').notNull().default('buyer'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_unique').on(sql`lower(${t.email})`)],
)

/* ===========================================================================
   Makers — the seller-side profile, one per user who sells
   =========================================================================== */

export const makers = pgTable(
  'makers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shopName: text('shop_name').notNull(),
    slug: text('slug').notNull(),
    tagline: text('tagline'),
    /** The provenance story. For craft this is not marketing fluff — it is the
     *  thing that justifies the price against a factory import. */
    story: text('story'),
    city: cebuCity('city').notNull(),
    barangay: text('barangay'),
    craftCategories: text('craft_categories').array().notNull().default(sql`'{}'::text[]`),
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    yearsActive: integer('years_active'),
    artisanCount: integer('artisan_count').default(1),
    acceptsCustomOrders: boolean('accepts_custom_orders').notNull().default(true),
    acceptsWholesale: boolean('accepts_wholesale').notNull().default(false),
    verification: verificationStatus('verification').notNull().default('unverified'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    /** Denormalised so product grids do not need an aggregate per card. */
    ratingSum: integer('rating_sum').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('makers_slug_unique').on(t.slug),
    uniqueIndex('makers_user_unique').on(t.userId),
    index('makers_city_idx').on(t.city),
    index('makers_verification_idx').on(t.verification),
  ],
)

/* ===========================================================================
   Catalogue
   =========================================================================== */

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** lucide icon name, resolved client-side */
    icon: text('icon').notNull().default('package'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('categories_slug_unique').on(t.slug)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    makerId: uuid('maker_id')
      .notNull()
      .references(() => makers.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),

    /** Integer centavos. Storing money as float is how you end up short a peso. */
    priceCentavos: integer('price_centavos').notNull(),
    compareAtCentavos: integer('compare_at_centavos'),

    stock: integer('stock').notNull().default(0),
    isMadeToOrder: boolean('is_made_to_order').notNull().default(false),
    leadTimeDays: integer('lead_time_days'),
    /** Wholesale buyers are a big slice of this market; a listing can require a
     *  minimum quantity rather than forcing a separate wholesale catalogue. */
    minOrderQty: integer('min_order_qty').notNull().default(1),

    materials: text('materials').array().notNull().default(sql`'{}'::text[]`),
    dimensions: text('dimensions'),
    weightGrams: integer('weight_grams'),
    images: text('images').array().notNull().default(sql`'{}'::text[]`),

    status: productStatus('status').notNull().default('draft'),
    viewCount: integer('view_count').notNull().default(0),
    ratingSum: integer('rating_sum').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('products_slug_unique').on(t.slug),
    index('products_maker_idx').on(t.makerId),
    index('products_category_idx').on(t.categoryId),
    index('products_status_idx').on(t.status),
    index('products_price_idx').on(t.priceCentavos),
    // Backs the keyword search in /api/products without needing a search service.
    index('products_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${t.title} || ' ' || ${t.description})`,
    ),
  ],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceDeltaCentavos: integer('price_delta_centavos').notNull().default(0),
    stock: integer('stock').notNull().default(0),
    sku: text('sku'),
  },
  (t) => [index('variants_product_idx').on(t.productId)],
)

/* ===========================================================================
   Orders
   =========================================================================== */

export type ShippingAddress = {
  fullName: string
  phone: string
  line1: string
  barangay: string
  city: string
  province: string
  postalCode: string
  notes?: string
}

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human-quotable reference. Buyers read this out over the phone. */
    orderNumber: text('order_number').notNull(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    status: orderStatus('status').notNull().default('pending'),
    subtotalCentavos: integer('subtotal_centavos').notNull(),
    shippingCentavos: integer('shipping_centavos').notNull().default(0),
    totalCentavos: integer('total_centavos').notNull(),

    paymentMethod: paymentMethod('payment_method').notNull().default('cod'),
    paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
    /** PayMongo payment id (`pay_…`), or the mock reference in demo mode. */
    paymentRef: text('payment_ref'),
    /** PayMongo Checkout Session id (`cs_…`). The webhook arrives keyed on this,
     *  and it is what the polling fallback re-reads when the buyer comes back
     *  from the hosted page. */
    paymentSessionId: text('payment_session_id'),
    /** Which rail the buyer actually used — gcash, paymaya, grab_pay, card.
     *  Worth keeping: the mix tells makers what to expect and PayMongo charges
     *  different fees per rail. */
    paymentRail: text('payment_rail'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    shippingAddress: jsonb('shipping_address').$type<ShippingAddress>().notNull(),
    buyerNote: text('buyer_note'),

    placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('orders_number_unique').on(t.orderNumber),
    index('orders_buyer_idx').on(t.buyerId),
    index('orders_status_idx').on(t.status),
    // The webhook arrives knowing only the session id, so this lookup is on the
    // hot path of every payment confirmation.
    index('orders_payment_session_idx').on(t.paymentSessionId),
  ],
)

/**
 * Every PayMongo webhook event we have already applied.
 *
 * PayMongo retries on any non-2xx and can deliver the same event more than once
 * even on success. Without this, a retry of `checkout_session.payment.paid`
 * would append a second "paid" event to the order timeline. The event id is the
 * primary key, so a replay collides and is skipped.
 */
export const webhookEvents = pgTable('webhook_events', {
  /** PayMongo's `evt_…` id. */
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    /** An order carries items from several makers; each line needs its own
     *  seller so maker dashboards can filter without joining through products
     *  (which may later be deleted). */
    makerId: uuid('maker_id')
      .notNull()
      .references(() => makers.id, { onDelete: 'restrict' }),

    // Snapshots: the receipt must not change when the seller edits the listing.
    titleSnapshot: text('title_snapshot').notNull(),
    imageSnapshot: text('image_snapshot'),
    variantSnapshot: text('variant_snapshot'),
    unitPriceCentavos: integer('unit_price_centavos').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCentavos: integer('line_total_centavos').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId), index('order_items_maker_idx').on(t.makerId)],
)

/** Append-only lifecycle log. Gives the buyer a real tracking timeline and the
 *  maker an audit trail when a delivery is disputed. */
export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: orderStatus('status').notNull(),
    note: text('note'),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
)

/* ===========================================================================
   Inquiries — custom / bulk / wholesale negotiation
   This is the feature that replaces the Messenger thread these deals live in
   today. Without it the marketplace only serves single-unit retail, which is
   the smaller half of a craft maker's income.
   =========================================================================== */

export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    makerId: uuid('maker_id')
      .notNull()
      .references(() => makers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),

    type: inquiryType('type').notNull().default('question'),
    subject: text('subject').notNull(),
    quantity: integer('quantity'),
    targetBudgetCentavos: integer('target_budget_centavos'),
    neededBy: date('needed_by'),

    status: inquiryStatus('status').notNull().default('open'),
    /** Set when the maker sends a formal quote; buyer accepts to convert. */
    quotedPriceCentavos: integer('quoted_price_centavos'),
    quotedLeadTimeDays: integer('quoted_lead_time_days'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('inquiries_buyer_idx').on(t.buyerId),
    index('inquiries_maker_idx').on(t.makerId),
    index('inquiries_status_idx').on(t.status),
  ],
)

export const inquiryMessages = pgTable(
  'inquiry_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    attachments: text('attachments').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('inquiry_messages_inquiry_idx').on(t.inquiryId)],
)

/* ===========================================================================
   Reviews & favourites
   =========================================================================== */

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    makerId: uuid('maker_id')
      .notNull()
      .references(() => makers.id, { onDelete: 'cascade' }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Reviews require a delivered order — no drive-by ratings. */
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    body: text('body'),
    images: text('images').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reviews_product_idx').on(t.productId),
    uniqueIndex('reviews_one_per_order_item').on(t.orderId, t.productId, t.buyerId),
  ],
)

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
)

/* ===========================================================================
   Relations
   =========================================================================== */

export const usersRelations = relations(users, ({ one, many }) => ({
  maker: one(makers, { fields: [users.id], references: [makers.userId] }),
  orders: many(orders),
  reviews: many(reviews),
  favorites: many(favorites),
}))

export const makersRelations = relations(makers, ({ one, many }) => ({
  user: one(users, { fields: [makers.userId], references: [users.id] }),
  products: many(products),
  inquiries: many(inquiries),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  maker: one(makers, { fields: [products.makerId], references: [makers.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  reviews: many(reviews),
}))

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  maker: one(makers, { fields: [orderItems.makerId], references: [makers.id] }),
}))

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}))

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  buyer: one(users, { fields: [inquiries.buyerId], references: [users.id] }),
  maker: one(makers, { fields: [inquiries.makerId], references: [makers.id] }),
  product: one(products, { fields: [inquiries.productId], references: [products.id] }),
  messages: many(inquiryMessages),
}))

export const inquiryMessagesRelations = relations(inquiryMessages, ({ one }) => ({
  inquiry: one(inquiries, { fields: [inquiryMessages.inquiryId], references: [inquiries.id] }),
  sender: one(users, { fields: [inquiryMessages.senderId], references: [users.id] }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  buyer: one(users, { fields: [reviews.buyerId], references: [users.id] }),
}))

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  product: one(products, { fields: [favorites.productId], references: [products.id] }),
}))

/* ===========================================================================
   Inferred types
   =========================================================================== */

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Maker = typeof makers.$inferSelect
export type Product = typeof products.$inferSelect
export type Category = typeof categories.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type Inquiry = typeof inquiries.$inferSelect
export type InquiryMessage = typeof inquiryMessages.$inferSelect
export type Review = typeof reviews.$inferSelect
