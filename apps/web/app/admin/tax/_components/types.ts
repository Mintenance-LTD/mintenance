// Shared types for the admin tax dashboard (UK earnings statements)

export type StatementStatus = 'pending' | 'generated' | 'filed';

export interface TaxStats {
  totalContractors: number;
  totalGenerated: number;
  totalFiled: number;
  totalIncompleteDetails: number;
  totalEarnings: number;
  totalNetPaid: number;
}

export interface ContractorTaxRow {
  contractorId: string;
  contractorName: string;
  email: string;
  taxYear: string; // e.g. "2025-26"
  startYear: number;
  grossEarnings: number;
  platformFees: number;
  stripeFees: number;
  netPaid: number;
  jobCount: number;
  statementGenerated: boolean;
  statementGeneratedAt: string | null;
  statementFiled: boolean;
  statementFiledAt: string | null;
  taxDetailsComplete: boolean;
}

export interface IncompleteTaxDetailsRow {
  contractorId: string;
  contractorName: string;
  email: string;
  taxDetailsComplete: boolean;
}

export interface AdminTaxData {
  summaries: ContractorTaxRow[];
  stats: TaxStats;
}

/** Derive the earnings-statement lifecycle status for a contractor row. */
export function statementStatus(row: {
  statementGenerated: boolean;
  statementFiled: boolean;
}): StatementStatus {
  if (row.statementFiled) return 'filed';
  if (row.statementGenerated) return 'generated';
  return 'pending';
}

/** UK tax-year START year for a date (the year begins 6 April). */
export function ukTaxStartYear(date: Date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const d = date.getDate();
  if (m < 3 || (m === 3 && d < 6)) return y - 1;
  return y;
}

/** Format a UK tax-year start year as its label, e.g. 2025 → "2025-26". */
export function formatTaxYearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export const CURRENT_YEAR = ukTaxStartYear();
export const AVAILABLE_YEARS = Array.from(
  { length: 5 },
  (_, i) => CURRENT_YEAR - i
);

export const STATUS_OPTIONS: {
  value: 'all' | StatementStatus;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'generated', label: 'Generated' },
  { value: 'filed', label: 'Filed' },
];
