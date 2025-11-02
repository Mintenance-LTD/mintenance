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
}

export function ActiveContractCard({
  job,
  contract,
  onCreateContract,
  onViewMessages,
}: ActiveContractCardProps) {
  const homeownerName = `${job.homeowner.first_name} ${job.homeowner.last_name}`;
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing[4],
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.white,
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.white;
      }}
    >
      {/* Profile Avatar */}
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing[4],
          fontSize: theme.typography.fontSize.xl,
          color: theme.colors.white,
          fontWeight: theme.typography.fontWeight.bold,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {job.homeowner.profile_image_url ? (
          <img
            src={job.homeowner.profile_image_url}
            alt={homeownerName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          homeownerInitial
        )}
      </div>

      {/* Middle Section - Homeowner & Job Info */}
      <div style={{ flex: 1, minWidth: 0, marginRight: theme.spacing[4] }}>
        {/* Homeowner Name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[1],
          }}
        >
          <span
            style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {homeownerName}
          </span>
        </div>

        {/* Job Title */}
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[1],
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          📋 {job.title}
        </div>

        {/* Contract Status Badge */}
        <div style={{ display: 'inline-block' }}>
          <span
            style={{
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: contractStatus.bg,
              color: contractStatus.color,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            {contractStatus.label}
          </span>
        </div>
      </div>

      {/* Right Section - Action Buttons */}
      <div style={{ display: 'flex', gap: theme.spacing[2], flexShrink: 0 }}>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primaryDark || theme.colors.primary;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Icon name="fileText" size={16} color="white" />
            Create Contract
          </button>
        ) : (
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon name="messages" size={16} color={theme.colors.primary} />
            View Messages
          </button>
        )}
      </div>
    </div>
  );
}
