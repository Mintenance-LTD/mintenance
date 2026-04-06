// Shared types for the admin tax dashboard

export type Form1099Status = 'pending' | 'generated' | 'filed';
export type W9Status = 'unverified' | 'submitted' | 'verified';

export interface TaxSummary {
  totalRequiring1099: number;
  totalGenerated: number;
  totalFiled: number;
  totalEarnings: number;
}

export interface ContractorTaxRow {
  contractorId: string;
  contractorName: string;
  email: string;
  tinLast4: string;
  totalEarnings: number;
  status: Form1099Status;
  w9Status: W9Status;
}

export interface UnverifiedW9Row {
  contractorId: string;
  contractorName: string;
  email: string;
  submittedAt: string | null;
  w9Status: W9Status;
}

export interface AdminTaxData {
  summaries: Array<{
    id: string;
    contractor_id: string;
    tax_year: number;
    total_earnings: number;
    requires_1099: boolean;
    form_1099_generated: boolean;
    form_1099_generated_at: string | null;
    form_1099_filed: boolean;
    form_1099_filed_at: string | null;
    contractor: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
    tax_profile: { w9_submitted_at: string | null; w9_verified: boolean } | null;
  }>;
  stats: TaxSummary;
}

export const CURRENT_YEAR = new Date().getFullYear();
export const AVAILABLE_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export const STATUS_OPTIONS: { value: 'all' | Form1099Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'generated', label: 'Generated' },
  { value: 'filed', label: 'Filed' },
];
