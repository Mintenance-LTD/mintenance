/**
 * Shared types for the EscrowReleaseAgent module.
 */

export interface AIAnalysisResult {
  completionIndicators: string[];
  matchesDescription: boolean;
  qualityScore: number;
  concerns: string[];
  recommendation: 'verified' | 'failed' | 'manual_review';
}

export interface PhotoVerificationResult {
  verificationScore: number; // 0-1
  matchesJobDescription: boolean;
  completionIndicators: string[];
  qualityScore: number; // 0-1
  status: 'verified' | 'failed' | 'manual_review';
  aiAnalysis?: AIAnalysisResult;
}

export interface AutoReleaseRule {
  id: string;
  contractorTier?: string;
  jobValueMin?: number;
  jobValueMax?: number;
  jobCategory?: string;
  holdPeriodDays: number;
  requirePhotoVerification: boolean;
  requireReview: boolean;
  minPhotoScore: number;
  riskMultiplier: number;
  disputeHistoryPenaltyDays: number;
  priority: number;
}

// Job info type for escrow queries
export interface EscrowJobInfo {
  id: string;
  status: string;
  contractor_id: string;
  homeowner_id: string;
}

export interface RiskPrediction {
  risk_type: string;
  severity: string;
  probability?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<{
        type: string;
        text?: string;
        image_url?: { url: string; detail: string };
      }>;
}
