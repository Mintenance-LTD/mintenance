'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { logger } from '@mintenance/shared';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { JobService } from '@/lib/services/JobService';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn, scaleIn } from '@/lib/animations/variants';
import type { Job, User } from '@mintenance/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import toast from 'react-hot-toast';
import {
  MapPin, ChevronLeft, ShieldCheck, Lock, CreditCard,
  ArrowRight, CheckCircle2, AlertTriangle, Banknote, Receipt,
  Building2, Wallet,
} from 'lucide-react';

interface PaymentDetails {
  platformFee: number;
  stripeFee: number;
  totalAmount: number;
  contractorPayout: number;
}

function JobPaymentPageContent() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const jobData = await JobService.getJobById(jobId);
      if (!jobData) {
        setError('Job not found');
        return;
      }

      const isHomeowner = currentUser.role === 'homeowner';
      const typedJobData = jobData as Job;
      const isJobOwner =
        typedJobData.homeownerId === currentUser.id ||
        typedJobData.homeowner_id === currentUser.id;

      if (!isHomeowner || !isJobOwner) {
        setError('Only the job owner (homeowner) can make payments for this job');
        router.push(`/jobs/${jobId}`);
        return;
      }

      const normalized: Job = {
        id: typedJobData.id,
        title: typedJobData.title ?? '',
        description: typedJobData.description ?? '',
        location: typedJobData.location ?? '',
        homeowner_id: typedJobData.homeowner_id ?? typedJobData.homeownerId ?? '',
        contractor_id: typedJobData.contractor_id ?? typedJobData.contractorId ?? undefined,
        status: typedJobData.status ?? 'posted',
        budget: typedJobData.budget ?? 0,
        created_at: typedJobData.created_at ?? typedJobData.createdAt ?? new Date().toISOString(),
        updated_at: typedJobData.updated_at ?? typedJobData.updatedAt ?? new Date().toISOString(),
        category: typedJobData.category ?? undefined,
        priority: typedJobData.priority ?? undefined,
        photos: typedJobData.photos ?? [],
      };

      setJob(normalized);

      const contractRes = await fetch(`/api/contracts?job_id=${jobId}`);
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        const contract = contractData.contracts?.[0];
        if (!contract || contract.status !== 'accepted') {
          setError('Contract must be signed by both parties before making payment');
          return;
        }
      } else {
        setError('Unable to verify contract status. Please try again.');
        return;
      }

      const paymentDetailsResponse = await fetch(`/api/jobs/${jobId}/payment-details`);
      if (paymentDetailsResponse.ok) {
        const detailsData = await paymentDetailsResponse.json();
        setPaymentDetails({
          platformFee: detailsData.fees.platformFee,
          stripeFee: detailsData.fees.stripeFee,
          totalAmount: detailsData.fees.totalAmount,
          contractorPayout: detailsData.fees.contractorPayout,
        });
      } else {
        logger.error('Failed to fetch payment details from server');
        setError('Failed to calculate payment details');
        return;
      }
    } catch (err) {
      logger.error('Error loading job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    toast.success('Payment successful! Funds are now held securely in escrow.', {
      duration: 5000,
      position: 'top-center',
    });

    setTimeout(() => {
      router.push('/payments');
    }, 1500);
  };

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleCancel = () => {
    router.push(job ? `/jobs/${job.id}` : '/jobs');
  };

  if (!user) {
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading payment details..." />;
  }

  if (error || !job) {
    return (
      <ErrorView
        title={error || 'Job Not Found'}
        message="The job you're trying to pay for could not be found or you don't have permission to make payments for it."
        onRetry={() => { setError(null); loadJobDetails(); }}
        retryLabel="Try Again"
        variant="fullscreen"
      />
    );
  }

  if (!paymentDetails) {
    return (
      <HomeownerPageWrapper>
        <LoadingSpinner size="lg" />
      </HomeownerPageWrapper>
    );
  }

  const { platformFee, stripeFee, totalAmount, contractorPayout } = paymentDetails;
  const fmtGBP = (n: number) => `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <HomeownerPageWrapper>
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to job
        </button>

        {/* Page header */}
        <MotionDiv variants={fadeIn} initial="initial" animate="animate" className="mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <CreditCard size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Secure Payment</h1>
              <p className="text-gray-500 mt-0.5">Complete your escrow-protected payment for this job</p>
            </div>
          </div>
        </MotionDiv>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left column — Payment form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Job card */}
            <MotionDiv
              variants={scaleIn}
              initial="initial"
              animate="animate"
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <Receipt size={13} />
                  Job Details
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{job.title}</h3>
                    {job.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      {job.category && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-100">
                          <Building2 size={12} />
                          {job.category}
                        </span>
                      )}
                      {job.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={12} />
                          {typeof job.location === 'string' ? job.location : 'Not specified'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-1">Amount</div>
                    <div className="text-2xl font-bold text-teal-600">{fmtGBP(totalAmount)}</div>
                  </div>
                </div>
              </div>
            </MotionDiv>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Stripe payment form */}
            <MotionDiv
              variants={scaleIn}
              initial="initial"
              animate="animate"
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <Lock size={13} />
                    Payment Method
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <ShieldCheck size={13} />
                    SSL Encrypted
                  </div>
                </div>
              </div>
              <div className="p-6">
                <PaymentForm
                  jobId={job.id}
                  contractorId={job.contractor_id || ''}
                  jobTitle={job.title}
                  defaultAmount={totalAmount}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handleCancel}
                />
              </div>
            </MotionDiv>
          </div>

          {/* Right column — Summary sidebar */}
          <div className="space-y-6">

            {/* Payment breakdown */}
            <MotionDiv
              variants={scaleIn}
              initial="initial"
              animate="animate"
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6"
            >
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5">
                <div className="flex items-center gap-2 text-teal-100 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Wallet size={13} />
                  Payment Summary
                </div>
                <div className="text-3xl font-bold text-white">{fmtGBP(totalAmount)}</div>
                <div className="text-teal-100 text-sm mt-0.5">Total amount due</div>
              </div>

              <div className="p-6 space-y-4">
                {/* Fee breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Contractor receives</span>
                    <span className="font-semibold text-gray-900">{fmtGBP(contractorPayout)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Platform fee</span>
                    <span className="text-gray-600">{fmtGBP(platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Processing fee</span>
                    <span className="text-gray-600">{fmtGBP(stripeFee)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-teal-600">{fmtGBP(totalAmount)}</span>
                  </div>
                </div>

                {/* Escrow steps */}
                <div className="bg-gray-50 rounded-xl p-4 mt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    How Escrow Works
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: Banknote, label: 'You pay into escrow', desc: 'Funds held securely' },
                      { icon: Building2, label: 'Contractor completes work', desc: 'Verified with photos' },
                      { icon: CheckCircle2, label: 'You approve the work', desc: 'Release payment' },
                      { icon: ArrowRight, label: 'Contractor gets paid', desc: 'Automatic transfer' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                          <step.icon size={14} className="text-teal-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{step.label}</div>
                          <div className="text-xs text-gray-400">{step.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <ShieldCheck size={12} className="text-green-500" />
                    Escrow Protected
                  </div>
                  <div className="w-px h-3 bg-gray-200" />
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Lock size={12} className="text-green-500" />
                    256-bit SSL
                  </div>
                </div>
              </div>
            </MotionDiv>
          </div>
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}

export default function JobPaymentPage() {
  return (
    <ErrorBoundary componentName="JobPaymentPage">
      <JobPaymentPageContent />
    </ErrorBoundary>
  );
}
