// ============================================================
// RestPilot — TypeScript Database Types
// Auto-generated from Supabase schema
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types matching the database
export type UserRole =
  | 'platform_admin'
  | 'owner'
  | 'manager'
  | 'waiter'
  | 'chef'
  | 'kitchen_manager'
  | 'cashier'

export type OrderStatus =
  | 'draft'
  | 'placed'
  | 'awaiting_waiter_verification'
  | 'waiter_reviewing'
  | 'confirmed'
  | 'kitchen_accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'payment_pending'
  | 'payment_failed'

export type ItemStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'cancelled'
  | 'unavailable'

export type TableStatus =
  | 'available'
  | 'ordering'
  | 'order_active'
  | 'ready_to_serve'
  | 'bill_requested'
  | 'cleaning'

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'failed'
  | 'cancelled'

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'online' | 'other'

export type SuggestionType =
  | 'popular'
  | 'new'
  | 'special'
  | 'addon'
  | 'upsell'
  | 'seasonal'

export type ActorType =
  | 'customer'
  | 'waiter'
  | 'chef'
  | 'manager'
  | 'owner'
  | 'platform_admin'
  | 'system'

export type OrderEventType =
  | 'order_placed'
  | 'waiter_assigned'
  | 'waiter_reviewing'
  | 'waiter_verified'
  | 'item_added'
  | 'item_removed'
  | 'item_modified'
  | 'order_confirmed'
  | 'kitchen_accepted'
  | 'preparing_started'
  | 'order_ready'
  | 'order_served'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_rejected'
  | 'bill_requested'
  | 'payment_received'

export type DietaryType =
  | 'veg'
  | 'non_veg'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'jain'
  | 'halal'
  | 'kosher'

export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot'

export type SubscriptionPlan = 'free' | 'standard' | 'premium'

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'suspended'
  | 'cancelled'
  | 'expired'

// ============================================================
// DATABASE INTERFACE
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      owners: {
        Row: {
          id: string
          profile_id: string
          business_name: string | null
          email: string | null
          phone: string | null
          subscription_plan: SubscriptionPlan
          subscription_status: SubscriptionStatus
          subscription_started_at: string | null
          subscription_expires_at: string | null
          max_restaurants: number
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['owners']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['owners']['Insert']>
      }

      restaurants: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          cover_image_url: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          country: string
          timezone: string
          currency: string
          currency_symbol: string
          website_url: string | null
          is_active: boolean
          is_accepting_orders: boolean
          primary_color: string | null
          secondary_color: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['restaurants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>
      }

      branches: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          address: string | null
          city: string | null
          phone: string | null
          is_main_branch: boolean
          is_active: boolean
          operating_hours: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['branches']['Insert']>
      }

      staff_members: {
        Row: {
          id: string
          profile_id: string
          restaurant_id: string
          branch_id: string | null
          role: UserRole
          employee_code: string | null
          is_active: boolean
          permissions: Json
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['staff_members']['Row'], 'id' | 'created_at' | 'updated_at' | 'joined_at'>
        Update: Partial<Database['public']['Tables']['staff_members']['Insert']>
      }

      restaurant_settings: {
        Row: {
          id: string
          restaurant_id: string
          waiter_verification_required: boolean
          customer_can_add_items: boolean
          customer_can_remove_confirmed_items: boolean
          waiter_recommendations_enabled: boolean
          customer_name_required: boolean
          customer_phone_required: boolean
          tax_enabled: boolean
          tax_percentage: number
          tax_label: string | null
          service_charge_enabled: boolean
          service_charge_percentage: number
          service_charge_label: string | null
          auto_accept_kitchen_orders: boolean
          max_items_per_order: number | null
          waiter_sound_notifications: boolean
          kitchen_sound_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['restaurant_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['restaurant_settings']['Insert']>
      }

      restaurant_tables: {
        Row: {
          id: string
          branch_id: string
          restaurant_id: string
          table_number: string
          display_name: string | null
          capacity: number | null
          status: TableStatus
          is_active: boolean
          floor: string | null
          section: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['restaurant_tables']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['restaurant_tables']['Insert']>
      }

      qr_codes: {
        Row: {
          id: string
          table_id: string
          branch_id: string
          restaurant_id: string
          token: string
          is_active: boolean
          generated_at: string
          generated_by: string | null
          last_scanned_at: string | null
          scan_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['qr_codes']['Row'], 'id' | 'created_at' | 'updated_at' | 'generated_at' | 'scan_count'>
        Update: Partial<Database['public']['Tables']['qr_codes']['Insert']>
      }

      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          is_available: boolean
          available_from: string | null
          available_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_categories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_categories']['Insert']>
      }

      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string
          subcategory_id: string | null
          name: string
          description: string | null
          image_url: string | null
          base_price: number
          is_popular: boolean
          is_new: boolean
          is_special: boolean
          is_recommended: boolean
          dietary_type: DietaryType | null
          spice_level: SpiceLevel | null
          allergens: string[] | null
          ingredients: string[] | null
          preparation_time_minutes: number | null
          kitchen_station: string | null
          is_active: boolean
          is_available: boolean
          tax_category: string | null
          sort_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }

      menu_item_variants: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          options: Json
          is_required: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_item_variants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_item_variants']['Insert']>
      }

      menu_addons: {
        Row: {
          id: string
          restaurant_id: string
          menu_item_id: string | null
          name: string
          price: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_addons']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_addons']['Insert']>
      }

      customers: {
        Row: {
          id: string
          restaurant_id: string
          name: string | null
          phone: string | null
          browser_fingerprint: string | null
          first_visit_at: string
          last_visit_at: string
          last_order_at: string | null
          total_orders: number
          total_spent: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at' | 'first_visit_at' | 'last_visit_at' | 'total_orders' | 'total_spent'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }

      table_sessions: {
        Row: {
          id: string
          table_id: string
          branch_id: string
          restaurant_id: string
          session_token: string
          is_active: boolean
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['table_sessions']['Row'], 'id' | 'created_at' | 'updated_at' | 'started_at'>
        Update: Partial<Database['public']['Tables']['table_sessions']['Insert']>
      }

      orders: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_id: string
          table_session_id: string | null
          customer_id: string | null
          assigned_waiter_id: string | null
          order_number: number
          status: OrderStatus
          customer_name_snapshot: string | null
          customer_phone_snapshot: string | null
          client_request_id: string | null
          order_token: string
          customer_notes: string | null
          subtotal: number
          discount: number
          tax: number
          service_charge: number
          total: number
          placed_at: string | null
          waiter_assigned_at: string | null
          verified_at: string | null
          confirmed_at: string | null
          kitchen_accepted_at: string | null
          preparing_started_at: string | null
          ready_at: string | null
          served_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at' | 'order_token'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }

      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          item_name_snapshot: string
          item_description_snapshot: string | null
          unit_price_snapshot: number
          quantity: number
          line_total: number
          status: ItemStatus
          special_instructions: string | null
          added_by_user_id: string | null
          added_by_actor_type: ActorType
          kitchen_station: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }

      order_item_modifiers: {
        Row: {
          id: string
          order_item_id: string
          modifier_type: 'variant' | 'addon'
          modifier_name_snapshot: string
          option_name_snapshot: string | null
          price_snapshot: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_item_modifiers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['order_item_modifiers']['Insert']>
      }

      order_events: {
        Row: {
          id: string
          order_id: string
          event_type: OrderEventType
          actor_type: ActorType
          actor_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_events']['Row'], 'id' | 'created_at'>
        Update: never
      }

      waiter_suggestions: {
        Row: {
          id: string
          restaurant_id: string
          menu_item_id: string | null
          suggestion_type: SuggestionType
          waiter_message: string | null
          internal_notes: string | null
          priority: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['waiter_suggestions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['waiter_suggestions']['Insert']>
      }

      notifications: {
        Row: {
          id: string
          recipient_id: string
          restaurant_id: string
          order_id: string | null
          title: string
          body: string | null
          notification_type: string
          is_read: boolean
          read_at: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }

      payments: {
        Row: {
          id: string
          order_id: string
          restaurant_id: string
          status: PaymentStatus
          method: PaymentMethod | null
          amount: number
          currency: string
          external_reference: string | null
          notes: string | null
          processed_by: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }

    Functions: {
      resolve_qr_token: {
        Args: { p_token: string }
        Returns: Json
      }
      create_order_secure: {
        Args: {
          p_restaurant_id: string
          p_branch_id: string
          p_table_id: string
          p_table_session_id: string | null
          p_customer_name: string | null
          p_customer_phone: string | null
          p_customer_notes: string | null
          p_client_request_id: string | null
          p_items: Json
        }
        Returns: Json
      }
      transition_order_status: {
        Args: {
          p_order_id: string
          p_new_status: OrderStatus
          p_actor_id?: string
          p_actor_type?: ActorType
          p_metadata?: Json
        }
        Returns: Json
      }
      is_platform_admin: {
        Args: Record<never, never>
        Returns: boolean
      }
      owns_restaurant: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
    }

    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      item_status: ItemStatus
      table_status: TableStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      suggestion_type: SuggestionType
      actor_type: ActorType
      order_event_type: OrderEventType
      dietary_type: DietaryType
      spice_level: SpiceLevel
      subscription_plan: SubscriptionPlan
      subscription_status: SubscriptionStatus
    }
  }
}
