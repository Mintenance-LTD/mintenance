// Type definitions for escrow data
export interface EscrowUpdateData {
  admin_hold_status: string;
  admin_approved_at?: string;
  admin_hold_reason?: string;
  admin_hold_at?: string;
  admin_hold_by: string;
  updated_at: string;
  status?: string;
  release_blocked_reason?: string | null;
}

export interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
}

export interface JobInfo {
  id: string;
  title: string;
  contractor_id: string;
  homeowner_id: string;
  contractor?: UserInfo;
  homeowner?: UserInfo;
}

export interface EscrowRecordFromQuery {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  admin_hold_status: string;
  admin_hold_reason: string | null;
  admin_hold_at: string | null;
  admin_hold_by: string | null;
  photo_verification_status: string | null;
  homeowner_approval: boolean;
  created_at: string;
  jobs: JobInfo;
}

export interface PhotoUrl {
  photo_url: string;
}

export interface ApprovalHistoryRecord {
  action: string;
  comments: string | null;
  created_at: string;
}

export interface EscrowReview {
  id: string;
  escrowId: string;
  jobId: string;
  jobTitle: string;
  contractorId: string;
  contractorName: string;
  homeownerId: string;
  homeownerName: string;
  amount: number;
  adminHoldStatus: 'pending_review' | 'admin_hold' | 'admin_approved';
  adminHoldReason: string | null;
  adminHoldAt: string | null;
  adminHoldBy: string | null;
  photoVerificationStatus: string | null;
  homeownerApproval: boolean;
  createdAt: string;
}

export interface EscrowReviewDetails extends EscrowReview {
  beforePhotos: string[];
  afterPhotos: string[];
  photoVerificationScore: number | null;
  beforeAfterComparisonScore: number | null;
  geolocationVerified: boolean;
  timestampVerified: boolean;
  photoQualityPassed: boolean;
  homeownerApprovalHistory: Array<{
    action: string;
    comments: string | null;
    createdAt: string;
  }>;
  trustScore: number | null;
  releaseBlockedReason: string | null;
  estimatedReleaseDate: string | null;
}
