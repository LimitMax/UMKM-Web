# Supabase Relational Database Schema Documentation

This document describes the schema design, field constraints, relationships, indexes, and Row-Level Security (RLS) policies prepared for the **UMKM Pilot** Supabase database.

---

## 1. Tables and Columns

### Table: `businesses`
Stores the corporate profiles and settings for registered businesses.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Unique identifier (e.g. `'biz-1'`). |
| `name` | `VARCHAR(255)` | `NOT NULL` | The name of the business/merchant. |
| `business_type` | `VARCHAR(100)` | Default `'makanan_minuman'` | Category of business operations. |
| `description` | `TEXT` | - | General description of the shop. |
| `logo_url` | `TEXT` | - | Public URL to the brand's logo image. |
| `address` | `TEXT` | - | Physical location address. |
| `whatsapp_number` | `VARCHAR(50)` | - | Contact WhatsApp number. |
| `opening_hours` | `VARCHAR(255)` | - | Schedule string (e.g. `'08.00 - 22.00'`). |
| `currency` | `VARCHAR(10)` | Default `'IDR'` | Active display currency. |
| `tax_enabled` | `BOOLEAN` | Default `false`, `NOT NULL` | Toggle for tax charges. |
| `tax_percentage` | `NUMERIC(5, 2)` | Default `0.00`, `NOT NULL` | Percentage tax rate (e.g. `10.00`). |
| `service_charge_enabled`| `BOOLEAN` | Default `false`, `NOT NULL` | Toggle for service charges. |
| `service_charge_percentage`| `NUMERIC(5, 2)` | Default `0.00`, `NOT NULL` | Percentage service charge rate (e.g. `5.00`). |
| `delivery_settings` | `JSONB` | Default `'{}'`, `NOT NULL` | Delivery fees, radius limits, thresholds. |
| `eta_settings` | `JSONB` | Default `'{}'`, `NOT NULL` | Preparation buffers, default minutes per KM. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record update timestamp. |

---

### Table: `profiles`
User profiles mapping to authentication records and associated merchants.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Map to Auth UUID or legacy ID string. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Business owner/employer. |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | Staff member's name. |
| `role` | `VARCHAR(50)` | `CHECK (role IN ('admin', 'cashier'))` | Authorization role constraint. |
| `email` | `VARCHAR(255)` | `NOT NULL` | Email address. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record update timestamp. |

---

### Table: `products`
Menus or inventory items.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Unique product identifier. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Associated merchant. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Item title. |
| `category` | `VARCHAR(100)` | `NOT NULL` | Category tag (e.g. `'Makanan'`). |
| `description` | `TEXT` | - | Product specifications/ingredients. |
| `price` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Base price. |
| `stock` | `INTEGER` | Default `0`, `NOT NULL` | Remaining stock count. |
| `low_stock_threshold`| `INTEGER` | Default `5`, `NOT NULL` | Threshold before alerting. |
| `image_url` | `TEXT` | - | Product picture asset link. |
| `is_active` | `BOOLEAN` | Default `true`, `NOT NULL` | Visibility flag for menu display. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record update timestamp. |

---

### Table: `orders`
Sales orders created by customers or cashiers.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Order ID. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Shop where placed. |
| `queue_number` | `VARCHAR(50)` | `NOT NULL` | Daily queue serial (e.g., `A001`). |
| `customer_name` | `VARCHAR(255)` | `NOT NULL` | Customer name. |
| `customer_phone` | `VARCHAR(50)` | `NOT NULL` | Customer phone number. |
| `fulfillment_type` | `VARCHAR(50)` | `CHECK IN ('dine_in', 'pickup', 'delivery')` | How the order will be fulfilled. |
| `recipient_name` | `VARCHAR(255)` | - | Recipient name (delivery only). |
| `delivery_phone` | `VARCHAR(50)` | - | Delivery phone number. |
| `delivery_address` | `TEXT` | - | Courier drop-off address. |
| `delivery_notes` | `TEXT` | - | Instructions for courier. |
| `delivery_distance_km`| `NUMERIC(6, 2)`| Default `0.00` | Shipping distance. |
| `delivery_fee_calculation_type`| `VARCHAR(50)`| `CHECK IN ('fixed', 'distance_based')`| Shipping tariff method. |
| `subtotal` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Pricing before extra charges. |
| `service_charge_amount`| `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Service charge amount. |
| `tax_amount` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Tax charge amount. |
| `delivery_fee_amount`| `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Shipping charge. |
| `delivery_admin_fee_amount`| `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | App/Admin service charge for delivery. |
| `free_delivery_applied`| `BOOLEAN` | Default `false`, `NOT NULL` | Shipping discount toggle. |
| `total_amount` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Final total invoice paid. |
| `payment_method` | `VARCHAR(50)` | `CHECK IN ('cash', 'qris', 'bank_transfer')` | Chosen gateway channel. |
| `payment_status` | `VARCHAR(50)` | `CHECK IN ('pending', 'paid', 'failed', 'refunded')` | Current invoice status. |
| `order_status` | `VARCHAR(50)` | `CHECK IN ('pending', 'paid', 'processing', 'ready', 'delivering', 'completed', 'cancelled')` | Workflow state status. |
| `notes` | `TEXT` | - | Special buyer instructions. |
| `estimated_preparation_minutes`| `INTEGER` | - | Predicted kitchen preparation buffer. |
| `estimated_delivery_minutes`| `INTEGER` | - | Predicted transit time. |
| `estimated_total_minutes`| `INTEGER` | - | Final combined ETA. |
| `estimated_ready_at`| `TIMESTAMPTZ`| - | Timestamps predictions. |
| `estimated_arrival_at`| `TIMESTAMPTZ`| - | Timestamps predictions. |
| `eta_label` | `VARCHAR(100)`| - | Formatted ready text. |
| `eta_updated_at` | `TIMESTAMPTZ`| - | Record adjustment timestamp. |
| `eta_manually_adjusted`| `BOOLEAN` | Default `false`, `NOT NULL` | Overwrite flag. |
| `eta_adjustment_reason`| `TEXT` | - | Operator rationale comment. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record creation. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record modification. |
| `paid_at` | `TIMESTAMPTZ`| - | Payment completion. |
| `completed_at` | `TIMESTAMPTZ`| - | Order closing. |
| `cancelled_at` | `TIMESTAMPTZ`| - | Order cancellation. |

---

### Table: `order_items`
Detailed line items belonging to an order.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Line item ID. |
| `order_id` | `VARCHAR(255)` | `REFERENCES orders(id) ON DELETE CASCADE`| Parent order relation. |
| `product_id` | `VARCHAR(255)` | `REFERENCES products(id)` | Purchased product reference. |
| `product_name` | `VARCHAR(255)` | `NOT NULL` | Snapshotted name. |
| `quantity` | `INTEGER` | Default `1`, `NOT NULL` | Units bought. |
| `price` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Snapshotted unit price. |
| `subtotal` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | price * quantity. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Date created. |

---

### Table: `transactions`
Journal entries recording completed cash flows and sales.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Transaction entry ID. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Store ID. |
| `order_id` | `VARCHAR(255)` | `REFERENCES orders(id) ON DELETE SET NULL`| Source order invoice. |
| `amount` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Bookkeeping value. |
| `payment_method` | `VARCHAR(50)` | `CHECK IN ('cash', 'qris', 'bank_transfer')` | Channel description. |
| `payment_status` | `VARCHAR(50)` | `CHECK IN ('pending', 'paid', 'failed', 'refunded')` | Payment state. |
| `transaction_status`| `VARCHAR(50)`| `CHECK IN ('pending', 'paid', 'failed', 'refunded')`| Ledger state. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Time logged. |

---

### Table: `payments`
Transactions mapping to external payment gateways (e.g. Midtrans QRIS or VA bank details).

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Payment link ID. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Store reference. |
| `order_id` | `VARCHAR(255)` | `REFERENCES orders(id) ON DELETE CASCADE`| Target order ID. |
| `provider` | `VARCHAR(100)` | Default `'midtrans'` | Provider name. |
| `provider_reference_id`| `VARCHAR(255)`| - | External vendor ID. |
| `payment_method` | `VARCHAR(50)` | `NOT NULL` | Payment method. |
| `qris_url` | `TEXT` | - | Dynamic QR image link. |
| `qris_string` | `TEXT` | - | Raw QRIS code string. |
| `va_number` | `VARCHAR(100)`| - | Bank Virtual Account string. |
| `va_bank` | `VARCHAR(50)` | - | VA issuing bank (e.g. BCA, BRI). |
| `amount` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Billed amount. |
| `status` | `VARCHAR(50)` | `NOT NULL` | Payment status. |
| `expires_at` | `TIMESTAMPTZ`| - | Date of code expiry. |
| `paid_at` | `TIMESTAMPTZ`| - | Date callback resolved. |
| `raw_callback_payload`| `JSONB` | Default `'{}'`, `NOT NULL` | Logged payload metadata. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record creation. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Record modification. |

---

### Table: `insights`
Automated business analytical insights generated by rule engine.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Insight entry ID. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Store ID. |
| `type` | `VARCHAR(100)` | `NOT NULL` | Category label (e.g. `'popular_time'`). |
| `title` | `VARCHAR(255)` | `NOT NULL` | Insight heading header. |
| `description` | `TEXT` | `NOT NULL` | Narrative analysis summary. |
| `source` | `VARCHAR(100)` | Default `'rule_engine'` | Engine description identifier. |
| `metadata` | `JSONB` | Default `'{}'`, `NOT NULL` | Additional structured parameters. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Date generated. |

---

### Table: `promo_recommendations`
AI generated promotional menu campaigns.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | Recommendation ID. |
| `business_id` | `VARCHAR(255)` | `REFERENCES businesses(id)` | Store ID. |
| `title` | `VARCHAR(255)` | `NOT NULL` | General promotion type header. |
| `reason` | `TEXT` | - | Underlying AI logical justification. |
| `main_product_id` | `VARCHAR(255)` | `REFERENCES products(id)` | Anchor product ID. |
| `bundle_product_id`| `VARCHAR(255)` | `REFERENCES products(id)` | Accompanying product bundle ID. |
| `suggested_promo_name`| `VARCHAR(255)`| `NOT NULL` | Final marketing kombo title. |
| `normal_price` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Total default pricing sum. |
| `suggested_price` | `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Target campaign price. |
| `estimated_savings`| `NUMERIC(12, 2)`| Default `0.00`, `NOT NULL` | Savings difference. |
| `target_time` | `VARCHAR(100)`| - | Best target time hours. |
| `target_customer` | `VARCHAR(255)`| - | Target persona. |
| `campaign_goal` | `TEXT` | - | Campaign goal definition. |
| `whatsapp_caption` | `TEXT` | - | Pre-formated text copy. |
| `instagram_caption`| `TEXT` | - | Pre-formated text copy. |
| `short_caption` | `TEXT` | - | Compact summaries. |
| `confidence_score` | `NUMERIC(5, 2)`| Default `0.00` | AI system confidence (0-100). |
| `based_on_signals` | `JSONB` | Default `'[]'`, `NOT NULL` | Array signal tags data list. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()`, `NOT NULL` | Date recommendation generated. |

---

## 2. Relationships and Foreign Keys

- `profiles.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `products.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `orders.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `order_items.order_id` &rarr; `orders.id` (ON DELETE CASCADE)
- `order_items.product_id` &rarr; `products.id`
- `transactions.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `transactions.order_id` &rarr; `orders.id` (ON DELETE SET NULL)
- `payments.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `payments.order_id` &rarr; `orders.id` (ON DELETE CASCADE)
- `insights.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `promo_recommendations.business_id` &rarr; `businesses.id` (ON DELETE CASCADE)
- `promo_recommendations.main_product_id` &rarr; `products.id`
- `promo_recommendations.bundle_product_id` &rarr; `products.id`

---

## 3. Database Indexes

To maintain instant loading during reports extraction and dashboard lists, the following indexes are applied:

- **Orders Queries**:
  * `idx_orders_business_id` on `orders(business_id)`
  * `idx_orders_created_at` on `orders(created_at DESC)`
  * `idx_orders_payment_status` on `orders(payment_status)`
  * `idx_orders_order_status` on `orders(order_status)`
- **Order Items Lookup**:
  * `idx_order_items_order_id` on `order_items(order_id)`
- **Products Filters**:
  * `idx_products_business_id` on `products(business_id)`
  * `idx_products_is_active` on `products(is_active)`
- **Ledger Bookkeeping**:
  * `idx_transactions_business_id` on `transactions(business_id)`
  * `idx_transactions_created_at` on `transactions(created_at DESC)`
- **Payments Checkouts**:
  * `idx_payments_order_id` on `payments(order_id)`
  * `idx_payments_status` on `payments(status)`
- **AI Recommendation Hub**:
  * `idx_promo_recs_business_id` on `promo_recommendations(business_id)`

---

## 4. Planned Row-Level Security (RLS) Policies

Supabase Row-Level Security (RLS) will be fully enabled to segment business data securely:

1. **Table: `businesses`**
   * `SELECT`: Public read-only for customer ordering and profile lookup.
   * `UPDATE`: Only authenticated users with `role = 'admin'` matching the `business_id` profile.

2. **Table: `profiles`**
   * `SELECT`/`UPDATE`/`ALL`: Restricted to users accessing their own profile records.
   * Admin can read profiles belonging to the same `business_id`.

3. **Table: `products`**
   * `SELECT`: Public access to load products for QR customer menu pages.
   * `ALL`: Restricted to authenticated users with `'admin'` or `'cashier'` roles associated with the product's `business_id`.

4. **Table: `orders` and `order_items`**
   * `SELECT`: Staff members (`admin`, `cashier`) of the matching `business_id` can read all orders. Customers can read their specific order by providing the `id` string (tokenized path).
   * `INSERT`: Allowed publicly for customers creating new menu checkouts.
   * `UPDATE`: Only authorized staff (`admin` or `cashier`) matching `business_id` can modify order states.

5. **Table: `transactions` & `payments`**
   * `SELECT`/`ALL`: Restricted strictly to matching business staff. Admin role required for refund updates.

6. **Table: `insights` & `promo_recommendations`**
   * `SELECT`/`ALL`: Restricted strictly to staff belonging to the matching `business_id`.
