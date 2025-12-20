/**
 * System and Service Management Tables
 * 
 * This module contains all database types related to system
 * configuration, service categories, and administrative functions.
 */

export type SystemTables = {
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
