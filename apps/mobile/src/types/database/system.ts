/**
 * System and Service Management Tables
 *
 * This module contains all database types related to system
 * configuration, service categories, and administrative functions.
 */

export type SystemTables = {
  notifications: {
    Row: {
      id: string
      user_id: string
      title: string
      body: string
      data: unknown | null
      type: 'job_update' | 'bid_received' | 'meeting_scheduled' | 'payment_received' | 'message_received' | 'quote_sent' | 'system'
      priority: 'low' | 'normal' | 'high'
      read: boolean
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      user_id: string
      title: string
      body: string
      data?: unknown | null
      type: 'job_update' | 'bid_received' | 'meeting_scheduled' | 'payment_received' | 'message_received' | 'quote_sent' | 'system'
      priority?: 'low' | 'normal' | 'high'
      read?: boolean
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      user_id?: string
      title?: string
      body?: string
      data?: unknown | null
      type?: 'job_update' | 'bid_received' | 'meeting_scheduled' | 'payment_received' | 'message_received' | 'quote_sent' | 'system'
      priority?: 'low' | 'normal' | 'high'
      read?: boolean
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "notifications_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  user_push_tokens: {
    Row: {
      id: string
      user_id: string
      push_token: string
      platform: string
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      user_id: string
      push_token: string
      platform: string
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      user_id?: string
      push_token?: string
      platform?: string
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "user_push_tokens_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  user_notification_preferences: {
    Row: {
      id: string
      user_id: string
      preferences: unknown | null
      notification_settings: unknown | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      user_id: string
      preferences?: unknown | null
      notification_settings?: unknown | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      user_id?: string
      preferences?: unknown | null
      notification_settings?: unknown | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "user_notification_preferences_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: true
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  service_categories: {
    Row: {
      id: string
      name: string
      description: string | null
      icon_url: string | null
      is_active: boolean | null
      sort_order: number | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      name: string
      description?: string | null
      icon_url?: string | null
      is_active?: boolean | null
      sort_order?: number | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      description?: string | null
      icon_url?: string | null
      is_active?: boolean | null
      sort_order?: number | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  service_subcategories: {
    Row: {
      id: string
      category_id: string
      name: string
      description: string | null
      icon_url: string | null
      is_active: boolean | null
      sort_order: number | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      category_id: string
      name: string
      description?: string | null
      icon_url?: string | null
      is_active?: boolean | null
      sort_order?: number | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      category_id?: string
      name?: string
      description?: string | null
      icon_url?: string | null
      is_active?: boolean | null
      sort_order?: number | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "service_subcategories_category_id_fkey"
        columns: ["category_id"]
        isOneToOne: false
        referencedRelation: "service_categories"
        referencedColumns: ["id"]
      },
    ]
  }
}
