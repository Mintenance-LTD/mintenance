/**
 * Authentication and User Management Tables
 * 
 * This module contains all database types related to user authentication,
 * profiles, and user management.
 */

export type AuthTables = {
  users: {
    Row: {
      id: string
      email: string
      first_name: string
      last_name: string
      role: 'homeowner' | 'contractor'
      created_at: string
      updated_at: string
      phone: string | null
      address: string | null
      latitude: number | null
      longitude: number | null
      profile_image_url: string | null
      bio: string | null
      rating: number | null
      total_jobs_completed: number | null
      is_available: boolean | null
      is_verified: boolean | null
      company_name: string | null
      company_logo: string | null
      business_address: string | null
      license_number: string | null
      years_experience: number | null
      hourly_rate: number | null
      service_radius: number | null
      availability: 'immediate' | 'this_week' | 'this_month' | 'busy' | null
      insurance_provider: string | null
      insurance_policy_number: string | null
      insurance_expiry_date: string | null
    }
    Insert: {
      id: string
      email: string
      first_name: string
      last_name: string
      role: 'homeowner' | 'contractor'
      created_at?: string
      updated_at?: string
      phone?: string | null
      address?: string | null
      latitude?: number | null
      longitude?: number | null
      profile_image_url?: string | null
      bio?: string | null
      rating?: number | null
      total_jobs_completed?: number | null
      is_available?: boolean | null
      is_verified?: boolean | null
      company_name?: string | null
      company_logo?: string | null
      business_address?: string | null
      license_number?: string | null
      years_experience?: number | null
      hourly_rate?: number | null
      service_radius?: number | null
      availability?: 'immediate' | 'this_week' | 'this_month' | 'busy' | null
      insurance_provider?: string | null
      insurance_policy_number?: string | null
      insurance_expiry_date?: string | null
    }
    Update: {
      id?: string
      email?: string
      first_name?: string
      last_name?: string
      role?: 'homeowner' | 'contractor'
      created_at?: string
      updated_at?: string
      phone?: string | null
      address?: string | null
      latitude?: number | null
      longitude?: number | null
      profile_image_url?: string | null
      bio?: string | null
      rating?: number | null
      total_jobs_completed?: number | null
      is_available?: boolean | null
      is_verified?: boolean | null
      company_name?: string | null
      company_logo?: string | null
      business_address?: string | null
      license_number?: string | null
      years_experience?: number | null
      hourly_rate?: number | null
      service_radius?: number | null
      availability?: 'immediate' | 'this_week' | 'this_month' | 'busy' | null
      insurance_provider?: string | null
      insurance_policy_number?: string | null
      insurance_expiry_date?: string | null
    }
    Relationships: []
  }
  profiles: {
    Row: {
      id: string
      user_id: string
      display_name: string | null
      avatar_url: string | null
      bio: string | null
      website: string | null
      location: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      user_id: string
      display_name?: string | null
      avatar_url?: string | null
      bio?: string | null
      website?: string | null
      location?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      user_id?: string
      display_name?: string | null
      avatar_url?: string | null
      bio?: string | null
      website?: string | null
      location?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "profiles_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: true
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
}
