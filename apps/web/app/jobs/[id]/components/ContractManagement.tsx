'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useCSRF } from '@/lib/hooks/useCSRF';
import {
  Shield, CheckCircle2, Circle, Clock, FileText, Building2,
  Scale, Send, PenTool, CalendarCheck, User, Briefcase,
  Calendar, PoundSterling, AlertCircle, RotateCcw, Trash2, Download, X,
} from 'lucide-react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────────

interface ContractorProfile {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  profile_image_url: string | null;
  insurance_expiry_date: string | null;
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

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const formatCurrency = (amount: number) =>
  `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusConfig = (status: string) => {
  const map: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
    draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: FileText },
    pending_contractor: { label: 'Awaiting Contractor', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
    pending_homeowner: { label: 'Awaiting Your Signature', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: PenTool },
    accepted: { label: 'Fully Signed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
    cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
  };
  return map[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: FileText };
};

const TERMS_HIDDEN_KEYS = ['insurance_provider', 'insurance_policy_number', 'source', 'bid_id', 'created_from'];

// ── Main Component ────────────────────────────────────────────────

export function ContractManagement(props: ContractManagementProps) {
  const { jobId = '', userRole = 'homeowner', userId = '' } = props || {};
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        throw new Error(errorData.error?.message || errorData.error || 'Failed to sign contract');
      }
      await fetchContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign contract');
    } finally {
      setIsSigning(false);
    }
  };

  const handleRejectContract = async () => {
    if (!contract || isRejecting) return;
    setIsRejecting(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to request changes');
      }
      setShowRejectForm(false);
      setRejectReason('');
      await fetchContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request changes');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!contract || isDeleting) return;
    if (!confirm('Are you sure you want to delete this contract? This cannot be undone.')) return;
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to delete contract');
      }
      await fetchContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!contract) return;
    const link = document.createElement('a');
    link.href = `/api/contracts/${contract.id}/pdf`;
    link.download = `Contract-${contract.id.slice(0, 8).toUpperCase()}.pdf`;
    link.click();
  };

  const canDelete = contract && userRole === 'contractor' && !contract.homeowner_signed_at
    && ['draft', 'pending_homeowner', 'pending_contractor'].includes(contract.status);

  const needsSignature = contract && (
    (userRole === 'contractor' && contract.status === 'pending_contractor') ||
    (userRole === 'homeowner' && contract.status === 'pending_homeowner')
  );
  const canSign = needsSignature && (
    (userRole === 'contractor' && !contract.contractor_signed_at) ||
    (userRole === 'homeowner' && !contract.homeowner_signed_at)
  );

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsModalOpen(false); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
          <Clock className="w-5 h-5 text-teal-500 animate-pulse" />
        </div>
        <p className="text-sm text-gray-400">Loading contract...</p>
      </div>
    );
  }

  // ── No Contract ──
  if (!contract) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-500 text-sm font-medium">
          {userRole === 'contractor'
            ? 'No contract created yet. Use "Prepare Contract" to create one.'
            : 'No contract available yet. The contractor will prepare one shortly.'}
        </p>
      </div>
    );
  }

  const isDraft = contract.status === 'draft';
  const statusConfig = getStatusConfig(contract.status);
  const StatusIcon = statusConfig.icon;

  const contractorName = contract.contractor?.company_name
    || (contract.contractor?.first_name && contract.contractor?.last_name
      ? `${contract.contractor.first_name} ${contract.contractor.last_name}` : null)
    || contract.contractor_company_name
    || 'Contractor';
  const homeownerName = contract.homeowner?.first_name && contract.homeowner?.last_name
    ? `${contract.homeowner.first_name} ${contract.homeowner.last_name}`
    : 'Homeowner';
  const logoUrl = contract.contractor?.profile_image_url;
  const hasInsurance = !!(contract.terms?.insurance_provider);
  const insuranceProvider = (contract.terms?.insurance_provider) as string | undefined;
  const insurancePolicyNumber = (contract.terms?.insurance_policy_number) as string | undefined;
  const visibleTerms = contract.terms
    ? Object.entries(contract.terms).filter(([key]) => !TERMS_HIDDEN_KEYS.includes(key))
    : [];

  // ── Contract Detail (used inside modal) ──
  const contractDetail = (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-white/20">
                <Image src={logoUrl} alt="Company logo" fill className="object-contain p-1" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
                <Building2 className="w-6 h-6 text-white/70" />
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-lg tracking-tight">Contract Agreement</h3>
              <p className="text-teal-100/70 text-xs mt-0.5">
                Ref: {contract.id.slice(0, 8).toUpperCase()} &middot; {formatDate(contract.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Actions Bar ── */}
        {!isDraft && (
          <div className="flex items-center gap-2 justify-end">
            <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200" type="button">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            {canDelete && (
              <button onClick={handleDeleteContract} disabled={isDeleting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 disabled:opacity-50" type="button">
                <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        )}

        {/* ── Draft Banner ── */}
        {isDraft && (
          <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              {userRole === 'homeowner'
                ? 'The contractor is preparing the contract details. You\'ll be notified when it\'s ready for review.'
                : 'This is a draft. Use "Prepare Contract" to fill in the details and send it to the homeowner.'}
            </p>
          </div>
        )}

        {/* ── Parties ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Parties</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5">Contractor</p>
              <p className="font-semibold text-gray-900 text-sm">{contractorName}</p>
              {contract.contractor_license_type && <p className="text-xs text-gray-500 mt-1">{contract.contractor_license_type}</p>}
              {contract.contractor_license_registration && <p className="text-xs text-gray-400">License: {contract.contractor_license_registration}</p>}
              {hasInsurance && (
                <div className="flex items-center gap-1 mt-2 bg-emerald-50 rounded-md px-2 py-1 w-fit">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] text-emerald-700 font-medium">Insured{insuranceProvider ? ` — ${insuranceProvider}` : ''}</span>
                </div>
              )}
              {insurancePolicyNumber && <p className="text-[10px] text-gray-400 mt-1">Policy: {insurancePolicyNumber}</p>}
            </div>
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5">Homeowner</p>
              <p className="font-semibold text-gray-900 text-sm">{homeownerName}</p>
            </div>
          </div>
        </div>

        {/* ── Scope of Work ── */}
        {(contract.title || contract.description) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Scope of Work</h4>
            </div>
            <div className="border border-gray-100 rounded-xl p-4">
              {contract.title && <p className="font-semibold text-gray-900 text-sm">{contract.title}</p>}
              {contract.description && <p className="text-sm text-gray-600 leading-relaxed mt-1.5 whitespace-pre-wrap">{contract.description}</p>}
            </div>
          </div>
        )}

        {/* ── Payment ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PoundSterling className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment</h4>
          </div>
          <div className="bg-gradient-to-r from-gray-50 to-teal-50/30 border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Contract Amount</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(contract.amount)}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-100 rounded-lg px-3 py-1.5">
                  <Scale className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-xs font-semibold text-teal-700">Escrow Protected</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Held securely by Mintenance</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Schedule ── */}
        {(contract.start_date || contract.end_date) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Schedule</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {contract.start_date && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Start Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(contract.start_date)}</p>
                </div>
              )}
              {contract.end_date && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Completion</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(contract.end_date)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Additional Terms ── */}
        {visibleTerms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Additional Terms</h4>
            </div>
            <div className="border border-gray-100 rounded-xl p-4 space-y-2">
              {visibleTerms.map(([key, value]) => (
                <div key={key} className="flex gap-3">
                  <span className="text-xs font-medium text-gray-400 min-w-[100px] capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-700 flex-1 whitespace-pre-wrap">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Signatures ── */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <PenTool className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Signatures</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Contractor', name: contractorName, signedAt: contract.contractor_signed_at },
              { label: 'Homeowner', name: homeownerName, signedAt: contract.homeowner_signed_at },
            ].map(({ label, name, signedAt }) => (
              <div key={label} className={`rounded-xl p-4 border ${signedAt ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                  {signedAt ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
                </div>
                <p className="text-sm font-medium text-gray-900">{name}</p>
                {signedAt ? <p className="text-xs text-emerald-600 mt-1">Signed {formatDateTime(signedAt)}</p> : <p className="text-xs text-gray-400 mt-1">Awaiting signature</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Timeline</h4>
          </div>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-gray-200" />
            <TimelineItem icon={FileText} color="gray" label="Contract Created" date={formatDateTime(contract.created_at)} />
            {contract.status !== 'draft' && <TimelineItem icon={Send} color="blue" label="Sent to Homeowner" date={formatDateTime(contract.updated_at)} />}
            {contract.contractor_signed_at && <TimelineItem icon={PenTool} color="green" label="Contractor Signed" date={formatDateTime(contract.contractor_signed_at)} />}
            {contract.homeowner_signed_at && <TimelineItem icon={PenTool} color="green" label="Homeowner Signed" date={formatDateTime(contract.homeowner_signed_at)} />}
            {contract.status === 'accepted' && <TimelineItem icon={CalendarCheck} color="teal" label="Contract Executed" date="Both parties signed" />}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Sign / Request Changes Buttons ── */}
        {canSign && !isDraft && (
          <div className="space-y-3">
            <button onClick={handleSignContract} disabled={isSigning || isRejecting} className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2" type="button">
              {isSigning ? (<><Icon name="loader" size={20} color="white" /> Signing...</>) : (<><PenTool className="w-5 h-5" /> Sign Contract</>)}
            </button>
            {userRole === 'homeowner' && contract.status === 'pending_homeowner' && (
              <>
                {!showRejectForm ? (
                  <button onClick={() => setShowRejectForm(true)} disabled={isSigning || isRejecting} className="w-full py-3 px-4 border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-600 hover:text-amber-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm" type="button">
                    <RotateCcw className="w-4 h-4" /> Request Changes
                  </button>
                ) : (
                  <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-amber-800">What changes would you like?</p>
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Describe the changes you'd like the contractor to make..." className="w-full border border-amber-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" rows={3} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700" type="button">Cancel</button>
                      <button onClick={handleRejectContract} disabled={isRejecting} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5" type="button">
                        {isRejecting ? (<><Icon name="loader" size={16} color="white" /> Sending...</>) : (<><RotateCcw className="w-3.5 h-3.5" /> Send Back to Contractor</>)}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Accepted ── */}
        {contract.status === 'accepted' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">Contract executed — both parties have signed.</p>
          </div>
        )}

        <p className="text-[10px] text-gray-300 text-center pt-4 border-t border-gray-50">
          Facilitated by Mintenance. Payments held in escrow. By signing, both parties agree to the above terms.
        </p>
      </div>
    </div>
  );

  // ── Compact Summary Card (inline on job page) ──
  return (
    <>
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-teal-200 hover:shadow-md transition-all"
        onClick={() => setIsModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); }}
      >
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-white/20">
                  <Image src={logoUrl} alt="Company logo" fill className="object-contain p-1" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
                  <Building2 className="w-5 h-5 text-white/70" />
                </div>
              )}
              <div>
                <h3 className="text-white font-bold text-base tracking-tight">Contract Agreement</h3>
                <p className="text-teal-100/70 text-xs">Ref: {contract.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(contract.amount)}</p>
              </div>
              {contract.title && (
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Scope</p>
                  <p className="text-sm text-gray-700 font-medium truncate max-w-[200px]">{contract.title}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {contract.contractor_signed_at
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <Circle className="w-5 h-5 text-gray-300" />
                }
                {contract.homeowner_signed_at
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <Circle className="w-5 h-5 text-gray-300" />
                }
              </div>
              <span className="text-xs text-gray-400">
                {contract.contractor_signed_at && contract.homeowner_signed_at ? 'Both signed' :
                  contract.contractor_signed_at || contract.homeowner_signed_at ? '1 of 2 signed' : 'Awaiting signatures'}
              </span>
            </div>
          </div>

          {canSign && !isDraft && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
              className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm"
              type="button"
            >
              <PenTool className="w-4 h-4" />
              Review & Sign Contract
            </button>
          )}

          {!canSign && !isDraft && (
            <p className="text-xs text-teal-600 font-medium mt-3 text-center">Click to view full contract details</p>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-2xl mx-4 my-8 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {contractDetail}
          </div>
        </div>
      )}
    </>
  );
}

// ── Timeline Item ──

function TimelineItem({ icon: IconComp, color, label, date }: {
  icon: typeof FileText;
  color: 'gray' | 'blue' | 'green' | 'teal';
  label: string;
  date: string;
}) {
  const colors = {
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-emerald-50 text-emerald-500',
    teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <div className="flex items-center gap-3 relative">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 -ml-6 ${colors[color]} ring-2 ring-white`}>
        <IconComp className="w-3 h-3" />
      </div>
      <div className="flex items-center justify-between flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400 ml-2">{date}</p>
      </div>
    </div>
  );
}
