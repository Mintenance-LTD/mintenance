/**
 * Location and Service Area Tables
 * 
 * This module contains all database types related to locations,
 * service areas, and geographic functionality.
 */

export type LocationTables = {
  service_areas: {
    Row: {
      id: string
      name: string
      description: string | null
      city: string
      state: string
      country: string
      postal_code: string | null
      latitude: number
      longitude: number
      radius_km: number
      is_active: boolean | null
      created_at: string
      updated_at: string
      coverage_polygon: string | null
      population_density: number | null
      average_income: number | null
    }
    Insert: {
      id?: string
      name: string
      description?: string | null
      city: string
      state: string
      country: string
      postal_code?: string | null
      latitude: number
      longitude: number
      radius_km: number
      is_active?: boolean | null
      created_at?: string
      updated_at?: string
      coverage_polygon?: string | null
      population_density?: number | null
      average_income?: number | null
    }
    Update: {
      id?: string
      name?: string
      description?: string | null
      city?: string
      state?: string
      country?: string
      postal_code?: string | null
      latitude?: number
      longitude?: number
      radius_km?: number
      is_active?: boolean | null
      created_at?: string
      updated_at?: string
      coverage_polygon?: string | null
      population_density?: number | null
      average_income?: number | null
    }
    Relationships: []
  }
  service_area_coverage: {
    Row: {
      id: string
      service_area_id: string
      contractor_id: string
      coverage_type: 'full' | 'partial' | 'emergency'
      created_at: string
      updated_at: string
      is_primary: boolean | null
      coverage_radius_km: number | null
    }
    Insert: {
      id?: string
      service_area_id: string
      contractor_id: string
      coverage_type: 'full' | 'partial' | 'emergency'
      created_at?: string
      updated_at?: string
      is_primary?: boolean | null
      coverage_radius_km?: number | null
    }
    Update: {
      id?: string
      service_area_id?: string
      contractor_id?: string
      coverage_type?: 'full' | 'partial' | 'emergency'
      created_at?: string
      updated_at?: string
      is_primary?: boolean | null
      coverage_radius_km?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "service_area_coverage_service_area_id_fkey"
        columns: ["service_area_id"]
        isOneToOne: false
        referencedRelation: "service_areas"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "service_area_coverage_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  area_landmarks: {
    Row: {
      id: string
      service_area_id: string
      landmark_name: string
      landmark_type: string | null
      latitude: number
      longitude: number
      radius_meters: number | null
      notes: string | null
      created_at: string
    }
    Insert: {
      id?: string
      service_area_id: string
      landmark_name: string
      landmark_type?: string | null
      latitude: number
      longitude: number
      radius_meters?: number | null
      notes?: string | null
      created_at?: string
    }
    Update: {
      id?: string
      service_area_id?: string
      landmark_name?: string
      landmark_type?: string | null
      latitude?: number
      longitude?: number
      radius_meters?: number | null
      notes?: string | null
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "area_landmarks_service_area_id_fkey"
        columns: ["service_area_id"]
        isOneToOne: false
        referencedRelation: "service_areas"
        referencedColumns: ["id"]
      },
    ]
  }
  service_routes: {
    Row: {
      id: string
      contractor_id: string
      route_name: string
      description: string | null
      start_location: string
      end_location: string
      waypoints: string[] | null
      estimated_duration_minutes: number | null
      distance_km: number | null
      is_active: boolean | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      contractor_id: string
      route_name: string
      description?: string | null
      start_location: string
      end_location: string
      waypoints?: string[] | null
      estimated_duration_minutes?: number | null
      distance_km?: number | null
      is_active?: boolean | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      contractor_id?: string
      route_name?: string
      description?: string | null
      start_location?: string
      end_location?: string
      waypoints?: string[] | null
      estimated_duration_minutes?: number | null
      distance_km?: number | null
      is_active?: boolean | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "service_routes_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
}
