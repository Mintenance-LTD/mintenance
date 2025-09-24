/**
 * Contractor Management Tables
 * 
 * This module contains all database types related to contractor
 * profiles, skills, and contractor-specific functionality.
 */

export type ContractorTables = {
  contractor_skills: {
    Row: {
      id: string
      contractor_id: string
      skill_name: string
      skill_category: string | null
      proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
      years_experience: number | null
      created_at: string
      updated_at: string
      is_verified: boolean | null
      verification_date: string | null
      portfolio_items: string[] | null
    }
    Insert: {
      id?: string
      contractor_id: string
      skill_name: string
      skill_category?: string | null
      proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
      years_experience?: number | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
      verification_date?: string | null
      portfolio_items?: string[] | null
    }
    Update: {
      id?: string
      contractor_id?: string
      skill_name?: string
      skill_category?: string | null
      proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
      years_experience?: number | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
      verification_date?: string | null
      portfolio_items?: string[] | null
    }
    Relationships: [
      {
        foreignKeyName: "contractor_skills_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  contractor_matches: {
    Row: {
      id: string
      homeowner_id: string
      contractor_id: string
      job_id: string | null
      match_score: number | null
      status: 'pending' | 'accepted' | 'rejected' | 'expired'
      created_at: string
      updated_at: string
      expires_at: string | null
      match_reason: string | null
      distance_km: number | null
    }
    Insert: {
      id?: string
      homeowner_id: string
      contractor_id: string
      job_id?: string | null
      match_score?: number | null
      status?: 'pending' | 'accepted' | 'rejected' | 'expired'
      created_at?: string
      updated_at?: string
      expires_at?: string | null
      match_reason?: string | null
      distance_km?: number | null
    }
    Update: {
      id?: string
      homeowner_id?: string
      contractor_id?: string
      job_id?: string | null
      match_score?: number | null
      status?: 'pending' | 'accepted' | 'rejected' | 'expired'
      created_at?: string
      updated_at?: string
      expires_at?: string | null
      match_reason?: string | null
      distance_km?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "contractor_matches_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_matches_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_matches_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
  contractor_payout_accounts: {
    Row: {
      id: string
      contractor_id: string
      account_type: 'bank_account' | 'paypal' | 'venmo' | 'zelle'
      account_holder_name: string
      account_number: string | null
      routing_number: string | null
      paypal_email: string | null
      venmo_username: string | null
      zelle_email: string | null
      is_primary: boolean | null
      is_verified: boolean | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      contractor_id: string
      account_type: 'bank_account' | 'paypal' | 'venmo' | 'zelle'
      account_holder_name: string
      account_number?: string | null
      routing_number?: string | null
      paypal_email?: string | null
      venmo_username?: string | null
      zelle_email?: string | null
      is_primary?: boolean | null
      is_verified?: boolean | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      contractor_id?: string
      account_type?: 'bank_account' | 'paypal' | 'venmo' | 'zelle'
      account_holder_name?: string
      account_number?: string | null
      routing_number?: string | null
      paypal_email?: string | null
      venmo_username?: string | null
      zelle_email?: string | null
      is_primary?: boolean | null
      is_verified?: boolean | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "contractor_payout_accounts_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  contractor_expertise_endorsements: {
    Row: {
      id: string
      contractor_id: string
      endorser_id: string
      skill_name: string
      endorsement_text: string | null
      rating: number | null
      created_at: string
      updated_at: string
      is_verified: boolean | null
    }
    Insert: {
      id?: string
      contractor_id: string
      endorser_id: string
      skill_name: string
      endorsement_text?: string | null
      rating?: number | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
    }
    Update: {
      id?: string
      contractor_id?: string
      endorser_id?: string
      skill_name?: string
      endorsement_text?: string | null
      rating?: number | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
    }
    Relationships: [
      {
        foreignKeyName: "contractor_expertise_endorsements_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_expertise_endorsements_endorser_id_fkey"
        columns: ["endorser_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
}
