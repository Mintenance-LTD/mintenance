'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { VerificationBadge } from '../../users/components/VerificationBadge';
import { Button } from '@/components/ui/Button';
import type { ContractorVerification } from './types';

interface ContractorVerificationCardProps {
  contractor: ContractorVerification;
  actionLoading: string | null;
  onApprove: (contractor: ContractorVerification) => void;
  onReject: (contractor: ContractorVerification) => void;
}

function getDisplayName(c: ContractorVerification): string {
  if (c.first_name || c.last_name) {
    return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
  }
  return c.company_name ?? c.email.split('@')[0];
}

function getInitials(c: ContractorVerification): string {
  if (c.first_name || c.last_name) {
    return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase();
  }
  if (c.company_name) return c.company_name.substring(0, 2).toUpperCase();
  return c.email.substring(0, 2).toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isInsuranceValid(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) > new Date();
}

export { getDisplayName };

export function ContractorVerificationCard({
  contractor,
  actionLoading,
  onApprove,
  onReject,
}: ContractorVerificationCardProps) {
  return (
    <AdminCard padding='lg'>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        {/* Header Row: Avatar + Name + Status Badge + Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: theme.spacing[3],
          }}
        >
          {/* Left: Avatar + Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              flex: 1,
              minWidth: '240px',
            }}
          >
            {/* Avatar */}
            <div
              aria-hidden='true'
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: theme.typography.fontWeight.bold,
                fontSize: theme.typography.fontSize.base,
                flexShrink: 0,
              }}
            >
              {getInitials(contractor)}
            </div>

            {/* Name + Email + Phone */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  flexWrap: 'wrap',
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
                  {getDisplayName(contractor)}
                </h3>
                <VerificationBadge
                  status={contractor.verification_status}
                  size='sm'
                />
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}
              >
                {contractor.email}
              </div>
              {contractor.phone && (
                <div
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    marginTop: '2px',
                  }}
                >
                  <Icon
                    name='phone'
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  {contractor.phone}
                </div>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          {contractor.verification_status === 'pending' && (
            <div
              style={{ display: 'flex', gap: theme.spacing[2], flexShrink: 0 }}
            >
              <Button
                variant='success'
                size='sm'
                onClick={() => onApprove(contractor)}
                disabled={actionLoading === contractor.id}
                aria-label={`Approve ${getDisplayName(contractor)}`}
              >
                <Icon name='checkCircle' size={16} />
                {actionLoading === contractor.id ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                variant='destructive'
                size='sm'
                onClick={() => onReject(contractor)}
                disabled={actionLoading === contractor.id}
                aria-label={`Reject ${getDisplayName(contractor)}`}
              >
                <Icon name='xCircle' size={16} />
                Reject
              </Button>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[3],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          {/* Company */}
          {contractor.company_name && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Company
              </div>
              <div style={{ color: theme.colors.textPrimary }}>
                {contractor.company_name}
              </div>
            </div>
          )}

          {/* Trade Categories / Skills */}
          {(contractor.trade_categories.length > 0 ||
            contractor.skills.length > 0) && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Trade Categories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(contractor.trade_categories.length > 0
                  ? contractor.trade_categories
                  : contractor.skills.map((s) => s.skill_name)
                )
                  .slice(0, 4)
                  .map((cat) => (
                    <span
                      key={cat}
                      style={{
                        padding: `1px ${theme.spacing[2]}`,
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.full,
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                {(contractor.trade_categories.length > 4 ||
                  contractor.skills.length > 4) && (
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    +
                    {Math.max(
                      contractor.trade_categories.length,
                      contractor.skills.length
                    ) - 4}{' '}
                    more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Years of Experience */}
          {contractor.skills.length > 0 && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Experience
              </div>
              <div style={{ color: theme.colors.textPrimary }}>
                {(() => {
                  const maxExp = Math.max(
                    ...contractor.skills
                      .filter((s) => s.years_experience !== null)
                      .map((s) => s.years_experience ?? 0)
                  );
                  return maxExp > 0 ? `${maxExp}+ years` : 'Not specified';
                })()}
              </div>
            </div>
          )}

          {/* Insurance Status */}
          <div>
            <div
              style={{
                color: theme.colors.textSecondary,
                marginBottom: '2px',
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Insurance
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
              }}
            >
              {contractor.insurance_expiry_date ? (
                <>
                  <Icon
                    name='shield'
                    size={16}
                    color={
                      isInsuranceValid(contractor.insurance_expiry_date)
                        ? '#10B981'
                        : '#EF4444'
                    }
                  />
                  <span
                    style={{
                      color: isInsuranceValid(contractor.insurance_expiry_date)
                        ? '#10B981'
                        : '#EF4444',
                      fontWeight: theme.typography.fontWeight.medium,
                    }}
                  >
                    {isInsuranceValid(contractor.insurance_expiry_date)
                      ? 'Valid'
                      : 'Expired'}
                  </span>
                  <span
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.xs,
                    }}
                  >
                    (exp. {formatDate(contractor.insurance_expiry_date)})
                  </span>
                </>
              ) : (
                <>
                  <Icon
                    name='shield'
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <span style={{ color: theme.colors.textSecondary }}>
                    Not provided
                  </span>
                </>
              )}
            </div>
          </div>

          {/* License Number */}
          {contractor.license_number && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                License
              </div>
              <div style={{ color: theme.colors.textPrimary }}>
                {contractor.license_number}
              </div>
            </div>
          )}

          {/* Certifications */}
          {contractor.certifications_count > 0 && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Certifications
              </div>
              <div style={{ color: theme.colors.textPrimary }}>
                {contractor.certifications_count} uploaded
              </div>
            </div>
          )}

          {/* Location */}
          {contractor.city && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Location
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  color: theme.colors.textPrimary,
                }}
              >
                <Icon
                  name='mapPin'
                  size={14}
                  color={theme.colors.textSecondary}
                />
                {contractor.city}
              </div>
            </div>
          )}

          {/* Registration Date */}
          <div>
            <div
              style={{
                color: theme.colors.textSecondary,
                marginBottom: '2px',
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Registered
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                color: theme.colors.textPrimary,
              }}
            >
              <Icon
                name='calendar'
                size={14}
                color={theme.colors.textSecondary}
              />
              {formatDate(contractor.created_at)}
            </div>
          </div>

          {/* Jobs Completed + Rating */}
          {(contractor.total_jobs_completed > 0 || contractor.rating > 0) && (
            <div>
              <div
                style={{
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Track Record
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  color: theme.colors.textPrimary,
                }}
              >
                {contractor.total_jobs_completed > 0 && (
                  <span>{contractor.total_jobs_completed} jobs</span>
                )}
                {contractor.rating > 0 && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Icon name='star' size={14} color='#F59E0B' />
                    {Number(contractor.rating).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
