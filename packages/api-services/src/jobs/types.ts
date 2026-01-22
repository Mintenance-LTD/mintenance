/**
 * Job-related Types and Interfaces
 */

export type JobStatus = 'draft' | 'posted' | 'in_progress' | 'completed' | 'cancelled' | 'deleted';

export interface JobRecord {
    id: string;
    title: string;
    description?: string;
    status: JobStatus;
    homeowner_id: string;
    contractor_id?: string;
    category?: string;
    budget?: number;
    budget_min?: number;
    budget_max?: number;
    show_budget_to_contractors?: boolean;
    require_itemized_bids?: boolean;
    location?: string;
    latitude?: number;
    longitude?: number;
    property_id?: string;
    required_skills?: string[];
    is_serious_buyer?: boolean;
    urgency?: string;
    ai_assessment_id?: string;
    created_at: string;
    updated_at: string;
    cancellation_reason?: string;
    // Relations
    homeowner?: any;
    contractor?: any;
    bids?: any[];
    bid_count?: number;
}

export interface JobSummary {
    id: string;
    title: string;
    status: JobStatus;
    created_at: string;
    [key: string]: any;
}

export interface JobDetail extends JobSummary {
    description?: string;
    homeowner?: any;
    contractor?: any;
}

export interface CreateJobData {
    title: string;
    description?: string;
    status?: JobStatus;
    category?: string;
    budget?: number;
    budget_min?: number;
    budget_max?: number;
    show_budget_to_contractors?: boolean;
    require_itemized_bids?: boolean;
    location?: string;
    photoUrls?: string[];
    requiredSkills?: string[];
    property_id?: string;
    latitude?: number;
    longitude?: number;
}

export interface ListJobsParams {
    limit?: number;
    cursor?: string;
    status?: JobStatus[];
    userId: string;
    userRole: string;
}
