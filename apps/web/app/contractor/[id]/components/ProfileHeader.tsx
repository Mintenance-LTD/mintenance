import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { Contractor } from '../types';
import { VERIFIED_BADGE_COLOR } from './theme/badgeColors';

/**
 * Avatar + name + bio + availability + contact button.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 */
export function ProfileHeader({
  contractor,
  contractorId,
}: {
  contractor: Contractor;
  contractorId: string;
}) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[8],
        marginBottom: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[6],
        }}
      >
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.fontSize['4xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: 'white',
          }}
        >
          {contractor.first_name?.[0]}
          {contractor.last_name?.[0]}
        </div>

        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing[2],
            }}
          >
            {contractor.first_name} {contractor.last_name}
            {contractor.email_verified && (
              <Icon
                name='badge'
                size={20}
                color={VERIFIED_BADGE_COLOR}
                style={{ marginLeft: theme.spacing[3] }}
              />
            )}
          </h1>

          <p
            style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[4],
            }}
          >
            {contractor.city || 'Location not set'},{' '}
            {contractor.country || 'UK'}
          </p>

          {contractor.bio && (
            <p
              style={{
                color: theme.colors.textSecondary,
                lineHeight: '1.6',
                marginBottom: theme.spacing[4],
              }}
            >
              {contractor.bio}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: theme.spacing[3],
              alignItems: 'center',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: contractor.is_available
                  ? theme.colors.success
                  : theme.colors.error,
                color: 'white',
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              <Icon
                name={contractor.is_available ? 'checkCircle' : 'xCircle'}
                size={14}
                color='white'
              />
              {contractor.is_available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

        <Link
          href={`/messages?contractor=${contractorId}`}
          style={{
            padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
            backgroundColor: theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.lg,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Contact Contractor
        </Link>
      </div>
    </div>
  );
}
