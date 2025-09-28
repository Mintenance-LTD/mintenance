'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { JobService } from '@/lib/services/JobService';
import { PaymentService } from '@/lib/services/PaymentService';
import type { Job, User } from '@mintenance/types';

export default function JobPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [user, setUser] = useState<User | null>(null);
  const [job, setJob] = useState<Job | null>(null);
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
      console.error('Error loading job details:', err);
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
      console.error('Error creating escrow transaction:', error);
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
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md
          }}>
            Access Denied
          </h1>
          <p style={{
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.lg
          }}>
            You must be logged in to make payments.
          </p>
          <Button
            onClick={() => router.push('/login')}
            variant="primary"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary
          }}>
            Loading job details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.backgroundSecondary,
        padding: theme.spacing.lg
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.sm
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['4xl'],
              marginBottom: theme.spacing.lg
            }}>
              ❌
            </div>
            <h1 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.error,
              marginBottom: theme.spacing.md
            }}>
              {error || 'Job Not Found'}
            </h1>
            <p style={{
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.lg
            }}>
              The job you&apos;re trying to pay for could not be found or you don&apos;t have permission to make payments for it.
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'center' }}>
              <Button
                onClick={() => router.push('/jobs')}
                variant="primary"
              >
                Back to Jobs
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.lg
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <Button
              onClick={() => router.push('/jobs')}
              variant="ghost"
              size="sm"
              style={{ marginRight: theme.spacing.md }}
            >
              ← Back to Jobs
            </Button>
          </div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: '4px'
          }}>
            💳 Secure Payment
          </h1>
          <p style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
            margin: 0
          }}>
            Pay for your job with escrow protection
          </p>
        </div>

        {/* Job Summary */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm
        }}>
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
        </div>

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
          contractorId={job.contractorId || ''}
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
  );
}