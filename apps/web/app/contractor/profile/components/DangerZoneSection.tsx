'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';

interface DangerZoneSectionProps {
  contractorId: string | undefined;
  loading: boolean;
}

/**
 * DangerZoneSection Component
 *
 * Renders the danger zone area with a delete account button and
 * integrates the DeleteAccountModal confirmation dialog.
 */
export function DangerZoneSection({ contractorId, loading }: DangerZoneSectionProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <div style={{
        padding: theme.spacing[6],
        borderTop: `1px solid ${theme.colors.border}`,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}>
          <h3 style={{
            margin: 0,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Danger Zone
          </h3>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            lineHeight: 1.6,
          }}>
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: 'transparent',
              border: `1px solid #EF4444`,
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              color: '#EF4444',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              width: 'fit-content',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#FEE2E2';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon name="trash" size={16} color="#EF4444" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && contractorId && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userId={contractorId}
        />
      )}
    </>
  );
}
