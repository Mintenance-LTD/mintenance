/**
 * Analytics and Performance Tables
 * 
 * This module contains all database types related to analytics,
 * performance tracking, and business intelligence.
 */

export type AnalyticsTables = {
  area_performance: {
    Row: {
      id: string
      service_area_id: string
      period_start: string
      period_end: string
      total_jobs: number | null
      total_revenue: number | null
      average_travel_distance: number | null
      total_travel_time_hours: number | null
      conversion_rate: number | null
      customer_satisfaction: number | null
      profitability_score: number | null
      created_at: string
    }
    Insert: {
      id?: string
      service_area_id: string
      period_start: string
      period_end: string
      total_jobs?: number | null
      total_revenue?: number | null
      average_travel_distance?: number | null
      total_travel_time_hours?: number | null
      conversion_rate?: number | null
      customer_satisfaction?: number | null
      profitability_score?: number | null
      created_at?: string
    }
    Update: {
      id?: string
      service_area_id?: string
      period_start?: string
      period_end?: string
      total_jobs?: number | null
      total_revenue?: number | null
      average_travel_distance?: number | null
      total_travel_time_hours?: number | null
      conversion_rate?: number | null
      customer_satisfaction?: number | null
      profitability_score?: number | null
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "area_performance_service_area_id_fkey"
        columns: ["service_area_id"]
        isOneToOne: false
        referencedRelation: "service_areas"
        referencedColumns: ["id"]
      },
    ]
  }
}
