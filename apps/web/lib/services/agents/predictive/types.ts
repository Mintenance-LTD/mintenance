// Shared types for PredictiveAgent helper modules

export interface JobForRisk {
  id: string;
  status: string;
  contractor_id?: string | null;
  homeowner_id: string;
  scheduled_start_date?: string;
  budget?: number;
  category?: string;
  created_at?: string;
}

export type RiskType = 'no-show' | 'dispute' | 'delay' | 'quality';
