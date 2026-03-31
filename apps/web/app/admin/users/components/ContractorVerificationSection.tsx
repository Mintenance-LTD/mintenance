'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from './VerificationBadge';

interface VerificationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

export interface VerificationData {
  passed: boolean;
  checks: VerificationCheck[];
  requiresManualReview: boolean;
  verificationScore: number;
  history: Array<{
    id: string;
    admin_id: string | null;
    action: string;
    reason: string | null;
    verification_score: number | null;
    created_at: string;
    checks_passed: Record<string, boolean> | null;
  }>;
  companyName?: string;
  licenseNumber?: string;
  businessAddress?: string;
  latitude?: number;
  longitude?: number;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  yearsExperience?: number;
  adminVerified: boolean;
}

interface ContractorVerificationSectionProps {
  verification: VerificationData;
  verifying: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onVerificationAction: (action: 'approve' | 'reject', reason: string) => void;
}

export function ContractorVerificationSection({
  verification,
  verifying,
  error,
  setError,
  onVerificationAction,
}: ContractorVerificationSectionProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!action) return;
    if (action === 'reject' && !reason.trim()) {
      setError('Reason is required when rejecting verification');
      return;
    }
    onVerificationAction(action, reason.trim());
    setAction(null);
    setReason('');
  };

  return (
    <div
      style={{
        borderTop: `1px solid ${theme.colors.border}`,
        paddingTop: theme.spacing[4],
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[4],
        }}
      >
        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            margin: 0,
          }}
        >
          Verification Status
        </h3>
        <VerificationBadge
          status={verification.adminVerified ? 'verified' : 'pending'}
          size='md'
        />
      </div>

      {/* Verification Score */}
      <div
        style={{
          marginBottom: theme.spacing[4],
          padding: theme.spacing[3],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing[2],
          }}
        >
          <span
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Verification Score
          </span>
          <span
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color:
                verification.verificationScore >= 90
                  ? theme.colors.success
                  : verification.verificationScore >= 70
                    ? '#F59E0B'
                    : '#EF4444',
            }}
          >
            {verification.verificationScore}/100
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: theme.colors.border,
            borderRadius: theme.borderRadius.full,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${verification.verificationScore}%`,
              height: '100%',
              backgroundColor:
                verification.verificationScore >= 90
                  ? theme.colors.success
                  : verification.verificationScore >= 70
                    ? '#F59E0B'
                    : '#EF4444',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Automated Checks */}
      <div style={{ marginBottom: theme.spacing[4] }}>
        <h4
          style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing[2],
            color: theme.colors.textPrimary,
          }}
        >
          Automated Checks
        </h4>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          {verification.checks.map((check, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                padding: theme.spacing[2],
                backgroundColor: check.passed ? '#D1FAE5' : '#FEE2E2',
                borderRadius: theme.borderRadius.md,
              }}
            >
              <Icon
                name={check.passed ? 'checkCircle' : 'xCircle'}
                size={16}
                color={check.passed ? theme.colors.success : '#EF4444'}
              />
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textPrimary,
                  flex: 1,
                }}
              >
                {check.name}
              </span>
              {check.message && (
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {check.message}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Verification Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
          fontSize: theme.typography.fontSize.sm,
        }}
      >
        {verification.companyName && (
          <div>
            <span style={{ color: theme.colors.textSecondary }}>Company:</span>
            <span
              style={{
                marginLeft: theme.spacing[2],
                color: theme.colors.textPrimary,
              }}
            >
              {verification.companyName}
            </span>
          </div>
        )}
        {verification.licenseNumber && (
          <div>
            <span style={{ color: theme.colors.textSecondary }}>License:</span>
            <span
              style={{
                marginLeft: theme.spacing[2],
                color: theme.colors.textPrimary,
              }}
            >
              {verification.licenseNumber}
            </span>
          </div>
        )}
        {verification.businessAddress && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: theme.colors.textSecondary }}>
              Business Address:
            </span>
            <div
              style={{
                marginTop: theme.spacing[1],
                color: theme.colors.textPrimary,
              }}
            >
              {verification.businessAddress}
              {verification.latitude && verification.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${verification.latitude},${verification.longitude}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{
                    marginLeft: theme.spacing[2],
                    color: theme.colors.primary,
                    textDecoration: 'underline',
                  }}
                >
                  View on Map
                </a>
              )}
            </div>
          </div>
        )}
        {verification.insuranceExpiryDate && (
          <div>
            <span style={{ color: theme.colors.textSecondary }}>
              Insurance Expires:
            </span>
            <span
              style={{
                marginLeft: theme.spacing[2],
                color: theme.colors.textPrimary,
              }}
            >
              {new Date(verification.insuranceExpiryDate).toLocaleDateString(
                'en-GB'
              )}
            </span>
          </div>
        )}
      </div>

      {/* Verification Actions */}
      {!verification.adminVerified && (
        <div
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: theme.spacing[4],
          }}
        >
          <h4
            style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[3],
              color: theme.colors.textPrimary,
            }}
          >
            Verification Actions
          </h4>
          {action === null ? (
            <div style={{ display: 'flex', gap: theme.spacing[3] }}>
              <Button
                variant='primary'
                onClick={() => setAction('approve')}
                style={{ flex: 1 }}
              >
                <Icon name='checkCircle' size={16} /> Approve
              </Button>
              <Button
                variant='destructive'
                onClick={() => setAction('reject')}
                style={{ flex: 1 }}
              >
                <Icon name='xCircle' size={16} /> Reject
              </Button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[3],
              }}
            >
              {action === 'reject' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[1],
                    }}
                  >
                    Rejection Reason (Required)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setReason(e.target.value)
                    }
                    placeholder='Enter reason for rejection...'
                    rows={3}
                    style={{
                      width: '100%',
                      padding: theme.spacing[2],
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.base,
                      fontFamily: theme.typography.fontFamily.regular,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.textPrimary,
                      resize: 'vertical',
                      minHeight: '80px',
                    }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: theme.spacing[3] }}>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setAction(null);
                    setReason('');
                    setError(null);
                  }}
                  disabled={verifying}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant={action === 'approve' ? 'primary' : 'destructive'}
                  onClick={handleSubmit}
                  disabled={
                    verifying || (action === 'reject' && !reason.trim())
                  }
                  style={{ flex: 1 }}
                >
                  {verifying
                    ? 'Processing...'
                    : action === 'approve'
                      ? 'Confirm Approval'
                      : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification History */}
      {verification.history && verification.history.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: theme.spacing[4],
          }}
        >
          <h4
            style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[3],
              color: theme.colors.textPrimary,
            }}
          >
            Verification History
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {verification.history.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: theme.spacing[2],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing[1],
                  }}
                >
                  <span
                    style={{
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      textTransform: 'capitalize',
                    }}
                  >
                    {entry.action.replace('_', ' ')}
                  </span>
                  <span style={{ color: theme.colors.textSecondary }}>
                    {new Date(entry.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                {entry.reason && (
                  <div
                    style={{
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing[1],
                    }}
                  >
                    Reason: {entry.reason}
                  </div>
                )}
                {entry.verification_score !== null && (
                  <div
                    style={{
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing[1],
                    }}
                  >
                    Score: {entry.verification_score}/100
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
