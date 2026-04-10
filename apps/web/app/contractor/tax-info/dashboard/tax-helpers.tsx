import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

type W9Status = 'not_submitted' | 'submitted' | 'verified';
export type Form1099Status =
  | 'not_available'
  | 'pending'
  | 'generated'
  | 'filed';

export interface TaxProfile {
  legalName: string;
  businessName: string | null;
  taxClassification: string;
  tinLast4: string;
  w9Status: W9Status;
  w9SubmittedAt: string | null;
  w9VerifiedAt: string | null;
}

export interface YearSummary {
  year: number;
  totalEarnings: number;
  platformFees: number;
  netPayments: number;
  form1099Status: Form1099Status;
  form1099GeneratedAt: string | null;
}

export interface PaymentRecord {
  id: string;
  date: string;
  jobTitle: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  homeownerName: string;
}

export interface TaxDashboardData {
  profile: TaxProfile | null;
  summaries: YearSummary[];
  payments: Record<number, PaymentRecord[]>;
}

export async function fetchTaxProfile(): Promise<TaxProfile | null> {
  const res = await fetch('/api/contractor/tax-info');
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch tax profile: ${res.status}`);
  }
  const data = await res.json();
  return data.profile ?? data;
}

export async function fetchTaxSummaries(): Promise<{
  summaries: YearSummary[];
  payments: Record<number, PaymentRecord[]>;
}> {
  const res = await fetch('/api/contractor/tax-info/summaries');
  if (!res.ok) {
    if (res.status === 404) return { summaries: [], payments: {} };
    throw new Error(`Failed to fetch tax summaries: ${res.status}`);
  }
  return res.json();
}

export const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function getW9StatusDisplay(status: W9Status | undefined) {
  switch (status) {
    case 'verified':
      return {
        icon: (
          <ShieldCheck className='w-6 h-6 text-green-600' aria-hidden='true' />
        ),
        label: 'Verified',
        description: 'Your W-9 has been verified and is on file.',
        badgeClass: 'bg-green-100 text-green-800',
      };
    case 'submitted':
      return {
        icon: <Clock className='w-6 h-6 text-blue-600' aria-hidden='true' />,
        label: 'Under Review',
        description: 'Your W-9 has been submitted and is being reviewed.',
        badgeClass: 'bg-blue-100 text-blue-800',
      };
    default:
      return {
        icon: (
          <ShieldAlert className='w-6 h-6 text-amber-600' aria-hidden='true' />
        ),
        label: 'Not Submitted',
        description: 'Please submit your W-9 form for tax reporting.',
        badgeClass: 'bg-amber-100 text-amber-800',
      };
  }
}

export function get1099StatusBadge(status: Form1099Status) {
  switch (status) {
    case 'filed':
      return (
        <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
          <CheckCircle className='w-3 h-3' aria-hidden='true' />
          Filed
        </span>
      );
    case 'generated':
      return (
        <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
          <FileText className='w-3 h-3' aria-hidden='true' />
          Available
        </span>
      );
    case 'pending':
      return (
        <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'>
          <Clock className='w-3 h-3' aria-hidden='true' />
          Pending
        </span>
      );
    default:
      return (
        <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600'>
          <AlertTriangle className='w-3 h-3' aria-hidden='true' />
          Not Available
        </span>
      );
  }
}
