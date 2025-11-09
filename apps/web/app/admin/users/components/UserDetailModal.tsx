'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerificationBadge } from './VerificationBadge';

interface VerificationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

interface VerificationData {
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
    checks_passed: any;
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

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onVerificationUpdate?: () => void;
}

export function UserDetailModal({ isOpen, onClose, userId, onVerificationUpdate }: UserDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      const data = await response.json();
      setUser(data.user);
      setVerification(data.verification);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async () => {
    if (!action) return;
    if (action === 'reject' && !reason.trim()) {
      setError('Reason is required when rejecting verification');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update verification');
      }

      // Refresh user data
      await fetchUserDetails();
      if (onVerificationUpdate) {
        onVerificationUpdate();
      }
      setAction(null);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verification');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing[4],
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[6],
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: theme.spacing[4],
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
          }}>
            User Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing[1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={24} color={theme.colors.textSecondary} />
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing[8] }}>
            <Icon name="loader" size={32} className="animate-spin" />
          </div>
        )}

        {error && (
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: theme.borderRadius.md,
            color: '#EF4444',
            fontSize: theme.typography.fontSize.sm,
          }}>
            {error}
          </div>
        )}

        {!loading && user && (
          <>
            {/* User Info */}
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing[3],
                color: theme.colors.textPrimary,
              }}>
                Basic Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing[3],
                fontSize: theme.typography.fontSize.sm,
              }}>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>Name:</span>
                  <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary }}>
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>Email:</span>
                  <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary }}>
                    {user.email}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>Role:</span>
                  <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary, textTransform: 'capitalize' }}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>Joined:</span>
                  <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary }}>
                    {new Date(user.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Contractor Verification Section */}
            {user.role === 'contractor' && verification && (
              <>
                <div style={{
                  borderTop: `1px solid ${theme.colors.border}`,
                  paddingTop: theme.spacing[4],
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing[4],
                  }}>
                    <h3 style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      margin: 0,
                    }}>
                      Verification Status
                    </h3>
                    <VerificationBadge
                      status={verification.adminVerified ? 'verified' : 'pending'}
                      size="md"
                    />
                  </div>

                  {/* Verification Score */}
                  <div style={{
                    marginBottom: theme.spacing[4],
                    padding: theme.spacing[3],
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing[2],
                    }}>
                      <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
                        Verification Score
                      </span>
                      <span style={{
                        fontSize: theme.typography.fontSize.xl,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: verification.verificationScore >= 90 ? '#10B981' : verification.verificationScore >= 70 ? '#F59E0B' : '#EF4444',
                      }}>
                        {verification.verificationScore}/100
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: theme.colors.border,
                      borderRadius: theme.borderRadius.full,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${verification.verificationScore}%`,
                        height: '100%',
                        backgroundColor: verification.verificationScore >= 90 ? '#10B981' : verification.verificationScore >= 70 ? '#F59E0B' : '#EF4444',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>

                  {/* Automated Checks */}
                  <div style={{ marginBottom: theme.spacing[4] }}>
                    <h4 style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      marginBottom: theme.spacing[2],
                      color: theme.colors.textPrimary,
                    }}>
                      Automated Checks
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
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
                            color={check.passed ? '#10B981' : '#EF4444'}
                          />
                          <span style={{
                            fontSize: theme.typography.fontSize.sm,
                            color: theme.colors.textPrimary,
                            flex: 1,
                          }}>
                            {check.name}
                          </span>
                          {check.message && (
                            <span style={{
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.textSecondary,
                            }}>
                              {check.message}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Verification Details */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: theme.spacing[3],
                    marginBottom: theme.spacing[4],
                    fontSize: theme.typography.fontSize.sm,
                  }}>
                    {verification.companyName && (
                      <div>
                        <span style={{ color: theme.colors.textSecondary }}>Company:</span>
                        <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary }}>
                          {verification.companyName}
                        </span>
                      </div>
                    )}
                    {verification.licenseNumber && (
                      <div>
                        <span style={{ color: theme.colors.textSecondary }}>License:</span>
                        <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary }}>
                          {verification.licenseNumber}
                        </span>
                      </div>
                    )}
                    {verification.businessAddress && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: theme.colors.textSecondary }}>Business Address:</span>
                        <div style={{ marginTop: theme.spacing[1], color: theme.colors.textPrimary }}>
                          {verification.businessAddress}
                          {verification.latitude && verification.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${verification.latitude},${verification.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
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
                        <span style={{ color: theme.colors.textSecondary }}>Insurance Expires:</span>
                        <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textPrimary }}>
                          {new Date(verification.insuranceExpiryDate).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Verification Actions */}
                  {!verification.adminVerified && (
                    <div style={{
                      borderTop: `1px solid ${theme.colors.border}`,
                      paddingTop: theme.spacing[4],
                    }}>
                      <h4 style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing[3],
                        color: theme.colors.textPrimary,
                      }}>
                        Verification Actions
                      </h4>
                      {action === null ? (
                        <div style={{ display: 'flex', gap: theme.spacing[3] }}>
                          <Button
                            variant="primary"
                            onClick={() => setAction('approve')}
                            style={{ flex: 1 }}
                          >
                            <Icon name="checkCircle" size={16} /> Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => setAction('reject')}
                            style={{ flex: 1 }}
                          >
                            <Icon name="xCircle" size={16} /> Reject
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                          {action === 'reject' && (
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: theme.typography.fontSize.sm,
                                fontWeight: theme.typography.fontWeight.medium,
                                color: theme.colors.textPrimary,
                                marginBottom: theme.spacing[1],
                              }}>
                                Rejection Reason (Required)
                              </label>
                              <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter reason for rejection..."
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
                              variant="secondary"
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
                              onClick={handleVerificationAction}
                              disabled={verifying || (action === 'reject' && !reason.trim())}
                              style={{ flex: 1 }}
                            >
                              {verifying ? 'Processing...' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verification History */}
                  {verification.history && verification.history.length > 0 && (
                    <div style={{
                      borderTop: `1px solid ${theme.colors.border}`,
                      paddingTop: theme.spacing[4],
                    }}>
                      <h4 style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing[3],
                        color: theme.colors.textPrimary,
                      }}>
                        Verification History
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[1] }}>
                              <span style={{
                                fontWeight: theme.typography.fontWeight.semibold,
                                color: theme.colors.textPrimary,
                                textTransform: 'capitalize',
                              }}>
                                {entry.action.replace('_', ' ')}
                              </span>
                              <span style={{ color: theme.colors.textSecondary }}>
                                {new Date(entry.created_at).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            {entry.reason && (
                              <div style={{ color: theme.colors.textSecondary, marginTop: theme.spacing[1] }}>
                                Reason: {entry.reason}
                              </div>
                            )}
                            {entry.verification_score !== null && (
                              <div style={{ color: theme.colors.textSecondary, marginTop: theme.spacing[1] }}>
                                Score: {entry.verification_score}/100
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: theme.spacing[4],
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

