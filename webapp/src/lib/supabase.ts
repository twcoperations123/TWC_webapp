import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ')

  const message = `Missing environment variable(s): ${missing}`
  console.warn(message)
  throw new Error(message)
}

console.log('� Connected to Supabase:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isDemoMode = false

// Database types
export interface Database {
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string
          admin_email: string
          phone_number: string | null
          enable_email_notifications: boolean
          enable_sms_notifications: boolean
          notification_email: string | null
          paypal_email: string | null
          profile_image: string | null
          business_hours: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_email: string
          phone_number?: string | null
          enable_email_notifications?: boolean
          enable_sms_notifications?: boolean
          notification_email?: string | null
          paypal_email?: string | null
          profile_image?: string | null
          business_hours?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_email?: string
          phone_number?: string | null
          enable_email_notifications?: boolean
          enable_sms_notifications?: boolean
          notification_email?: string | null
          paypal_email?: string | null
          profile_image?: string | null
          business_hours?: any
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          name: string
          ingredients: string
          unit_size: string
          abv: number
          price: number
          image_url?: string
          category: string
          in_stock: boolean
          is_draft: boolean
          assignment_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          ingredients: string
          unit_size: string
          abv?: number
          price: number
          image_url?: string
          category: string
          in_stock?: boolean
          is_draft?: boolean
          assignment_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          ingredients?: string
          unit_size?: string
          abv?: number
          price?: number
          image_url?: string
          category?: string
          in_stock?: boolean
          is_draft?: boolean
          assignment_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_menus: {
        Row: {
          id: string
          user_id: string
          menu_item_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          menu_item_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          menu_item_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      shopping_carts: {
        Row: {
          id: string
          user_id: string
          menu_item_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          menu_item_id: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          menu_item_id?: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          address: string
          username: string
          password: string
          email: string
          phone_number: string
          profile_image?: string
          role: string
          comments?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          username: string
          password: string
          email: string
          phone_number: string
          profile_image?: string
          role?: string
          comments?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          username?: string
          password?: string
          email?: string
          phone_number?: string
          profile_image?: string
          role?: string
          comments?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          user_name: string
          items: any
          total: number
          status: string
          delivery_date: string
          delivery_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          items: any
          total: number
          status?: string
          delivery_date: string
          delivery_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          items?: any
          total?: number
          status?: string
          delivery_date?: string
          delivery_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          user_name: string
          user_email: string
          subject: string
          category: string
          priority: string
          description: string
          status: string
          admin_response?: string
          admin_response_date?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          user_email: string
          subject: string
          category: string
          priority: string
          description: string
          status?: string
          admin_response?: string
          admin_response_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          user_email?: string
          subject?: string
          category?: string
          priority?: string
          description?: string
          status?: string
          admin_response?: string
          admin_response_date?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 
