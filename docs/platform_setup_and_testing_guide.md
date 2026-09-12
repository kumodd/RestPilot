# RestPilot — Platform Setup & Role Manual

> **Single-source guide** for every role on the platform.
> Read your section, follow the steps, and you're live.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Environment Setup (All Roles)](#2-environment-setup-all-roles)
3. [Role: Platform Admin (Super Admin)](#3-role-platform-admin-super-admin)
4. [Role: Restaurant Owner](#4-role-restaurant-owner)
5. [Role: Manager](#5-role-manager)
6. [Role: Waiter](#6-role-waiter)
7. [Role: Chef / Kitchen Manager](#7-role-chef--kitchen-manager)
8. [Role: Cashier](#8-role-cashier)
9. [Role: Customer (No Login)](#9-role-customer-no-login)
10. [End-to-End Test Loop](#10-end-to-end-test-loop)

---

## 1. Platform Overview

RestPilot is a **multi-tenant QR restaurant ordering platform** where:

| Layer | What it does |
|-------|-------------|
| **Platform Admin** | Provisions restaurant owners, manages subscriptions |
| **Owner** | Owns one or more restaurants, manages everything within them |
| **Manager** | Day-to-day restaurant operations — menu, staff, settings |
| **Waiter** | Receives orders, verifies them, serves customers |
| **Chef / Kitchen Manager** | Sees confirmed orders on the KDS, marks them ready |
| **Cashier** | Views orders for billing purposes |
| **Customer** | Scans QR → browses menu → places order → tracks it live |

**Architecture:**
- Frontend: Next.js 16 (App Router) at `http://localhost:3000`
- Backend: Supabase (Auth + Postgres + Realtime + Storage)
- Customer flow is **unauthenticated** (no login required)
- All staff log in via magic link or email/password

---

## 2. Environment Setup (All Roles)

### Prerequisites
- Node.js 18+
- A Supabase project with migrations applied

### Environment Variables
Open `.env` in the project root and verify:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
# Optional — only needed for server-side admin scripts
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get these from: **Supabase Dashboard → Project Settings → API**

### Apply Database Migrations
Run all migrations in order in the Supabase SQL Editor:

```
supabase/migrations/001_schema.sql      ← Core tables & enums
supabase/migrations/002_rls.sql         ← Row-Level Security policies
supabase/migrations/003_indexes.sql     ← Performance indexes
supabase/migrations/004_functions.sql   ← Order & QR functions
supabase/migrations/005_schema_fixes.sql ← UNIQUE constraint on owners.profile_id
supabase/migrations/006_provisioning.sql ← Provisioning & permission functions
```

### Start the Dev Server
```bash
cd /Users/cdse/Desktop/RestPilot
npm run dev
# → http://localhost:3000
```

---

## 3. Role: Platform Admin (Super Admin)

> **Access:** `/admin` · Must have `role = 'platform_admin'` in `profiles` table

### First-Time Setup — Promote Yourself to Platform Admin

1. Sign up at `http://localhost:3000/auth/login` (use magic link with your email)
2. After sign-in, go to **Supabase Dashboard → SQL Editor** and run:

```sql
UPDATE profiles
SET role = 'platform_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

3. Navigate to `http://localhost:3000/admin` — you now have full admin access.

---

### Admin Dashboard Overview — `/admin`

| Metric shown | What it means |
|-------------|--------------|
| Total Restaurants | All active tenants on the platform |
| Active Orders | Orders placed in the last 24 hours |
| Monthly Revenue | Sum of all orders this month |
| Platform Users | All registered staff profiles |

Quick links: **All Owners → Provision Owner → All Restaurants → Subscriptions → Analytics**

---

### Provision a Restaurant Owner — `/admin/owners/create`

Use the 2-step wizard:

**Step 1 — Owner Account**
1. Enter the owner's **Full Name**, **Email**, and **Phone**
2. Enter their **Business / Brand Name** (e.g., "Smith Hospitality Group")
3. Select **Subscription Plan**: `Free` | `Standard` | `Premium`
4. Set **Max Restaurants** (how many restaurants they can create)
5. Click **Create Owner & Continue →**

> **If you see "invite_required":** The owner's email has no Supabase account yet.
> Click **Send Magic-Link Invite** — this emails them a login link.
> Once they click it (creating their account), come back and submit again.

**Step 2 — Restaurant Setup**
1. Enter the **Restaurant Name** (slug auto-generates from the name)
2. Adjust the **URL Slug** if needed (e.g., `the-grand-kitchen`)
3. Enter **City**, **Phone**, **Email**, and **Currency**
4. Click **Create Restaurant →**

> This atomically creates: Restaurant + Main Branch + Default Settings

**Completion** — you'll see the Owner ID and Restaurant ID for your records.

---

### Manage an Existing Owner — `/admin/owners/[ownerId]`

Click **Manage →** on any owner in the `/admin/owners` list to see:
- Owner info (plan, status, contact)
- All their restaurants (active/paused)
- Each restaurant's staff with role badges and permission tags

---

### Manage Restaurants — `/admin/restaurants`

Full table of all restaurants across all owners:
- Filter by plan or status
- See owner, subscription, and restaurant counts

### Manage Subscriptions — `/admin/subscriptions`

- Plan breakdown (Free / Standard / Premium counts)
- Expiry warning indicators for subscriptions nearing end date

---

## 4. Role: Restaurant Owner

> **Access:** `/dashboard` · Role `owner` in `profiles` + row in `owners` table

### How to Get Access
The **Platform Admin** provisions your account (see Section 3).
You'll receive a **magic link email** — click it to sign in.

Your first login redirects you to `http://localhost:3000/dashboard`.

---

### Dashboard Overview — `/dashboard`

Shows today's stats: orders placed, revenue, active tables, popular items.

---

### Set Up Your Restaurant — `/dashboard/settings`

Navigate to **Settings** (⚙️ in sidebar). Configure all 4 tabs:

**General Tab**
- Restaurant name, description, phone, email, website
- Currency symbol and code (default: ₹ / INR)

**Order Workflow Tab**
| Toggle | What it controls |
|--------|----------------|
| Waiter Verification Required | Orders must be reviewed by a waiter before going to kitchen |
| Customers Can Add Items | Allow adding items to an active order |
| Customer Name Required | Force name entry before ordering |
| Customer Phone Required | Force phone entry before ordering |
| Auto-Accept Kitchen Orders | Skip waiter step entirely |

**Tax & Charges Tab**
- Enable GST / Tax with a custom % and label
- Enable Service Charge with a custom %
- Live preview shows what a ₹200 order would cost

**Notifications Tab**
- Waiter sound alerts (on new orders)
- Kitchen sound alerts (on new orders arriving at KDS)

---

### Build Your Menu — `/dashboard/menu`

**Create a Category:**
1. Click **+ Add Category**
2. Enter name (e.g., "Mains"), description (optional), sort order
3. Save

**Add Menu Items:**
1. Click **+ Add Item** inside a category
2. Fill in the **4 tabs**:

| Tab | What to configure |
|-----|-----------------|
| **Basic Info** | Name, description, price, prep time, category |
| **Labels** | Dietary type (Veg/Non-Veg/Vegan/Gluten-Free), spice level, Popular/New/Special flags |
| **Variants** | Size groups (e.g., Small/Medium/Large with price differences) |
| **Add-ons** | Optional extras (e.g., Extra Cheese +₹30) |

**Availability:** Toggle the switch on any item or category to instantly hide/show it from customers.

---

### Set Up Tables & QR Codes — `/dashboard/tables`

1. Click **Add Table** → enter table number and capacity
2. Select a table → click **Generate QR**
3. **Download** the QR image and print/display it on the physical table
4. The QR links to: `http://localhost:3000/t/[tableToken]`

---

### Manage Staff — `/dashboard/staff`

See Section 5 (Manager role) — owners have the same access plus can manage managers.

---

## 5. Role: Manager

> **Access:** `/dashboard` · Role `manager` · Permissions set by owner

### How to Get Access
The Owner (or another Manager) adds you via **Dashboard → Staff → + Add Staff**.
You'll receive a **magic link email** to activate your account.

---

### Add Staff Members — `/dashboard/staff`

1. Click **+ Add Staff**
2. Enter their **email address**
3. Select their **Role**: Manager / Waiter / Chef / Kitchen Manager / Cashier
4. Select their **Branch** (if multi-branch)
5. Review and adjust **Permissions** (auto-populated from role defaults):

**Permission Groups:**

| Group | Key Permissions |
|-------|---------------|
| 🍽️ Orders | View orders, confirm orders, advance status, cancel, add items |
| 🍽️ Menu | View menu, edit menu, toggle availability |
| 🪑 Tables | View tables, manage tables (add/edit/QR) |
| 👥 Staff | View staff, manage staff (invite/deactivate) |
| 📊 Reports | View reports, export data |
| ⚙️ Settings | View settings, edit settings |
| 👨‍🍳 Kitchen | Kitchen display access, mark items ready |

6. Click **Add Staff Member**

> **If "invite_required":** The email isn't registered. The system auto-sends a magic link. Once they sign up, re-submit to link them to the restaurant.

**Editing Permissions Later:**
Click **Permissions** on any staff row → opens the permissions editor:
- Toggle individual permissions with checkboxes
- Use **Presets** (Manager / Waiter / Chef / etc.) to reset to defaults
- **Select All / Deselect All** per group
- **Clear All** to revoke everything

---

### Live Orders — `/dashboard/orders`

Kanban board with columns per status. Drag or click **Advance →** to move orders forward.

### Restaurant Settings

Same as Owner (see Section 4 Settings). If you have the `edit_settings` permission.

---

## 6. Role: Waiter

> **Access:** `/dashboard` · Role `waiter` · Minimal permissions by default

### How to Get Access
The Manager/Owner adds you via Staff management. You'll receive a magic link email.

### Login
Go to `http://localhost:3000/auth/login` → enter your email → click the magic link.

---

### Your Daily Workflow

**1. Monitor New Orders — `/dashboard/orders`**
- The Kanban board shows orders in **real-time** (Supabase Realtime)
- New orders appear in the **"Placed"** or **"Awaiting Waiter"** column
- A sound notification plays when a new order arrives (if enabled)

**2. Review an Order**
- Click any order card to expand it
- Check the items, customer name, table number, and any notes
- If waiter recommendations are enabled, you'll see suggested items to propose

**3. Confirm the Order**
- Click **Confirm →** to send the order to the kitchen
- The customer's tracking screen instantly updates to "Confirmed"

**4. Mark as Served**
- Once the Kitchen marks items ready, advance the order to **Served**
- This updates the customer's tracking screen to "Order Served"

---

## 7. Role: Chef / Kitchen Manager

> **Access:** `/dashboard/kitchen` (KDS — Kitchen Display System) · Role `chef` or `kitchen_manager`

### How to Get Access
Added by Manager/Owner via Staff management with magic-link invite.

---

### Kitchen Display System (KDS) — `/dashboard/kitchen`

Full-screen ticket board, designed for tablets mounted in the kitchen.

**Reading a Ticket:**

| Element | Meaning |
|---------|---------|
| **#42** (large number) | Order number |
| **🟣 New** | Confirmed by waiter, waiting for kitchen to accept |
| **🔵 Accepted** | Kitchen has acknowledged |
| **🟠 Cooking** | Actively being prepared |
| **🟢 Ready** | All items done, waiting for waiter to collect |
| **⏱ 8m** (top-right) | Minutes since order was confirmed |
| **Yellow timer** | Order is 15+ minutes old — needs attention |
| **Red timer + URGENT** | Order is 25+ minutes old — critical |

**Pulsing border** = brand new unaccepted order (needs immediate action).

---

### Processing an Order

**Option A — Advance the whole order:**
1. Tap **Accept →** (New → Accepted)
2. Tap **Start Cooking →** (Accepted → Cooking)
3. Tap **Mark Ready →** (Cooking → Ready)
   → Waiter is notified in real-time

**Option B — Check off individual items:**
- Tap the circle next to each item as you complete it
- ✓ = item done (struck through, faded)
- Tap again to un-check if needed

**Sound alerts:** A two-tone beep plays when a new order arrives.

---

## 8. Role: Cashier

> **Access:** `/dashboard` · Role `cashier` · Read-only order and report access

### How to Get Access
Added by Manager/Owner via Staff management.

### What You Can Do
- **View orders** (`view_orders` permission) — see order totals, table, customer
- **View reports** (`view_reports` permission) — revenue, daily totals
- Cannot confirm, advance, or modify orders

### Typical Use
Monitor the orders board to reconcile cash payments and verify completed orders match receipts.

---

## 9. Role: Customer (No Login)

> **No account required.** Everything happens via the QR code.

### The Customer Journey

**1. Scan the QR Code**
- Customer points phone camera at the QR on the table
- Taken directly to: `http://localhost:3000/t/[tableToken]`
- Sees the restaurant's branded landing page (logo, name, "View Menu" button)

**2. Browse the Menu**
- Full menu with categories, item photos, descriptions, prices
- Dietary badges (🌿 Veg, 🥩 Non-Veg, 🌱 Vegan, 🌾 Gluten-Free)
- Spice level indicators
- **Popular**, **New**, **Special** tags

**3. Customize & Add to Cart**
- Tap any item → bottom sheet opens
- Select **Variants** (e.g., size) and **Add-ons** (e.g., extra cheese)
- Add special instructions for the kitchen
- Tap **Add to Cart**

**4. Place Order**
- Tap the cart button (floating, shows item count)
- Enter **Name** and **Phone** (auto-saved in browser for future visits)
- Review order total (subtotal + tax + service charge if applicable)
- Tap **Place Order**

**5. Live Order Tracking**
- Instantly redirected to: `http://localhost:3000/order/[orderToken]`
- Timeline updates in real-time:

```
✅ Order Placed
✅ Waiter Reviewing
✅ Confirmed — Going to Kitchen
✅ Being Prepared
✅ Ready — Your order is ready!
✅ Served — Enjoy your meal!
```

**6. Re-ordering**
- Name and phone are remembered by the browser (localStorage)
- Next visit to the same restaurant pre-fills the customer form

---

## 10. End-to-End Test Loop

Use **4 browser windows** to simulate the full flow simultaneously:

```
Window 1 (Incognito)  → Customer
Window 2              → Waiter dashboard
Window 3              → KDS (Kitchen Display)
Window 4              → Owner dashboard
```

### Step-by-Step

| Step | Actor | Action | What others see |
|------|-------|--------|----------------|
| 1 | **Customer** | Scan QR for Table 1 → Add "Burger" → Place Order | — |
| 2 | **Waiter** | See new order in "Placed" column | Customer sees "Awaiting Waiter" |
| 3 | **Waiter** | Review order → click **Confirm →** | Customer sees "Confirmed"; KDS shows ticket |
| 4 | **Chef** | KDS: tap **Accept →** then **Start Cooking →** | Customer sees "Being Prepared" |
| 5 | **Chef** | Check off each item → tap **Mark Ready →** | Customer sees "Ready!"; Waiter notified |
| 6 | **Waiter** | Collect food → advance to **Served** | Customer sees "Served — Enjoy!" |
| 7 | **Owner** | Check `/dashboard` overview | Revenue + order count updated |

### Verifying Results
After the loop:
1. **Customer** — order status shows "Served"
2. **Waiter** — order moves to "Served" column
3. **Kitchen** — ticket disappears from KDS board
4. **Owner Reports** (`/dashboard/reports`) — order appears in daily revenue

---

## Quick Reference: URLs by Role

| Role | Primary URL |
|------|------------|
| Platform Admin | `http://localhost:3000/admin` |
| Owner / Manager | `http://localhost:3000/dashboard` |
| Waiter | `http://localhost:3000/dashboard/orders` |
| Chef | `http://localhost:3000/dashboard/kitchen` |
| Cashier | `http://localhost:3000/dashboard/orders` |
| Customer | `http://localhost:3000/t/[tableToken]` (via QR scan) |
| Order Tracking | `http://localhost:3000/order/[orderToken]` |
| Login (all staff) | `http://localhost:3000/auth/login` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "No restaurant found" after login | Platform Admin hasn't provisioned your restaurant yet |
| Staff can't see certain pages | Check their permissions in `/dashboard/staff` |
| QR code returns 404 | QR was deleted or table token is invalid — regenerate |
| Real-time updates not working | Check Supabase Realtime is enabled for `orders` and `order_items` tables |
| "invite_required" when adding staff | User hasn't signed up yet — magic link was sent; ask them to check email |
| `subscription_plan` SQL error | Only valid values: `free`, `standard`, `premium` (not `trial`) |
| `middleware` deprecation warning | Ensure `src/proxy.ts` exists and `src/middleware.ts` is deleted |
