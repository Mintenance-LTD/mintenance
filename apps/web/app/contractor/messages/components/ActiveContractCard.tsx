'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface ActiveContractCardProps {
  job: {
    id: string;
    title: string;
    homeowner: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      profile_image_url?: string | null;
    };
  };
  contract: {
    id: string;
    status: string;
    contractor_signed_at: string | null;
    homeowner_signed_at: string | null;
  } | null;
  onCreateContract: () => void;
  onViewMessages: () => void;
  onViewJob: () => void;
}

export function ActiveContractCard({
  job,
  contract,
  onCreateContract,
  onViewMessages,
  onViewJob,
}: ActiveContractCardProps) {
  const homeownerInitial = job.homeowner.first_name.charAt(0).toUpperCase();
  
  // Determine contract status display
  const getContractStatus = () => {
    if (!contract) {
      return { label: 'No Contract', color: theme.colors.textSecondary, bg: theme.colors.backgroundTertiary };
    }
    
    switch (contract.status) {
      case 'accepted':
        return { label: 'Signed', color: theme.colors.success, bg: theme.colors.success + '20' };
      case 'pending_homeowner':
        return { label: 'Pending Signatures', color: theme.colors.warning, bg: theme.colors.warning + '20' };
      case 'pending_contractor':
        return { label: 'Pending Signatures', color: theme.colors.warning, bg: theme.colors.warning + '20' };
      case 'draft':
        return { label: 'Draft', color: theme.colors.textSecondary, bg: theme.colors.backgroundTertiary };
      default:
        return { label: contract.status, color: theme.colors.textSecondary, bg: theme.colors.backgroundTertiary };
    }
  };

  const contractStatus = getContractStatus();
  const canCreateContract = !contract;
  const needsContractorSignature = contract && contract.status === 'pending_contractor' && !contract.contractor_signed_at;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only navigate if there's a contract (buttons inside have stopPropagation)
    if (contract) {
      onViewJob();
    }
  };

  const handleButtonContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    backgroundColor: theme.colors.white,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    cursor: contract ? 'pointer' : 'default',
    transition: 'all 0.2s',
  };

  return (
    <div
      onClick={handleCardClick}
      style={cardStyle}
    >
      {/* Left Section - Job Info */}
      <div data-card-content style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flex: 1 }}>
        {/* Avatar */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            flexShrink: 0,
          }}
        >
          {homeownerInitial}
        </div>

        {/* Job Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], flexWrap: 'wrap' }}>
            <Icon name="document" size={20} color={theme.colors.primary} />
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {job.title}
            </div>
            <div
              style={{
                padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                borderRadius: theme.borderRadius.full,
                backgroundColor: contractStatus.bg,
                color: contractStatus.color,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
                whiteSpace: 'nowrap',
              }}
            >
              {contractStatus.label}
            </div>
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            {job.homeowner.first_name} {job.homeowner.last_name}
          </div>
        </div>
      </div>

      {/* Right Section - Action Buttons */}
      <div style={{ display: 'flex', gap: theme.spacing[2], flexShrink: 0 }} onClick={handleButtonContainerClick}>
        {canCreateContract ? (
          <button
            onClick={onCreateContract}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              transition: 'all 0.2s',
            }}
          >
            <Icon name="fileText" size={16} color="white" />
            Create Contract
          </button>
        ) : (
          <>
            {needsContractorSignature && (
              <button
                onClick={onViewJob}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  transition: 'all 0.2s',
                }}
              >
                <Icon name="checkCircle" size={16} color="white" />
                Sign Contract
              </button>
            )}
            <button
              onClick={onViewMessages}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: 'transparent',
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                transition: 'all 0.2s',
              }}
            >
              <Icon name="messages" size={16} color={theme.colors.primary} />
              View Messages
            </button>
          </>
        )}
      </div>
    </div>
  );
}
