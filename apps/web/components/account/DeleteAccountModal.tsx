'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

/**
 * DeleteAccountModal Component
 * 
 * Confirmation modal for account deletion with safety checks.
 * Requires user to type "DELETE" to confirm.
 */
export function DeleteAccountModal({ isOpen, onClose, userId }: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmationText !== 'DELETE') {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          confirmation: confirmationText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear any auth cookies/tokens
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Redirect to login page
      router.push('/login?message=Account deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const isConfirmed = confirmationText === 'DELETE';

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
          maxWidth: '500px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[2],
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="warning" size={24} color="#EF4444" />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Delete Account
            </h2>
            <p style={{
              margin: 0,
              marginTop: theme.spacing[1],
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div style={{
          padding: theme.spacing[4],
          backgroundColor: '#FEF2F2',
          border: `1px solid #FEE2E2`,
          borderRadius: theme.borderRadius.md,
        }}>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            color: '#991B1B',
            lineHeight: 1.6,
          }}>
            <strong>Warning:</strong> Deleting your account will permanently remove your profile and all associated data. 
            This includes:
          </p>
          <ul style={{
            margin: `${theme.spacing[2]} 0 0 0`,
            paddingLeft: theme.spacing[5],
            color: '#991B1B',
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 1.8,
          }}>
            <li>Your profile information</li>
            <li>Job postings and bids</li>
            <li>Messages and conversations</li>
            <li>Payment and transaction history</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
          }}>
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => {
              setConfirmationText(e.target.value);
              setError(null);
            }}
            placeholder="DELETE"
            disabled={loading}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              border: `1px solid ${error ? '#EF4444' : theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.base,
              backgroundColor: theme.colors.background,
              color: theme.colors.textPrimary,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: '#EF4444',
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: theme.spacing[3],
          justifyContent: 'flex-end',
          marginTop: theme.spacing[2],
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: isConfirmed && !loading ? '#EF4444' : '#FCA5A5',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              color: 'white',
              cursor: (isConfirmed && !loading) ? 'pointer' : 'not-allowed',
              opacity: (isConfirmed && !loading) ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            {loading ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Icon name="trash" size={16} />
                Delete Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

