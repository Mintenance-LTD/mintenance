'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, CheckCircle2, Upload, AlertTriangle, Shield, TrendingUp, Star } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import toast from 'react-hot-toast';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VerificationDoc {
  id: string;
  name: string;
  file_type: string;
  category: string;
  verification_type: string | null;
  review_status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  public_url: string | null;
  created_at: string;
}

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  verificationType: string; // maps to contractor_documents.verification_type
  required: boolean;
  status: 'not_started' | 'pending' | 'approved' | 'rejected';
  document?: VerificationDoc;
}

const STEPS_CONFIG: Omit<VerificationStep, 'status' | 'document'>[] = [
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Upload a government-issued ID (passport, driving licence)',
    verificationType: 'identity',
    required: true,
  },
  {
    id: 'business',
    title: 'Business Licence',
    description: 'Upload your business licence or registration',
    verificationType: 'business_licence',
    required: true,
  },
  {
    id: 'insurance',
    title: 'Insurance Certificate',
    description: 'Upload proof of liability insurance',
    verificationType: 'insurance',
    required: false,
  },
  {
    id: 'certifications',
    title: 'Professional Certifications',
    description: 'Upload any relevant trade certifications',
    verificationType: 'certification',
    required: false,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ContractorVerificationPage() {
  const { user } = useCurrentUser();
  const { getCsrfHeaders } = useCSRF();
  const [uploading, setUploading] = useState<string | null>(null);
  const [steps, setSteps] = useState<VerificationStep[]>(
    STEPS_CONFIG.map((s) => ({ ...s, status: 'not_started' }))
  );
  const [loading, setLoading] = useState(true);

  // Fetch real verification documents from the database
  const fetchVerificationDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/contractor/documents', {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const docs: VerificationDoc[] = data.documents || [];

      // Map docs to steps by verification_type
      setSteps(
        STEPS_CONFIG.map((cfg) => {
          const doc = docs.find(
            (d: VerificationDoc) => d.verification_type === cfg.verificationType
          );
          return {
            ...cfg,
            status: doc
              ? (doc.review_status as VerificationStep['status'])
              : 'not_started',
            document: doc || undefined,
          };
        })
      );
    } catch {
      // silently fail — page will show "not started" for all
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchVerificationDocs();
  }, [user, fetchVerificationDocs]);

  // Upload a verification document using the existing /api/contractor/documents endpoint
  const handleFileUpload = async (
    step: VerificationStep,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate file
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setUploading(step.id);
    const formData = new FormData();
    formData.append('file', file);
    // Use the matching category for the document type
    const categoryMap: Record<string, string> = {
      identity: 'certifications',
      business_licence: 'certifications',
      insurance: 'insurance',
      certification: 'certifications',
    };
    formData.append('category', categoryMap[step.verificationType] || 'other');
    formData.append('verification_type', step.verificationType);

    try {
      const res = await fetch('/api/contractor/documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: getCsrfHeaders(),
      });

      if (res.ok) {
        toast.success(
          'Document uploaded successfully! Review typically takes 1-2 business days.'
        );
        // Refresh the list to get real status
        await fetchVerificationDocs();
      } else {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        toast.error(err.error || 'Failed to upload document');
      }
    } catch {
      toast.error('Error uploading document. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  // Re-upload (replace) a rejected document
  const handleReUpload = (step: VerificationStep, files: FileList | null) => {
    handleFileUpload(step, files);
  };

  const approvedRequired = steps.filter(
    (s) => s.required && s.status === 'approved'
  ).length;
  const totalRequired = steps.filter((s) => s.required).length;
  const overallProgress = totalRequired > 0
    ? Math.round((approvedRequired / totalRequired) * 100)
    : 0;

  return (
    <ContractorPageWrapper>
      {/* Hero Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
            <Shield className="w-9 h-9 text-teal-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-1 text-gray-900">
              Verification Center
            </h1>
            <p className="text-gray-600 text-lg">
              Complete your profile verification to unlock full access
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-900 font-semibold">
              Verification Progress
            </span>
            <span className="text-gray-900 font-bold">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Benefits Banner */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Why Get Verified?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1 text-teal-600" />
              <div>
                <h3 className="font-bold mb-1 text-gray-900">Build Trust</h3>
                <p className="text-gray-600 text-sm">
                  Verified badge increases homeowner confidence
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-6 h-6 flex-shrink-0 mt-1 text-teal-600" />
              <div>
                <h3 className="font-bold mb-1 text-gray-900">
                  More Opportunities
                </h3>
                <p className="text-gray-600 text-sm">
                  Access to premium jobs and higher budgets
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 flex-shrink-0 mt-1 text-teal-600" />
              <div>
                <h3 className="font-bold mb-1 text-gray-900">
                  Priority Ranking
                </h3>
                <p className="text-gray-600 text-sm">
                  Appear higher in search results
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Steps */}
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <StatusIcon status={step.status} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        {step.title}
                        {step.required && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-semibold">
                            Required
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                    <StatusBadge status={step.status} />
                  </div>

                  {/* Not started — show upload button */}
                  {step.status === 'not_started' && (
                    <div className="mt-4">
                      <input
                        type="file"
                        id={`upload-${step.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleFileUpload(step, e.target.files)}
                        disabled={uploading === step.id}
                      />
                      <label
                        htmlFor={`upload-${step.id}`}
                        className={`inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 cursor-pointer transition-all ${uploading === step.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Upload className="w-5 h-5" />
                        {uploading === step.id
                          ? 'Uploading...'
                          : 'Upload Document'}
                      </label>
                    </div>
                  )}

                  {/* Pending review */}
                  {step.status === 'pending' && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-amber-800 text-sm flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> Your document is
                        under review. This typically takes 1-2 business days.
                      </p>
                    </div>
                  )}

                  {/* Approved */}
                  {step.status === 'approved' && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-emerald-800 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Document verified
                        successfully!
                      </p>
                    </div>
                  )}

                  {/* Rejected — show reason and re-upload */}
                  {step.status === 'rejected' && (
                    <div className="mt-4 space-y-3">
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                        <p className="text-rose-800 text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {step.document?.rejection_reason ||
                            'Document was rejected. Please re-upload.'}
                        </p>
                      </div>
                      <input
                        type="file"
                        id={`reupload-${step.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleReUpload(step, e.target.files)}
                        disabled={uploading === step.id}
                      />
                      <label
                        htmlFor={`reupload-${step.id}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 cursor-pointer transition-all"
                      >
                        <Upload className="w-5 h-5" />
                        Re-upload Document
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
          <p className="text-gray-600 mb-6">
            Having trouble with verification? Our support team is here to help.
          </p>
          <Link
            href="/contractor/support"
            className="px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all inline-block"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </ContractorPageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
    case 'pending':
      return (
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      );
    case 'rejected':
      return <AlertTriangle className="w-6 h-6 text-rose-600" />;
    default:
      return <AlertTriangle className="w-6 h-6 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    approved: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-600', label: 'Approved' },
    pending: { bg: 'bg-amber-100 text-amber-700 border-amber-600', label: 'Under Review' },
    rejected: { bg: 'bg-rose-100 text-rose-700 border-rose-600', label: 'Rejected' },
    not_started: { bg: 'bg-gray-100 text-gray-700 border-gray-600', label: 'Not Started' },
  };
  const c = config[status] || config.not_started;
  return (
    <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${c.bg}`}>
      {c.label}
    </span>
  );
}
