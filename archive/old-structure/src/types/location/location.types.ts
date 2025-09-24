/**
 * Location and Service Area Types
 *
 * Type definitions for location-based entities including service areas,
 * landmarks, and geographic performance metrics.
 *
 * @filesize Target: <400 lines
 * @compliance Architecture principles - Location domain separation
 */

import type {
  BaseTableStructure,
  TimestampFields,
  IdentifierFields,
  TimestampInsertFields,
  IdentifierInsertFields,
  LocationFields,
  LocationUpdateFields,
  DatabaseRelationship
} from '../core/database.core'

/**
 * Area Landmarks Table
 * Geographic landmarks within service areas for navigation and reference
 */
export interface AreaLandmarksRow extends TimestampFields, IdentifierFields, LocationFields {
  landmark_name: string
  landmark_type: string | null
  notes: string | null
  radius_meters: number | null
  service_area_id: string
}

export interface AreaLandmarksInsert extends TimestampInsertFields, IdentifierInsertFields, LocationFields {
  landmark_name: string
  landmark_type?: string | null
  notes?: string | null
  radius_meters?: number | null
  service_area_id: string
}

export interface AreaLandmarksUpdate extends TimestampInsertFields, IdentifierInsertFields, LocationUpdateFields {
  landmark_name?: string
  landmark_type?: string | null
  notes?: string | null
  radius_meters?: number | null
  service_area_id?: string
}

export type AreaLandmarks = BaseTableStructure<
  AreaLandmarksRow,
  AreaLandmarksInsert,
  AreaLandmarksUpdate
>

/**
 * Area Performance Table
 * Performance metrics and analytics for service areas
 */
export interface AreaPerformanceRow extends TimestampFields, IdentifierFields {
  average_travel_distance: number | null
  conversion_rate: number | null
  customer_satisfaction: number | null
  period_end: string
  period_start: string
  profitability_score: number | null
  service_area_id: string
  total_jobs: number | null
  total_revenue: number | null
  total_travel_time_hours: number | null
}

export interface AreaPerformanceInsert extends TimestampInsertFields, IdentifierInsertFields {
  average_travel_distance?: number | null
  conversion_rate?: number | null
  customer_satisfaction?: number | null
  period_end: string
  period_start: string
  profitability_score?: number | null
  service_area_id: string
  total_jobs?: number | null
  total_revenue?: number | null
  total_travel_time_hours?: number | null
}

export interface AreaPerformanceUpdate extends TimestampInsertFields, IdentifierInsertFields {
  average_travel_distance?: number | null
  conversion_rate?: number | null
  customer_satisfaction?: number | null
  period_end?: string
  period_start?: string
  profitability_score?: number | null
  service_area_id?: string
  total_jobs?: number | null
  total_revenue?: number | null
  total_travel_time_hours?: number | null
}

export type AreaPerformance = BaseTableStructure<
  AreaPerformanceRow,
  AreaPerformanceInsert,
  AreaPerformanceUpdate
>

/**
 * Service Areas Table
 * Geographic service areas where contractors operate
 */
export interface ServiceAreasRow extends TimestampFields, IdentifierFields {
  area_name: string
  area_description: string | null
  center_latitude: number
  center_longitude: number
  radius_km: number
  contractor_id: string
  is_active: boolean
  priority_level: number | null
  max_travel_distance: number | null
  travel_cost_per_km: number | null
}

export interface ServiceAreasInsert extends TimestampInsertFields, IdentifierInsertFields {
  area_name: string
  area_description?: string | null
  center_latitude: number
  center_longitude: number
  radius_km: number
  contractor_id: string
  is_active?: boolean
  priority_level?: number | null
  max_travel_distance?: number | null
  travel_cost_per_km?: number | null
}

export interface ServiceAreasUpdate extends TimestampInsertFields, IdentifierInsertFields {
  area_name?: string
  area_description?: string | null
  center_latitude?: number
  center_longitude?: number
  radius_km?: number
  contractor_id?: string
  is_active?: boolean
  priority_level?: number | null
  max_travel_distance?: number | null
  travel_cost_per_km?: number | null
}

export type ServiceAreas = BaseTableStructure<
  ServiceAreasRow,
  ServiceAreasInsert,
  ServiceAreasUpdate
>

/**
 * Location-based relationships
 */
export const LocationRelationships: Record<string, DatabaseRelationship[]> = {
  area_landmarks: [
    {
      foreignKeyName: "area_landmarks_service_area_id_fkey",
      columns: ["service_area_id"],
      isOneToOne: false,
      referencedRelation: "service_areas",
      referencedColumns: ["id"]
    }
  ],
  area_performance: [
    {
      foreignKeyName: "area_performance_service_area_id_fkey",
      columns: ["service_area_id"],
      isOneToOne: false,
      referencedRelation: "service_areas",
      referencedColumns: ["id"]
    }
  ],
  service_areas: [
    {
      foreignKeyName: "service_areas_contractor_id_fkey",
      columns: ["contractor_id"],
      isOneToOne: false,
      referencedRelation: "users",
      referencedColumns: ["id"]
    }
  ]
}

/**
 * Location-specific enums and constants
 */
export type LandmarkType =
  | 'business'
  | 'residential'
  | 'landmark'
  | 'transportation'
  | 'emergency'
  | 'utility'

export type AreaPriorityLevel = 1 | 2 | 3 | 4 | 5

export interface LocationSearchParams {
  latitude: number
  longitude: number
  radius_km?: number
  landmark_types?: LandmarkType[]
  include_inactive?: boolean
}

export interface AreaMetrics {
  total_landmarks: number
  active_service_areas: number
  average_performance_score: number
  coverage_percentage: number
}

/**
 * Location utility types
 */
export interface CoordinateBounds {
  north_lat: number
  south_lat: number
  east_lng: number
  west_lng: number
}

export interface DistanceCalculation {
  from_lat: number
  from_lng: number
  to_lat: number
  to_lng: number
  distance_km: number
  estimated_travel_time: number
}

export interface LocationValidation {
  is_valid_coordinates: boolean
  is_within_service_area: boolean
  nearest_landmark?: AreaLandmarksRow
  service_area_coverage: ServiceAreasRow[]
}