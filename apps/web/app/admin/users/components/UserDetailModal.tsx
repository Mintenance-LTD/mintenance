'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  ContractorVerificationSection,
  VerificationData,
} from './ContractorVerificationSection';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
  [key: string]: unknown;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onVerificationUpdate?: () => void;
}

export function UserDetailModal({
  isOpen,
  onClose,
  userId,
  onVerificationUpdate,
}: UserDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(
    null
  );
  const [verifying, setVerifying] = useState(false);
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
      setError(
        err instanceof Error ? err.message : 'Failed to load user details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async (
    action: 'approve' | 'reject',
    reason: string
  ) => {
    setVerifying(true);
    setError(null);

    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({
          action,
          reason: reason || undefined,
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update verification'
      );
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.colors.border}`,
            paddingBottom: theme.spacing[4],
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
            }}
          >
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
            <Icon name='x' size={24} color={theme.colors.textSecondary} />
          </button>
        </div>

        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: theme.spacing[8],
            }}
          >
            <Icon name='loader' size={32} className='animate-spin' />
          </div>
        )}

        {error ? (
          <div
            style={{
              padding: theme.spacing[3],
              backgroundColor: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: theme.borderRadius.md,
              color: '#EF4444',
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {error}
          </div>
        ) : null}

        {!loading && user ? (
          <>
            {/* User Info */}
            <div>
              <h3
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  marginBottom: theme.spacing[3],
                  color: theme.colors.textPrimary,
                }}
              >
                Basic Information
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>
                    Name:
                  </span>
                  <span
                    style={{
                      marginLeft: theme.spacing[2],
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>
                    Email:
                  </span>
                  <span
                    style={{
                      marginLeft: theme.spacing[2],
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {user.email}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>
                    Role:
                  </span>
                  <span
                    style={{
                      marginLeft: theme.spacing[2],
                      color: theme.colors.textPrimary,
                      textTransform: 'capitalize',
                    }}
                  >
                    {user.role}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.colors.textSecondary }}>
                    Joined:
                  </span>
                  <span
                    style={{
                      marginLeft: theme.spacing[2],
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {new Date(user.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Contractor Verification Section */}
            {user.role === 'contractor' && verification && (
              <ContractorVerificationSection
                verification={verification}
                verifying={verifying}
                error={error}
                setError={setError}
                onVerificationAction={handleVerificationAction}
              />
            )}
          </>
        ) : null}

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: theme.spacing[4],
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant='secondary' onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
