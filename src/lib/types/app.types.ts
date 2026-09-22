// ============================================================
// RestPilot — Application-Level Types
// Higher-level types built on top of database types
// ============================================================

import type {
  Database,
  OrderStatus,
  ItemStatus,
  TableStatus,
  DietaryType,
  SpiceLevel,
  SuggestionType,
  UserRole,
} from './database.types'

// Row type shorthands
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Owner = Database['public']['Tables']['owners']['Row']
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']
export type StaffMember = Database['public']['Tables']['staff_members']['Row']
export type RestaurantSettings = Database['public']['Tables']['restaurant_settings']['Row']
export type RestaurantTable = Database['public']['Tables']['restaurant_tables']['Row']
export type QRCode = Database['public']['Tables']['qr_codes']['Row']
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type MenuItemVariant = Database['public']['Tables']['menu_item_variants']['Row']
export type MenuAddon = Database['public']['Tables']['menu_addons']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type TableSession = Database['public']['Tables']['table_sessions']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemModifier = Database['public']['Tables']['order_item_modifiers']['Row']
export type OrderEvent = Database['public']['Tables']['order_events']['Row']
export type WaiterSuggestion = Database['public']['Tables']['waiter_suggestions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']

// ============================================================
// COMPOSITE TYPES (for UI rendering)
// ============================================================

// QR token resolution result
export interface QRResolution {
  restaurant: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    cover_image_url: string | null
    primary_color: string | null
    secondary_color: string | null
    currency_symbol: string
    is_accepting_orders: boolean
  }
  branch: {
    id: string
    name: string
    city: string | null
  }
  table: {
    id: string
    table_number: string
    display_name: string | null
    section: string | null
    floor: string | null
  }
}

// Menu item with its variants and add-ons (for customer menu)
export interface MenuItemFull extends MenuItem {
  variants: MenuItemVariant[]
  addons: MenuAddon[]
}

// Menu category with its items (for full menu page)
export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItemFull[]
}

// Cart item (client-side only, never sent as price to server)
export interface CartItem {
  cartItemId: string
  menuItemId: string
  name: string
  basePrice: number
  quantity: number
  selectedVariants: Array<{
    variantId: string
    variantName: string
    optionName: string
    priceDelta: number
  }>
  selectedAddons: Array<{
    addonId: string
    name: string
    price: number
  }>
  specialInstructions: string
  lineTotal: number // calculated client-side for display only
}

// Order with items for dashboard / waiter view
export interface OrderFull extends Order {
  items: Array<OrderItem & { modifiers: OrderItemModifier[] }>
  events: OrderEvent[]
  table: RestaurantTable | null
}

// Order tracking view for customer
export interface OrderTracking {
  order_number: number
  status: OrderStatus
  table_number: string
  items: Array<{
    name: string
    quantity: number
    status: ItemStatus
    special_instructions: string | null
  }>
  subtotal: number
  tax: number
  service_charge: number
  total: number
  currency_symbol: string
  placed_at: string | null
  confirmed_at: string | null
  ready_at: string | null
  served_at: string | null
  events: Array<{
    event_type: string
    created_at: string
  }>
}

// Customer browser-stored data (per restaurant)
export interface CustomerBrowserData {
  name: string
  phone: string
  savedAt: string
}

// Order status display config
export interface OrderStatusConfig {
  label: string
  color: string
  bgColor: string
  description: string
  step: number
  isTerminal: boolean
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  draft: {
    label: 'Draft',
    color: 'var(--status-draft)',
    bgColor: 'var(--status-draft-bg)',
    description: 'Order being prepared',
    step: 0,
    isTerminal: false,
  },
  placed: {
    label: 'Order Placed',
    color: 'var(--status-placed)',
    bgColor: 'var(--status-placed-bg)',
    description: 'Your order has been received',
    step: 1,
    isTerminal: false,
  },
  awaiting_waiter_verification: {
    label: 'Awaiting Waiter',
    color: 'var(--status-awaiting)',
    bgColor: 'var(--status-awaiting-bg)',
    description: 'Waiter will visit your table soon',
    step: 2,
    isTerminal: false,
  },
  waiter_reviewing: {
    label: 'Waiter at Table',
    color: 'var(--status-reviewing)',
    bgColor: 'var(--status-reviewing-bg)',
    description: 'Waiter is reviewing your order',
    step: 2,
    isTerminal: false,
  },
  confirmed: {
    label: 'Order Confirmed',
    color: 'var(--status-confirmed)',
    bgColor: 'var(--status-confirmed-bg)',
    description: 'Order confirmed and sent to kitchen',
    step: 3,
    isTerminal: false,
  },
  kitchen_accepted: {
    label: 'Kitchen Accepted',
    color: 'var(--status-kitchen)',
    bgColor: 'var(--status-kitchen-bg)',
    description: 'Kitchen has accepted your order',
    step: 4,
    isTerminal: false,
  },
  preparing: {
    label: 'Preparing',
    color: 'var(--status-preparing)',
    bgColor: 'var(--status-preparing-bg)',
    description: 'Your food is being prepared',
    step: 4,
    isTerminal: false,
  },
  ready: {
    label: 'Ready!',
    color: 'var(--status-ready)',
    bgColor: 'var(--status-ready-bg)',
    description: 'Your order is ready to be served',
    step: 5,
    isTerminal: false,
  },
  served: {
    label: 'Served',
    color: 'var(--status-served)',
    bgColor: 'var(--status-served-bg)',
    description: 'Enjoy your meal!',
    step: 6,
    isTerminal: false,
  },
  completed: {
    label: 'Completed',
    color: 'var(--status-completed)',
    bgColor: 'var(--status-completed-bg)',
    description: 'Order completed',
    step: 6,
    isTerminal: true,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'var(--status-cancelled)',
    bgColor: 'var(--status-cancelled-bg)',
    description: 'Order was cancelled',
    step: -1,
    isTerminal: true,
  },
  rejected: {
    label: 'Rejected',
    color: 'var(--status-cancelled)',
    bgColor: 'var(--status-cancelled-bg)',
    description: 'Order was rejected',
    step: -1,
    isTerminal: true,
  },
  payment_pending: {
    label: 'Payment Pending',
    color: 'var(--status-awaiting)',
    bgColor: 'var(--status-awaiting-bg)',
    description: 'Awaiting payment',
    step: 6,
    isTerminal: false,
  },
  payment_failed: {
    label: 'Payment Failed',
    color: 'var(--status-cancelled)',
    bgColor: 'var(--status-cancelled-bg)',
    description: 'Payment failed',
    step: -1,
    isTerminal: true,
  },
}

export const TABLE_STATUS_CONFIG: Record<TableStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: '#22c55e' },
  ordering: { label: 'Ordering', color: '#f59e0b' },
  order_active: { label: 'Active Order', color: '#3b82f6' },
  ready_to_serve: { label: 'Ready to Serve', color: '#8b5cf6' },
  bill_requested: { label: 'Bill Requested', color: '#ef4444' },
  cleaning: { label: 'Cleaning', color: '#6b7280' },
}

export const DIETARY_LABELS: Record<DietaryType, { label: string; color: string; icon: string }> = {
  veg: { label: 'Veg', color: '#16a34a', icon: '🟢' },
  non_veg: { label: 'Non-Veg', color: '#dc2626', icon: '🔴' },
  vegan: { label: 'Vegan', color: '#15803d', icon: '🌱' },
  gluten_free: { label: 'Gluten Free', color: '#d97706', icon: 'GF' },
  dairy_free: { label: 'Dairy Free', color: '#0891b2', icon: 'DF' },
  jain: { label: 'Jain', color: '#7c3aed', icon: 'J' },
  halal: { label: 'Halal', color: '#059669', icon: 'H' },
  kosher: { label: 'Kosher', color: '#1d4ed8', icon: 'K' },
}

export const SPICE_LABELS: Record<SpiceLevel, { label: string; icon: string }> = {
  none: { label: 'Not Spicy', icon: '' },
  mild: { label: 'Mild', icon: '🌶️' },
  medium: { label: 'Medium', icon: '🌶️🌶️' },
  hot: { label: 'Hot', icon: '🌶️🌶️🌶️' },
  extra_hot: { label: 'Extra Hot', icon: '🔥🔥🔥' },
}

export const SUGGESTION_TYPE_CONFIG: Record<SuggestionType, { label: string; color: string; bgColor: string }> = {
  popular: { label: 'Popular', color: '#f59e0b', bgColor: '#fef3c7' },
  new: { label: 'New', color: '#10b981', bgColor: '#d1fae5' },
  special: { label: 'Special', color: '#8b5cf6', bgColor: '#ede9fe' },
  addon: { label: 'Add-on', color: '#3b82f6', bgColor: '#dbeafe' },
  upsell: { label: 'Upsell', color: '#ec4899', bgColor: '#fce7f3' },
  seasonal: { label: 'Seasonal', color: '#f97316', bgColor: '#ffedd5' },
}

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Platform Admin',
  owner: 'Owner',
  manager: 'Manager',
  waiter: 'Waiter',
  chef: 'Chef',
  kitchen_manager: 'Kitchen Manager',
  cashier: 'Cashier',
}
