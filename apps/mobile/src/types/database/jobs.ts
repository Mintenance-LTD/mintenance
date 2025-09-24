/**
 * Job Management Tables
 * 
 * This module contains all database types related to job creation,
 * management, and tracking.
 */

export type JobTables = {
  jobs: {
    Row: {
      id: string
      title: string
      description: string
      location: string
      homeowner_id: string
      contractor_id: string | null
      status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
      budget: number
      created_at: string
      updated_at: string
      category: string | null
      subcategory: string | null
      priority: 'low' | 'medium' | 'high' | 'urgent' | null
      estimated_duration_hours: number | null
      actual_duration_hours: number | null
      scheduled_start_date: string | null
      scheduled_end_date: string | null
      actual_start_date: string | null
      actual_end_date: string | null
      latitude: number | null
      longitude: number | null
      address_line_1: string | null
      address_line_2: string | null
      city: string | null
      state: string | null
      postal_code: string | null
      country: string | null
      special_instructions: string | null
      materials_provided: boolean | null
      materials_cost: number | null
      labor_cost: number | null
      total_cost: number | null
      payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | null
      completion_notes: string | null
      homeowner_rating: number | null
      homeowner_review: string | null
      contractor_rating: number | null
      contractor_review: string | null
    }
    Insert: {
      id?: string
      title: string
      description: string
      location: string
      homeowner_id: string
      contractor_id?: string | null
      status?: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
      budget: number
      created_at?: string
      updated_at?: string
      category?: string | null
      subcategory?: string | null
      priority?: 'low' | 'medium' | 'high' | 'urgent' | null
      estimated_duration_hours?: number | null
      actual_duration_hours?: number | null
      scheduled_start_date?: string | null
      scheduled_end_date?: string | null
      actual_start_date?: string | null
      actual_end_date?: string | null
      latitude?: number | null
      longitude?: number | null
      address_line_1?: string | null
      address_line_2?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string | null
      special_instructions?: string | null
      materials_provided?: boolean | null
      materials_cost?: number | null
      labor_cost?: number | null
      total_cost?: number | null
      payment_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | null
      completion_notes?: string | null
      homeowner_rating?: number | null
      homeowner_review?: string | null
      contractor_rating?: number | null
      contractor_review?: string | null
    }
    Update: {
      id?: string
      title?: string
      description?: string
      location?: string
      homeowner_id?: string
      contractor_id?: string | null
      status?: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
      budget?: number
      created_at?: string
      updated_at?: string
      category?: string | null
      subcategory?: string | null
      priority?: 'low' | 'medium' | 'high' | 'urgent' | null
      estimated_duration_hours?: number | null
      actual_duration_hours?: number | null
      scheduled_start_date?: string | null
      scheduled_end_date?: string | null
      actual_start_date?: string | null
      actual_end_date?: string | null
      latitude?: number | null
      longitude?: number | null
      address_line_1?: string | null
      address_line_2?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string | null
      special_instructions?: string | null
      materials_provided?: boolean | null
      materials_cost?: number | null
      labor_cost?: number | null
      total_cost?: number | null
      payment_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | null
      completion_notes?: string | null
      homeowner_rating?: number | null
      homeowner_review?: string | null
      contractor_rating?: number | null
      contractor_review?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "jobs_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "jobs_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  jobs_photos: {
    Row: {
      id: string
      job_id: string
      photo_url: string
      caption: string | null
      created_at: string
      updated_at: string
      is_primary: boolean | null
      order_index: number | null
    }
    Insert: {
      id?: string
      job_id: string
      photo_url: string
      caption?: string | null
      created_at?: string
      updated_at?: string
      is_primary?: boolean | null
      order_index?: number | null
    }
    Update: {
      id?: string
      job_id?: string
      photo_url?: string
      caption?: string | null
      created_at?: string
      updated_at?: string
      is_primary?: boolean | null
      order_index?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "jobs_photos_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
  job_milestones: {
    Row: {
      id: string
      job_id: string
      title: string
      description: string | null
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      due_date: string | null
      completed_date: string | null
      created_at: string
      updated_at: string
      order_index: number | null
    }
    Insert: {
      id?: string
      job_id: string
      title: string
      description?: string | null
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      due_date?: string | null
      completed_date?: string | null
      created_at?: string
      updated_at?: string
      order_index?: number | null
    }
    Update: {
      id?: string
      job_id?: string
      title?: string
      description?: string | null
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      due_date?: string | null
      completed_date?: string | null
      created_at?: string
      updated_at?: string
      order_index?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "job_milestones_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
  job_progress: {
    Row: {
      id: string
      job_id: string
      progress_percentage: number
      notes: string | null
      photos: string[] | null
      created_at: string
      updated_at: string
      updated_by: string
    }
    Insert: {
      id?: string
      job_id: string
      progress_percentage: number
      notes?: string | null
      photos?: string[] | null
      created_at?: string
      updated_at?: string
      updated_by: string
    }
    Update: {
      id?: string
      job_id?: string
      progress_percentage?: number
      notes?: string | null
      photos?: string[] | null
      created_at?: string
      updated_at?: string
      updated_by?: string
    }
    Relationships: [
      {
        foreignKeyName: "job_progress_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "job_progress_updated_by_fkey"
        columns: ["updated_by"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  bids: {
    Row: {
      id: string
      job_id: string
      contractor_id: string
      amount: number
      description: string | null
      status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
      created_at: string
      updated_at: string
      estimated_duration_hours: number | null
      materials_included: boolean | null
      materials_cost: number | null
      labor_cost: number | null
      notes: string | null
      valid_until: string | null
    }
    Insert: {
      id?: string
      job_id: string
      contractor_id: string
      amount: number
      description?: string | null
      status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
      created_at?: string
      updated_at?: string
      estimated_duration_hours?: number | null
      materials_included?: boolean | null
      materials_cost?: number | null
      labor_cost?: number | null
      notes?: string | null
      valid_until?: string | null
    }
    Update: {
      id?: string
      job_id?: string
      contractor_id?: string
      amount?: number
      description?: string | null
      status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
      created_at?: string
      updated_at?: string
      estimated_duration_hours?: number | null
      materials_included?: boolean | null
      materials_cost?: number | null
      labor_cost?: number | null
      notes?: string | null
      valid_until?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "bids_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "bids_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
}
