/**
 * Core Database Types
 *
 * Base types and interfaces shared across all database entities.
 * This file contains the foundational types for Supabase integration.
 *
 * @filesize Target: <300 lines
 * @compliance Architecture principles - Core types separation
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Supabase Database Schema Configuration
 * Internal configuration for Supabase client instantiation
 */
export interface SupabaseConfig {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
}

/**
 * Base table structure for all database entities
 * Generic types for Row, Insert, Update operations
 */
export interface BaseTableStructure<TRow, TInsert, TUpdate> {
  Row: TRow
  Insert: TInsert
  Update: TUpdate
  Relationships?: DatabaseRelationship[]
}

/**
 * Database relationship definition
 * Defines foreign key relationships between tables
 */
export interface DatabaseRelationship {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

/**
 * Common field types used across multiple tables
 */
export interface TimestampFields {
  created_at: string | null
  updated_at?: string | null
}

export interface IdentifierFields {
  id: string
}

/**
 * Optional timestamp fields for insert operations
 */
export interface TimestampInsertFields {
  created_at?: string | null
  updated_at?: string | null
}

/**
 * Optional identifier fields for insert operations
 */
export interface IdentifierInsertFields {
  id?: string
}

/**
 * Location-based fields used in multiple tables
 */
export interface LocationFields {
  latitude: number
  longitude: number
}

/**
 * Optional location fields for updates
 */
export interface LocationUpdateFields {
  latitude?: number
  longitude?: number
}

/**
 * Status field types commonly used
 */
export type CommonStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'cancelled'

/**
 * Priority levels used across various entities
 */
export type PriorityLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'

/**
 * Currency amount representation
 */
export interface MonetaryAmount {
  amount: number
  currency?: string // Default: USD
}

/**
 * Rating system used across multiple entities
 */
export interface RatingFields {
  rating: number // 1-5 scale
  rating_count?: number
  average_rating?: number
}

/**
 * File attachment structure
 */
export interface FileAttachment {
  filename: string
  file_path: string
  file_size?: number
  mime_type?: string
  uploaded_at: string
}

/**
 * Address information structure
 */
export interface AddressFields {
  street_address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

/**
 * Contact information structure
 */
export interface ContactFields {
  phone?: string
  email?: string
  website?: string
}

/**
 * Social media links structure
 */
export interface SocialMediaFields {
  facebook_url?: string
  instagram_url?: string
  twitter_url?: string
  linkedin_url?: string
}

/**
 * Business hours structure
 */
export interface BusinessHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

/**
 * Generic search and filter parameters
 */
export interface SearchParams {
  query?: string
  limit?: number
  offset?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Pagination response structure
 */
export interface PaginatedResponse<T> {
  data: T[]
  total_count: number
  has_more: boolean
  next_cursor?: string
}

/**
 * Error response structure
 */
export interface DatabaseError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * Audit trail fields for tracking changes
 */
export interface AuditFields {
  created_by?: string
  updated_by?: string
  deleted_at?: string | null
  deleted_by?: string
}

/**
 * Soft delete functionality
 */
export interface SoftDeleteFields {
  is_deleted: boolean
  deleted_at?: string | null
  deleted_by?: string
}

/**
 * Versioning fields for optimistic locking
 */
export interface VersionFields {
  version: number
  last_modified: string
}

/**
 * Geographic bounds for area-based queries
 */
export interface GeographicBounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Distance measurement structure
 */
export interface DistanceFields {
  distance_km?: number
  distance_miles?: number
  travel_time_minutes?: number
}

/**
 * Performance metrics structure
 */
export interface PerformanceMetrics {
  response_time_ms?: number
  success_rate?: number
  error_rate?: number
  throughput?: number
}