import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export interface TaxProfile {
  legalName: string;
  tradingName: string | null;
  vatRegistered: boolean;
  vatNumber: string | null;
  companyNumber: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  hasUtr: boolean;
  hasNino: boolean;
  hasDateOfBirth: boolean;
  updatedAt: string | null;
}

export interface PaymentRecord {
  date: string;
  jobId: string;
  jobTitle: string;
  gross: number;
  platformFee: number;
  stripeFee: number;
  net: number;
}

export interface YearSummary {
  taxYear: string; // e.g. "2025-26"
  startYear: number;
  periodStart: string;
  periodEnd: string;
  grossEarnings: number;
  platformFees: number;
  stripeFees: number;
  netPaid: number;
  jobCount: number;
  payments: PaymentRecord[];
}

const gbpFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

/** Format a pounds amount as GBP currency (en-GB). */
export function formatGBP(amount: number): string {
  return gbpFormatter.format(amount);
}

export async function fetchTaxProfile(): Promise<TaxProfile | null> {
  const res = await fetch('/api/contractor/tax-info');
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch tax profile: ${res.status}`);
  }
  const data = await res.json();
  return (data.data ?? data.profile ?? data) as TaxProfile;
}

export async function fetchTaxSummaries(): Promise<YearSummary[]> {
  const res = await fetch('/api/contractor/tax-info/summaries');
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch tax summaries: ${res.status}`);
  }
  const data = await res.json();
  return (data.summaries ?? []) as YearSummary[];
}

/** Whether the contractor has provided the details HMRC reporting requires. */
export function isTaxDetailsComplete(
  profile: TaxProfile | null | undefined
): boolean {
  return Boolean(
    profile &&
    profile.legalName &&
    profile.hasDateOfBirth &&
    (profile.hasUtr || profile.hasNino)
  );
}

export function getTaxDetailsDisplay(profile: TaxProfile | null | undefined) {
  if (isTaxDetailsComplete(profile)) {
    return {
      icon: (
        <ShieldCheck className='w-6 h-6 text-green-600' aria-hidden='true' />
      ),
      label: 'Complete',
      description: 'Your tax details are complete and on file.',
      badgeClass: 'bg-green-100 text-green-800',
    };
  }
  return {
    icon: <ShieldAlert className='w-6 h-6 text-amber-600' aria-hidden='true' />,
    label: profile ? 'Incomplete' : 'Not Submitted',
    description: profile
      ? 'Some required tax details are missing. Please update your information.'
      : 'Please submit your tax details so we can provide end-of-year earnings statements.',
    badgeClass: 'bg-amber-100 text-amber-800',
  };
}
