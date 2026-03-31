'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { UserDetail } from './UserDetailTypes';
import { formatDate, getRoleBadge } from './UserDetailTypes';

interface UserDetailHeaderProps {
  data: UserDetail;
  actionLoading: boolean;
  onVerify: () => void;
  onUnverify: () => void;
}

export function UserDetailHeader({
  data,
  actionLoading,
  onVerify,
  onUnverify,
}: UserDetailHeaderProps) {
  const { profile } = data;
  const displayName =
    `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
    profile.companyName ||
    profile.email.split('@')[0];
  const initials =
    profile.firstName && profile.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : displayName.substring(0, 2).toUpperCase();
  const roleBadge = getRoleBadge(profile.role);

  return (
    <AdminCard padding='lg' className='mb-6'>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: theme.spacing[4],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[4],
          }}
        >
          {/* Avatar */}
          {profile.profileImageUrl ? (
            <img
              src={profile.profileImageUrl}
              alt={displayName}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #E2E8F0',
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: theme.colors.adminPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}

          {/* Name and info */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                marginBottom: 4,
              }}
            >
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                {displayName}
              </h1>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: roleBadge.bg,
                  color: roleBadge.text,
                }}
              >
                {roleBadge.label}
              </span>
              {profile.adminVerified && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#D1FAE5',
                    color: '#065F46',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon name='checkCircle' size={12} color='#065F46' /> Verified
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[4],
                flexWrap: 'wrap',
              }}
            >
              <span>{profile.email}</span>
              {profile.phone && (
                <>
                  <span style={{ color: '#CBD5E1' }}>|</span>
                  <span>{profile.phone}</span>
                </>
              )}
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span>Member since {formatDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div
          style={{
            display: 'flex',
            gap: theme.spacing[2],
            flexWrap: 'wrap',
          }}
        >
          {profile.role === 'contractor' &&
            (profile.adminVerified ? (
              <Button
                variant='outline'
                onClick={onUnverify}
                disabled={actionLoading}
              >
                <Icon name='xCircle' size={16} /> Unverify
              </Button>
            ) : (
              <Button
                variant='primary'
                onClick={onVerify}
                disabled={actionLoading}
              >
                <Icon name='checkCircle' size={16} /> Verify
              </Button>
            ))}
        </div>
      </div>

      {/* Contractor-specific info */}
      {profile.role === 'contractor' && (
        <div
          style={{
            marginTop: theme.spacing[4],
            paddingTop: theme.spacing[4],
            borderTop: '1px solid #E2E8F0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[3],
            fontSize: '13px',
          }}
        >
          {profile.companyName && (
            <div>
              <span style={{ color: '#64748B' }}>Company:</span>{' '}
              <span style={{ color: '#0F172A', fontWeight: 500 }}>
                {profile.companyName}
              </span>
            </div>
          )}
          {profile.licenseNumber && (
            <div>
              <span style={{ color: '#64748B' }}>License:</span>{' '}
              <span style={{ color: '#0F172A', fontWeight: 500 }}>
                {profile.licenseNumber}
              </span>
            </div>
          )}
          {profile.businessAddress && (
            <div>
              <span style={{ color: '#64748B' }}>Address:</span>{' '}
              <span style={{ color: '#0F172A', fontWeight: 500 }}>
                {profile.businessAddress}
              </span>
            </div>
          )}
          {profile.yearsExperience != null && (
            <div>
              <span style={{ color: '#64748B' }}>Experience:</span>{' '}
              <span style={{ color: '#0F172A', fontWeight: 500 }}>
                {profile.yearsExperience} years
              </span>
            </div>
          )}
          {profile.insuranceProvider && (
            <div>
              <span style={{ color: '#64748B' }}>Insurance:</span>{' '}
              <span style={{ color: '#0F172A', fontWeight: 500 }}>
                {profile.insuranceProvider}
                {profile.insuranceExpiryDate &&
                  ` (expires ${formatDate(profile.insuranceExpiryDate)})`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <div
          style={{
            marginTop: theme.spacing[3],
            padding: theme.spacing[3],
            backgroundColor: '#F8FAFC',
            borderRadius: theme.borderRadius.md,
            fontSize: '13px',
            color: '#475569',
            lineHeight: 1.6,
          }}
        >
          {profile.bio}
        </div>
      )}
    </AdminCard>
  );
}
