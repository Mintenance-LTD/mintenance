/**
 * ContractView types + status helpers extracted from
 * ContractViewScreen so the screen file stays under the 500-line
 * MDC cap. These are pure data shapes / lookup tables — no behaviour.
 */
import { me } from '../../../design-system/mint-editorial';

export interface ContractParty {
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

export interface Contract {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: string;
  title: string | null;
  description: string | null;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  terms: Record<string, unknown>;
  created_at: string;
  contractorName: string;
  homeownerName: string;
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const formatContractDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// Status palette + labels for the header pill. Held here so the
// screen file doesn't carry the full lookup table inline.
const STATUS_COLORS: Record<string, string> = {
  accepted: me.brand,
  pending_contractor: me.accent,
  pending_homeowner: me.accent,
  rejected: me.errFg,
  cancelled: me.errFg,
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_contractor: 'Pending contractor signature',
  pending_homeowner: 'Pending homeowner signature',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const getStatusColor = (s: string): string =>
  STATUS_COLORS[s] ?? me.ink2;

export const getStatusLabel = (s: string): string => STATUS_LABELS[s] ?? s;

export const NON_SIGNABLE_STATUSES: readonly string[] = [
  'accepted',
  'rejected',
  'cancelled',
];
