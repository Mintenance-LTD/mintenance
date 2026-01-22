/**
 * Bid Module Types
 */

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'outdated';

export interface BidRecord {
    id: string;
    job_id: string;
    contractor_id: string;
    amount: number;
    proposal_text: string;
    estimated_duration: number;
    estimated_duration_unit: string;
    proposed_start_date?: string;
    status: BidStatus;
    rejection_reason?: string;
    materials_cost?: number;
    labor_cost?: number;
    availability?: string;
    score?: number;
    score_details?: any;
    created_at: string;
    updated_at: string;
}

export interface BidSummary extends BidRecord {
    job_title?: string;
    contractor_name?: string;
    contractor_rating?: number;
}

export interface BidDetail extends BidSummary {
    itemizedQuote?: any[];
    attachments?: any[];
    job?: any;
}

export interface SubmitBidData {
    jobId: string;
    bidAmount: number;
    proposalText: string;
    estimatedDuration: number;
    estimatedDurationUnit: 'hours' | 'days' | 'weeks' | 'months';
    proposedStartDate?: string;
    itemizedQuote?: any[];
    attachments?: string[];
    availability?: string;
    materialsCost?: number;
    laborCost?: number;
}

export interface BidListParams {
    jobId?: string;
    status?: string;
    limit: number;
    offset: number;
}
