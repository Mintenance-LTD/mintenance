'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Shield, CheckCircle2, Circle, Clock, FileText, Building2, Scale } from 'lucide-react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────────

interface ContractorProfile {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  company_logo: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry_date: string | null;
  profile_image_url: string | null;
}

interface HomeownerProfile {
  first_name: string | null;
  last_name: string | null;
}

interface Contract {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: 'draft' | 'pending_contractor' | 'pending_homeowner' | 'accepted' | 'rejected' | 'cancelled';
  title: string | null;
  description: string | null;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  contractor_company_name: string | null;
  contractor_license_registration: string | null;
  contractor_license_type: string | null;
  terms: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  contractor: ContractorProfile | null;
  homeowner: HomeownerProfile | null;
}

interface ContractManagementProps {
  jobId: string;
  userRole: 'homeowner' | 'contractor';
  userId: string;
}

// ── Helpers ────────────────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

const formatCurrency = (amount: number) =>
  `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600' },
    pending_contractor: { label: 'Awaiting Contractor Signature', bg: 'bg-amber-50', text: 'text-amber-700' },
    pending_homeowner: { label: 'Awaiting Homeowner Signature', bg: 'bg-amber-50', text: 'text-amber-700' },
    accepted: { label: 'Fully Signed', bg: 'bg-green-50', text: 'text-green-700' },
    rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700' },
  };
  return map[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
};

// ── Sub-components ────────────────────────────────────────────────

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold">{number}</span>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
    </div>
  );
}

function SignatureRow({ label, signedAt, name }: { label: string; signedAt: string | null; name: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-dashed border-gray-200 last:border-0">
      <div className="flex items-center gap-3">
        {signedAt ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{name}</p>
        </div>
      </div>
      <div className="text-right">
        {signedAt ? (
          <div>
            <p className="text-xs font-medium text-green-700">Signed</p>
            <p className="text-xs text-gray-400">{formatDate(signedAt)}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Pending</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function ContractManagement(props: ContractManagementProps) {
  const { jobId = '', userRole = 'homeowner', userId = '' } = props || {};
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const { csrfToken } = useCSRF();

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts?job_id=${jobId}`);
      if (!response.ok) {
        if (response.status === 404) { setContract(null); setLoading(false); return; }
        throw new Error('Failed to fetch contract');
      }
      const data = await response.json();
      setContract(data.contracts?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const handleSignContract = async () => {
    if (!contract || isSigning) return;
    setIsSigning(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sign contract');
      }
      await fetchContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign contract');
    } finally {
      setIsSigning(false);
    }
  };

  // Only allow signing when contract is in the right state for this user
  const needsSignature = contract && (
    (userRole === 'contractor' && contract.status === 'pending_contractor') ||
    (userRole === 'homeowner' && contract.status === 'pending_homeowner')
  );
  const canSign = needsSignature && (
    (userRole === 'contractor' && !contract.contractor_signed_at) ||
    (userRole === 'homeowner' && !contract.homeowner_signed_at)
  );

  // ── Loading State ──
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
        <Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />
        Loading contract...
      </div>
    );
  }

  // ── No Contract ──
  if (!contract) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">
          {userRole === 'contractor'
            ? 'No contract created yet. Use the "Prepare Contract" button to create one.'
            : 'No contract available yet. The contractor will prepare one shortly.'}
        </p>
      </div>
    );
  }

  // ── Draft Banner ──
  const isDraft = contract.status === 'draft';

  // Derived data
  const badge = getStatusBadge(contract.status);
  const contractorName = contract.contractor?.company_name
    || (contract.contractor?.first_name && contract.contractor?.last_name
      ? `${contract.contractor.first_name} ${contract.contractor.last_name}` : null)
    || contract.contractor_company_name
    || 'Contractor';
  const homeownerName = contract.homeowner?.first_name && contract.homeowner?.last_name
    ? `${contract.homeowner.first_name} ${contract.homeowner.last_name}`
    : 'Homeowner';
  const logoUrl = contract.contractor?.company_logo || contract.contractor?.profile_image_url;
  const hasInsurance = !!(contract.contractor?.insurance_provider || contract.terms?.insurance_provider);
  const insuranceProvider = (contract.contractor?.insurance_provider || contract.terms?.insurance_provider) as string | undefined;
  const insurancePolicyNumber = (contract.contractor?.insurance_policy_number || contract.terms?.insurance_policy_number) as string | undefined;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* ── Document Header ── */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                <Image src={logoUrl} alt="Company logo" fill className="object-contain p-1" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-white/60" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold tracking-tight">CONTRACT AGREEMENT</h3>
              <p className="text-white/60 text-xs mt-0.5">
                Ref: {contract.id.slice(0, 8).toUpperCase()} &middot; {formatDate(contract.created_at)}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-1">
        {/* ── Draft Banner ── */}
        {isDraft && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700 font-medium">
              {userRole === 'homeowner'
                ? 'The contractor is preparing the contract details. You will be notified when it is ready for your review and signature.'
                : 'This is a draft contract. Use the "Prepare Contract" button above to fill in the details and send it to the homeowner.'}
            </p>
          </div>
        )}

        {/* ── Section 1: Parties ── */}
        <SectionHeading number={1} title="Parties" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contractor</p>
            <p className="font-semibold text-gray-900">{contractorName}</p>
            {contract.contractor_license_type && (
              <p className="text-xs text-gray-500 mt-1">
                {contract.contractor_license_type} Contractor
              </p>
            )}
            {contract.contractor_license_registration && (
              <p className="text-xs text-gray-500">
                License: {contract.contractor_license_registration}
              </p>
            )}
            {hasInsurance && (
              <div className="flex items-center gap-1 mt-2">
                <Shield className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  Insured{insuranceProvider ? ` — ${insuranceProvider}` : ''}
                </span>
              </div>
            )}
            {insurancePolicyNumber && (
              <p className="text-xs text-gray-400">Policy: {insurancePolicyNumber}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Homeowner</p>
            <p className="font-semibold text-gray-900">{homeownerName}</p>
          </div>
        </div>

        {/* ── Section 2: Scope of Work ── */}
        {(contract.title || contract.description) && (
          <>
            <SectionHeading number={2} title="Scope of Work" />
            {contract.title && (
              <p className="font-medium text-gray-900">{contract.title}</p>
            )}
            {contract.description && (
              <p className="text-sm text-gray-600 leading-relaxed mt-1 whitespace-pre-wrap">{contract.description}</p>
            )}
          </>
        )}

        {/* ── Section 3: Payment Terms ── */}
        <SectionHeading number={3} title="Payment Terms" />
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Contract Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(contract.amount)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-teal-700">
                <Scale className="w-4 h-4" />
                <span className="text-xs font-semibold">Escrow Protected</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Payment held securely by Mintenance</p>
            </div>
          </div>
        </div>

        {/* ── Section 4: Schedule ── */}
        {(contract.start_date || contract.end_date) && (
          <>
            <SectionHeading number={4} title="Schedule" />
            <div className="grid grid-cols-2 gap-4">
              {contract.start_date && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(contract.start_date)}</p>
                </div>
              )}
              {contract.end_date && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Completion Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(contract.end_date)}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Section 5: Additional Terms ── */}
        {contract.terms && Object.keys(contract.terms).filter(k => !['insurance_provider', 'insurance_policy_number', 'source', 'bid_id', 'created_from'].includes(k)).length > 0 && (
          <>
            <SectionHeading number={5} title="Additional Terms & Conditions" />
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {Object.entries(contract.terms)
                .filter(([key]) => !['insurance_provider', 'insurance_policy_number', 'source', 'bid_id', 'created_from'].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex gap-3">
                    <span className="text-xs font-medium text-gray-500 min-w-[120px] capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-xs text-gray-700 flex-1 whitespace-pre-wrap">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ── Signatures ── */}
        <div className="mt-6 pt-4 border-t-2 border-gray-200">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Signatures</h4>
          <div className="bg-gray-50 rounded-lg px-4">
            <SignatureRow
              label="Contractor"
              name={contractorName}
              signedAt={contract.contractor_signed_at}
            />
            <SignatureRow
              label="Homeowner"
              name={homeownerName}
              signedAt={contract.homeowner_signed_at}
            />
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4 flex items-center gap-2">
            <Icon name="xCircle" size={18} color={theme.colors.error} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Sign Button ── */}
        {canSign && !isDraft && (
          <button
            onClick={handleSignContract}
            disabled={isSigning}
            className="w-full mt-4 py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            type="button"
          >
            {isSigning ? (
              <>
                <Icon name="loader" size={20} color="white" />
                Signing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Sign Contract
              </>
            )}
          </button>
        )}

        {/* ── Accepted Banner ── */}
        {contract.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-700">Contract accepted — both parties have signed.</p>
          </div>
        )}

        {/* ── Legal Footer ── */}
        <p className="text-[10px] text-gray-400 text-center mt-6 pt-3 border-t border-gray-100">
          This contract is facilitated through the Mintenance platform. All payments are held in escrow and released upon homeowner approval of completed work.
          By signing, both parties agree to the terms outlined above.
        </p>
      </div>
    </div>
  );
}
