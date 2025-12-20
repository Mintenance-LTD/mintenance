/**
 * Job Management Types
 *
 * Type definitions for job-related entities including jobs, bids,
 * milestones, progress tracking, and job photos.
 *
 * @filesize Target: <400 lines
 * @compliance Architecture principles - Jobs domain separation
 */

import type {
  BaseTableStructure,
  TimestampFields,
  IdentifierFields,
  TimestampInsertFields,
  IdentifierInsertFields,
  MonetaryAmount,
  CommonStatus,
  PriorityLevel,
  DatabaseRelationship
} from '../core/database.core'

/**
 * Jobs Table
 * Main job posting and management entity
 */
export interface JobsRow extends TimestampFields, IdentifierFields {
  title: string
  description: string
  budget: number | null
  contractor_id: string | null
  homeowner_id: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  status: JobStatus
  priority: PriorityLevel | null
  estimated_duration: number | null // hours
  actual_duration: number | null // hours
  completion_date: string | null
  start_date: string | null
  job_category: string | null
  required_skills: string[] | null
  photos: string[] | null
  documents: string[] | null
}

export interface JobsInsert extends TimestampInsertFields, IdentifierInsertFields {
  title: string
  description: string
  budget?: number | null
  contractor_id?: string | null
  homeowner_id?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  status?: JobStatus
  priority?: PriorityLevel | null
  estimated_duration?: number | null
  actual_duration?: number | null
  completion_date?: string | null
  start_date?: string | null
  job_category?: string | null
  required_skills?: string[] | null
  photos?: string[] | null
  documents?: string[] | null
}

export interface JobsUpdate extends TimestampInsertFields, IdentifierInsertFields {
  title?: string
  description?: string
  budget?: number | null
  contractor_id?: string | null
  homeowner_id?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  status?: JobStatus
  priority?: PriorityLevel | null
  estimated_duration?: number | null
  actual_duration?: number | null
  completion_date?: string | null
  start_date?: string | null
  job_category?: string | null
  required_skills?: string[] | null
  photos?: string[] | null
  documents?: string[] | null
}

export type Jobs = BaseTableStructure<JobsRow, JobsInsert, JobsUpdate>

/**
 * Bids Table
 * Contractor bids on jobs
 */
export interface BidsRow extends TimestampFields, IdentifierFields {
  amount: number
  contractor_id: string | null
  description: string
  job_id: string | null
  status: BidStatus
  estimated_completion_time: number | null // hours
  warranty_period: number | null // days
  materials_cost: number | null
  labor_cost: number | null
  additional_notes: string | null
}

export interface BidsInsert extends TimestampInsertFields, IdentifierInsertFields {
  amount: number
  contractor_id?: string | null
  description: string
  job_id?: string | null
  status?: BidStatus
  estimated_completion_time?: number | null
  warranty_period?: number | null
  materials_cost?: number | null
  labor_cost?: number | null
  additional_notes?: string | null
}

export interface BidsUpdate extends TimestampInsertFields, IdentifierInsertFields {
  amount?: number
  contractor_id?: string | null
  description?: string
  job_id?: string | null
  status?: BidStatus
  estimated_completion_time?: number | null
  warranty_period?: number | null
  materials_cost?: number | null
  labor_cost?: number | null
  additional_notes?: string | null
}

export type Bids = BaseTableStructure<BidsRow, BidsInsert, BidsUpdate>

/**
 * Job Milestones Table
 * Project milestones and checkpoints
 */
export interface JobMilestonesRow extends TimestampFields, IdentifierFields {
  job_id: string
  title: string
  description: string | null
  target_date: string
  completion_date: string | null
  status: MilestoneStatus
  payment_percentage: number | null
  order_index: number
  is_required: boolean
}

export interface JobMilestonesInsert extends TimestampInsertFields, IdentifierInsertFields {
  job_id: string
  title: string
  description?: string | null
  target_date: string
  completion_date?: string | null
  status?: MilestoneStatus
  payment_percentage?: number | null
  order_index: number
  is_required?: boolean
}

export interface JobMilestonesUpdate extends TimestampInsertFields, IdentifierInsertFields {
  job_id?: string
  title?: string
  description?: string | null
  target_date?: string
  completion_date?: string | null
  status?: MilestoneStatus
  payment_percentage?: number | null
  order_index?: number
  is_required?: boolean
}

export type JobMilestones = BaseTableStructure<
  JobMilestonesRow,
  JobMilestonesInsert,
  JobMilestonesUpdate
>

/**
 * Job Progress Table
 * Daily progress tracking and updates
 */
export interface JobProgressRow extends TimestampFields, IdentifierFields {
  job_id: string
  progress_date: string
  percentage_complete: number
  description: string | null
  photos: string[] | null
  hours_worked: number | null
  materials_used: Record<string, unknown> | null
  contractor_notes: string | null
  next_steps: string | null
}

export interface JobProgressInsert extends TimestampInsertFields, IdentifierInsertFields {
  job_id: string
  progress_date: string
  percentage_complete: number
  description?: string | null
  photos?: string[] | null
  hours_worked?: number | null
  materials_used?: Record<string, unknown> | null
  contractor_notes?: string | null
  next_steps?: string | null
}

export interface JobProgressUpdate extends TimestampInsertFields, IdentifierInsertFields {
  job_id?: string
  progress_date?: string
  percentage_complete?: number
  description?: string | null
  photos?: string[] | null
  hours_worked?: number | null
  materials_used?: Record<string, unknown> | null
  contractor_notes?: string | null
  next_steps?: string | null
}

export type JobProgress = BaseTableStructure<
  JobProgressRow,
  JobProgressInsert,
  JobProgressUpdate
>

/**
 * Jobs Photos Table
 * Photo attachments for jobs
 */
export interface JobsPhotosRow extends TimestampFields, IdentifierFields {
  job_id: string | null
  photo_url: string
  caption: string | null
  photo_type: PhotoType
  uploaded_by: string | null
  file_size: number | null
  dimensions: Record<string, unknown> | null
}

export interface JobsPhotosInsert extends TimestampInsertFields, IdentifierInsertFields {
  job_id?: string | null
  photo_url: string
  caption?: string | null
  photo_type: PhotoType
  uploaded_by?: string | null
  file_size?: number | null
  dimensions?: Record<string, unknown> | null
}

export interface JobsPhotosUpdate extends TimestampInsertFields, IdentifierInsertFields {
  job_id?: string | null
  photo_url?: string
  caption?: string | null
  photo_type?: PhotoType
  uploaded_by?: string | null
  file_size?: number | null
  dimensions?: Record<string, unknown> | null
}

export type JobsPhotos = BaseTableStructure<
  JobsPhotosRow,
  JobsPhotosInsert,
  JobsPhotosUpdate
>

/**
 * Job-specific enums and types
 */
export type JobStatus =
  | 'posted'
  | 'bidding'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold'

export type BidStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled'

export type PhotoType =
  | 'before'
  | 'during'
  | 'after'
  | 'materials'
  | 'damage'
  | 'reference'

export type JobCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'carpentry'
  | 'painting'
  | 'landscaping'
  | 'cleaning'
  | 'general_maintenance'
  | 'emergency_repair'

/**
 * Job-related utility types
 */
export interface JobSearchFilters {
  status?: JobStatus[]
  category?: JobCategory[]
  budget_min?: number
  budget_max?: number
  priority?: PriorityLevel[]
  location_radius?: number
  required_skills?: string[]
  date_posted_after?: string
  date_posted_before?: string
}

export interface JobStatistics {
  total_jobs: number
  completed_jobs: number
  active_jobs: number
  average_completion_time: number
  success_rate: number
  average_budget: number
}

export interface BidComparison {
  bid_id: string
  contractor_name: string
  amount: number
  rating: number
  estimated_time: number
  response_time: number
  proposal_quality_score: number
}