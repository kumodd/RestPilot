# RestPilot Supabase Schema Documentation

This document provides a structured overview of the RestPilot multi-tenant restaurant platform database, covering tables, relationships, the security model (Row Level Security), and key operational workflows.

---

## 1. Security Model & Row Level Security (RLS)

RestPilot uses PostgreSQL Row Level Security (RLS) heavily to enforce multi-tenant boundaries and role-based access control.

### User Roles
- **Platform Admin (`platform_admin`)**: Unrestricted access to all data across all tenants.
- **Owner (`owner`)**: Full access to all their own restaurants, branches, and related operational data.
- **Manager (`manager`)**: Access restricted to their assigned restaurant/branch. Can modify menus, settings, and view all orders.
- **Waiter (`waiter`)**: Access to their assigned branch. Can create orders, view order status, and process payments.
- **Chef / Kitchen Manager (`chef`, `kitchen_manager`)**: Read access to confirmed orders and ability to update item statuses.
- **Cashier (`cashier`)**: Access to process payments and view billing details.
- **Customer**: No direct Supabase Auth (`auth.users`) account. Interacts with the system via Edge Functions, tracked via browser fingerprint and secure `order_token`s.

### RLS Implementation
Policies are implemented using helper functions to evaluate the current user's role and associations:
- `is_platform_admin()`: Checks if user is admin.
- `owns_restaurant(id)`: Checks if user owns the specific restaurant.
- `my_staff_restaurant_ids()`, `my_staff_branch_ids()`: Fetches the restaurants/branches a staff member belongs to.

---

## 2. Core Tenancy & Identity Tables

The core of the multi-tenant architecture. Every entity stems from an Owner and their Restaurants.

### `profiles`
- **Purpose**: Extended user data mapped 1:1 with Supabase `auth.users`.
- **Key Fields**: `id` (references auth.users), `full_name`, `phone`, `role`.
- **Relationships**: Parent to all staff/owner assignments.

### `owners`
- **Purpose**: Represents a paying tenant (business entity).
- **Key Fields**: `business_name`, `subscription_plan`, `subscription_status`, `max_restaurants`.
- **Relationships**: `profile_id` -> `profiles(id)`.

### `restaurants`
- **Purpose**: A brand or chain owned by an owner.
- **Key Fields**: `name`, `slug`, `currency`, `timezone`, brand colors.
- **Relationships**: `owner_id` -> `owners(id)`.

### `branches`
- **Purpose**: Physical locations for a restaurant.
- **Key Fields**: `name`, `address`, `operating_hours`, `is_main_branch`.
- **Relationships**: `restaurant_id` -> `restaurants(id)`.

### `staff_members`
- **Purpose**: Maps a profile to a restaurant/branch with a specific role.
- **Key Fields**: `role`, `employee_code`, `permissions`.
- **Relationships**: `profile_id` -> `profiles(id)`, `restaurant_id` -> `restaurants(id)`, `branch_id` -> `branches(id)`.

### `restaurant_settings` & `branch_settings`
- **Purpose**: Configuration for order workflows, taxes, and operational rules.
- **Key Fields**: `waiter_verification_required`, `tax_percentage`, `auto_accept_kitchen_orders`.

---

## 3. Physical Layout & QR Ordering

Handles the bridging between the physical restaurant and the digital ordering system.

### `restaurant_tables`
- **Purpose**: Represents physical tables in a branch.
- **Key Fields**: `table_number`, `capacity`, `status` (available, ordering, bill_requested).
- **Relationships**: `branch_id` -> `branches(id)`.

### `qr_codes`
- **Purpose**: Cryptographically secure tokens for customers to scan and access a table.
- **Key Fields**: `token` (URL-safe), `scan_count`.
- **Relationships**: `table_id` -> `restaurant_tables(id)`.

### `table_sessions`
- **Purpose**: Tracks active group sessions at a table to link multiple customers to one ongoing meal.
- **Key Fields**: `session_token`, `started_at`, `ended_at`.
- **Relationships**: `table_id` -> `restaurant_tables(id)`.

---

## 4. Menu System

A highly structured, hierarchical menu system supporting dietary tags and complex modifiers.

### Hierarchy
1. **`menu_categories`**: Top level (e.g., "Mains", "Drinks"). Supports time-based availability.
2. **`menu_subcategories`**: (e.g., "Curries", "Breads").
3. **`menu_items`**: The actual dish.
    - **Fields**: `base_price`, `dietary_type`, `spice_level`, `preparation_time_minutes`, `kitchen_station`.
4. **`menu_item_variants`**: Required choices (e.g., "Size: Small/Large", "Crust: Thin/Pan").
5. **`menu_addons`**: Optional extras (e.g., "Extra Cheese").

---

## 5. Order Management & Fulfillment

This is the core operational engine of the platform.

### `customers`
- **Purpose**: Lightweight representation of a guest.
- **Key Fields**: `phone`, `browser_fingerprint` (for session restoration), `total_spent`.

### `orders`
- **Purpose**: The main order header.
- **Key Fields**: `order_number` (human readable), `order_token` (secure tracker for customer UI), `status`, `subtotal`, `tax`, `total`.
- **Security**: Customers cannot insert directly. Orders are placed via Edge Functions (SECURITY DEFINER) to enforce idempotency and validation.

### `order_items` & `order_item_modifiers`
- **Purpose**: Line items for an order.
- **Key Concept**: Stores **Snapshots** (`item_name_snapshot`, `unit_price_snapshot`) to ensure historical orders remain accurate even if the menu changes later.
- **Fields**: `status` (pending, preparing, ready, served), `kitchen_station`.

### `order_events`
- **Purpose**: Immutable audit trail for every action taken on an order.
- **Key Fields**: `event_type` (e.g., 'order_placed', 'kitchen_accepted'), `actor_type`, `actor_id`.
- **Security**: Append-only. No UPDATE or DELETE allowed.

---

## 6. Staff Tooling & Auxiliary Features

### `waiter_suggestions` & `waiter_suggestion_rules`
- **Purpose**: Drives upselling by prompting waiters with recommendations based on current order context (e.g., time of day, category selected).
- **Key Fields**: `suggestion_type`, `waiter_message`.

### `notifications`
- **Purpose**: Internal system alerts for staff (e.g., "New Order on Table 5").
- **Relationships**: `recipient_id` -> `profiles(id)`.

### `payments`
- **Purpose**: Tracks payment statuses and methods.
- **Key Fields**: `status`, `method` (cash, card, upi), `amount`, `external_reference`.

---

## Summary of Key Architectural Decisions

1. **Snapshotting**: Prices and names are snapshotted on `order_items` and `order_item_modifiers` at the time of order creation. This prevents historical financial data from being corrupted when menu prices are updated.
2. **Customer Security**: Customers do not exist in the Auth schema. They are authenticated dynamically to a specific table session via a cryptographically secure `order_token` and `session_token`.
3. **Immutable Auditing**: `order_events` tracks all state changes. This is critical for resolving disputes, calculating prep times, and general analytics. No modifications are permitted to this table.
4. **Idempotency**: The `orders` table uses a `client_request_id` to prevent duplicate order submissions in poor network conditions.
