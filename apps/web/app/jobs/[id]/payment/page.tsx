'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { UnifiedButton, LoadingSpinner, ErrorView } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { JobService } from '@/lib/services/JobService';
import { PaymentService } from '@/lib/services/PaymentService';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn, scaleIn } from '@/lib/animations/variants';
import { BudgetDisplay } from '@/components/jobs/BudgetDisplay';
import { CategoryIcon } from '@/components/jobs/CategoryIcon';
import type { Job, User } from '@mintenance/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import toast from 'react-hot-toast';

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
  const [paymentStep, setPaymentStep] = useState<'summary' | 'payment' | 'confirmation'>('summary');

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

      // Get job details
      const jobData = await JobService.getJobById(jobId);
      if (!jobData) {
        setError('Job not found');
        return;
      }

      // Verify user has permission to pay for this job
      // Only homeowners can make payments
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

      // Normalize to Job shape
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

      // SECURITY: Fetch payment details from server (fees calculated server-side)
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
    // Escrow transaction is already created server-side by the create-intent/checkout-session API.
    // No need to create it again client-side (that causes duplicate records).
    toast.success('Payment successful! Funds are now held securely in escrow.', {
      duration: 5000,
      position: 'top-center',
    });

    setTimeout(() => {
      router.push('/payments');
    }, 1500);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  const handleCancel = () => {
    router.push(job ? `/jobs/${job.id}` : '/jobs');
  };

  if (!user) {
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading job details..." />;
  }

  if (error || !job) {
    return (
      <ErrorView
        title={error || 'Job Not Found'}
        message="The job you're trying to pay for could not be found or you don't have permission to make payments for it."
        onRetry={() => loadJobDetails()}
        retryLabel="Try Again"
        variant="fullscreen"
      />
    );
  }

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // SECURITY: Use server-calculated fees (prevents client-side manipulation)
  if (!paymentDetails) {
    return (
      <HomeownerPageWrapper>
        <LoadingSpinner size="lg" />
      </HomeownerPageWrapper>
    );
  }

  const platformFee = paymentDetails.platformFee;
  const totalAmount = paymentDetails.totalAmount;

  return (
    <HomeownerPageWrapper>
      {/* Hero Header */}
      <MotionDiv
        className="bg-white border border-gray-200 rounded-xl p-8 mb-6"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="max-w-full">
          <UnifiedButton
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            ariaLabel="Go back"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 mb-6"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            Back
          </UnifiedButton>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-200">
              <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Secure Payment</h1>
              <p className="text-gray-600 text-lg">Your payment is protected by escrow</p>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="w-full space-y-6">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Payment Form */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Job Summary Card */}
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={scaleIn}
                initial="initial"
                animate="animate"
              >
                <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: theme.spacing.md
          }}>
            Job Summary
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: theme.spacing.lg,
            alignItems: 'start'
          }}>
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0,
                marginBottom: theme.spacing.xs
              }}>
                {job.title}
              </h3>
              {job.description && (
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  margin: 0,
                  marginBottom: theme.spacing.sm,
                  lineHeight: theme.typography.lineHeight.relaxed
                }}>
                  {job.description}
                </p>
              )}
              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginBottom: '2px'
                  }}>
                    Category
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.text,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {job.category || 'General Maintenance'}
                  </div>
                </div>
                {job.location && (
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      marginBottom: '2px'
                    }}>
                      Location
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.text,
                      fontWeight: theme.typography.fontWeight.medium
                    }}>
                      📍 {job.location}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: '2px'
              }}>
                Job Budget
              </div>
              <div style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.success
              }}>
                £{job.budget?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
              </MotionDiv>

              {/* Error Display */}
              {error && (
                <div style={{
                  backgroundColor: `${theme.colors.error}10`,
                  border: `1px solid ${theme.colors.error}`,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                  textAlign: 'center'
                }}>
                  <div style={{
                    color: theme.colors.error,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    ⚠️ {error}
                  </div>
                </div>
              )}

              {/* Payment Form */}
              <PaymentForm
                jobId={job.id}
                contractorId={job.contractor_id || ''}
                jobTitle={job.title}
                defaultAmount={job.budget || 0}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handleCancel}
              />

              {/* Terms and Conditions */}
              <div style={{
                marginTop: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: `${theme.colors.info}10`,
                border: `1px solid ${theme.colors.info}`,
                borderRadius: theme.borderRadius.md
              }}>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.info,
                  fontWeight: theme.typography.fontWeight.medium,
                  marginBottom: '8px'
                }}>
                  ℹ️ Payment Terms & Escrow Protection
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  lineHeight: theme.typography.lineHeight.relaxed
                }}>
                  • Your payment will be securely held in escrow until the job is completed
                  <br />
                  • Funds are only released when you approve the completed work
                  <br />
                  • You can request a full refund if the work is not satisfactory
                  <br />
                  • All payments are processed securely through Stripe
                  <br />
                  • Platform and processing fees are clearly displayed before payment
                </div>
            </div>
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