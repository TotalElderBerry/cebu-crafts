# Database design

Postgres on Neon, defined in [`server/database/schema.ts`](../server/database/schema.ts). That file
is the single source of truth — `pnpm db:push` applies it, and the TypeScript types are inferred
from it rather than declared twice.

## Entity relationship diagram

```mermaid
erDiagram
    users ||--o| makers : "opens a shop"
    users ||--o{ orders : places
    users ||--o{ reviews : writes
    users ||--o{ favorites : saves
    users ||--o{ inquiries : "opens as buyer"
    users ||--o{ inquiry_messages : sends

    makers ||--o{ products : lists
    makers ||--o{ order_items : fulfils
    makers ||--o{ inquiries : receives

    categories ||--o{ products : groups

    products ||--o{ product_variants : has
    products ||--o{ order_items : "sold as"
    products ||--o{ reviews : receives
    products ||--o{ favorites : "saved in"

    orders ||--|{ order_items : contains
    orders ||--o{ order_events : "logs"
    orders ||--o{ reviews : "unlocks"

    inquiries ||--|{ inquiry_messages : contains

    users {
        uuid id PK
        text email UK "unique on lower(email)"
        text password_hash
        text name
        text phone
        enum role "buyer | maker | admin"
    }

    makers {
        uuid id PK
        uuid user_id FK "unique - one shop per user"
        text shop_name
        text slug UK
        text story "provenance - the selling point"
        enum city "cebu_city | mandaue | lapu_lapu | carcar | ..."
        text barangay
        text_array craft_categories
        bool accepts_custom_orders
        bool accepts_wholesale
        enum verification "unverified | pending | verified | rejected"
        int rating_sum "denormalised"
        int rating_count "denormalised"
    }

    categories {
        uuid id PK
        text slug UK
        text name
        int sort_order
    }

    products {
        uuid id PK
        uuid maker_id FK
        uuid category_id FK
        text title
        text slug UK
        int price_centavos "integer money"
        int stock
        bool is_made_to_order
        int lead_time_days
        int min_order_qty "wholesale lots"
        text_array materials
        text_array images
        enum status "draft | published | archived"
    }

    product_variants {
        uuid id PK
        uuid product_id FK
        text name
        int price_delta_centavos
        int stock
    }

    orders {
        uuid id PK
        text order_number UK "LK-7K3QW2"
        uuid buyer_id FK
        enum status "pending | confirmed | crafting | ready_to_ship | shipped | delivered | cancelled | refunded"
        int subtotal_centavos
        int shipping_centavos
        int total_centavos
        enum payment_method "cod | mock_card"
        enum payment_status "unpaid | authorized | paid | failed | refunded"
        jsonb shipping_address
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK "nullable - listing may be deleted"
        uuid maker_id FK "per-line seller"
        text title_snapshot "receipt must not change"
        int unit_price_centavos
        int quantity
        int line_total_centavos
    }

    order_events {
        uuid id PK
        uuid order_id FK
        enum status
        text note
        uuid actor_id FK
    }

    inquiries {
        uuid id PK
        uuid buyer_id FK
        uuid maker_id FK
        uuid product_id FK "nullable"
        enum type "custom | bulk | wholesale | question"
        text subject
        int quantity
        int target_budget_centavos
        date needed_by
        enum status "open | quoted | accepted | declined | closed"
        int quoted_price_centavos
        int quoted_lead_time_days
    }

    inquiry_messages {
        uuid id PK
        uuid inquiry_id FK
        uuid sender_id FK
        text body
        text_array attachments
    }

    reviews {
        uuid id PK
        uuid product_id FK
        uuid maker_id FK
        uuid buyer_id FK
        uuid order_id FK "one review per order line"
        int rating
        text body
    }

    favorites {
        uuid user_id PK_FK
        uuid product_id PK_FK
    }
```

## Order lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: buyer checks out
    pending --> confirmed: maker accepts
    pending --> cancelled: buyer or maker
    confirmed --> crafting: maker starts work
    confirmed --> ready_to_ship: already in stock
    confirmed --> cancelled
    crafting --> ready_to_ship: finished
    crafting --> cancelled
    ready_to_ship --> shipped: handed to courier
    ready_to_ship --> cancelled
    shipped --> delivered: buyer confirms receipt
    delivered --> refunded: admin only
    cancelled --> [*]
    refunded --> [*]
    delivered --> [*]
```

`crafting` exists because most of this catalogue is made to order. Folding it into a generic
"processing" would hide the longest part of the wait, which is the main thing buyers ask about.

Transitions and the roles allowed to make them are declared in
[`server/api/orders/[id]/status.patch.ts`](../server/api/orders/%5Bid%5D/status.patch.ts).
Note that **buyers** confirm delivery, not makers — letting a seller close out their own
cash-on-delivery order is where COD disputes begin.

## Inquiry lifecycle

```mermaid
stateDiagram-v2
    [*] --> open: buyer sends specs
    open --> quoted: maker prices the job
    quoted --> quoted: maker revises
    quoted --> accepted: buyer accepts
    quoted --> declined: buyer declines
    accepted --> closed
    declined --> [*]
    closed --> [*]
```

## Indexing notes

- **Full-text search** on products uses a GIN index over
  `to_tsvector('english', title || ' ' || description)`, matched with `websearch_to_tsquery` so
  quoted phrases and `OR` work the way a shopper types them. No separate search service needed at
  this scale.
- **`makers.city`** is indexed because location is a primary filter here — in Cebu the place *is*
  the craft (Carcar means footwear, Abuno means guitars).
- **`order_items.maker_id`** is indexed and denormalised off `products` so maker dashboards can
  filter their own lines without joining through a product row that may later be archived.
- **Ratings are denormalised** (`rating_sum` / `rating_count`) on both products and makers so a
  product grid does not run an aggregate per card.

## Money

Every amount is an **integer number of centavos** (`price_centavos`, `total_centavos`). Forms
accept pesos and convert at the API boundary. Floating-point money is how you end up a peso short
on a hundred-item wholesale order.
