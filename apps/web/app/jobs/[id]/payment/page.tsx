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
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn, scaleIn } from '@/lib/animations/variants';
import { BudgetDisplay } from '@/components/jobs/BudgetDisplay';
import { CategoryIcon } from '@/components/jobs/CategoryIcon';
import type { Job, User } from '@mintenance/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function JobPaymentPageContent() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [job, setJob] = useState<Job | null>(null);
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
      const canPayForJob =
        (jobData as any).homeownerId === currentUser.id ||
        (jobData as any).homeowner_id === currentUser.id ||
        (jobData as any).contractorId === currentUser.id ||
        (jobData as any).contractor_id === currentUser.id;

      if (!canPayForJob) {
        setError('You do not have permission to make payments for this job');
        return;
      }

      // Normalize to Job shape
      const normalized: Job = {
        id: (jobData as any).id,
        title: (jobData as any).title ?? '',
        description: (jobData as any).description ?? '',
        location: (jobData as any).location ?? '',
        homeowner_id: (jobData as any).homeowner_id ?? (jobData as any).homeownerId ?? '',
        contractor_id: (jobData as any).contractor_id ?? (jobData as any).contractorId ?? undefined,
        status: (jobData as any).status ?? 'posted',
        budget: (jobData as any).budget ?? 0,
        created_at: (jobData as any).created_at ?? (jobData as any).createdAt ?? new Date().toISOString(),
        updated_at: (jobData as any).updated_at ?? (jobData as any).updatedAt ?? new Date().toISOString(),
        category: (jobData as any).category ?? undefined,
        priority: (jobData as any).priority ?? undefined,
        photos: (jobData as any).photos ?? [],
      };

      setJob(normalized);
    } catch (err) {
      logger.error('Error loading job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    try {
      // Create escrow transaction
      if (job && user) {
        const contractorId = job.contractor_id || '';
        await PaymentService.createEscrowTransaction(
          job.id,
          user.id,
          contractorId,
          job.budget
        );
      }

      alert('Payment successful! Funds are now held securely in escrow.');
      router.push('/payments');
    } catch (error) {
      logger.error('Error creating escrow transaction:', error);
      alert('Payment processed but escrow creation failed. Please contact support.');
    }
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

  const platformFee = job.budget * 0.05;
  const totalAmount = job.budget + platformFee;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole={user.role}
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: (user as any).profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <div className="max-w-[1200px] mx-auto px-8 py-12">
            <UnifiedButton
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              ariaLabel="Go back"
              className="text-teal-100 hover:text-white hover:bg-white/10 mb-6"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Back
            </UnifiedButton>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Secure Payment</h1>
                <p className="text-teal-100 text-lg">Your payment is protected by escrow</p>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1200px] mx-auto px-8 py-8 w-full">
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
                ${job.budget?.toLocaleString() || '0'}
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
      </main>
    </div>
  );
}

export default function JobPaymentPage() {
  return (
    <ErrorBoundary componentName="JobPaymentPage">
      <JobPaymentPageContent />
    </ErrorBoundary>
  );
}