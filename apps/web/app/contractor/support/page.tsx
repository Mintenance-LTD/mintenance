'use client';

import { theme } from '@/lib/theme';
import Link from 'next/link';

export default function ContractorSupportPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}
        >
          Contractor Support
        </h1>
        <p
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          Need a hand? Reach out to our team or browse guides tailored to your workflow.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <div
          style={{
            padding: theme.spacing[5],
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              margin: 0,
            }}
          >
            Contact support
          </h2>
          <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Email{' '}
            <a href="mailto:support@mintenance.com" style={{ color: theme.colors.primary }}>
              support@mintenance.com
            </a>{' '}
            or start a chat with our contractor success team.
          </p>
        </div>

        <div
          style={{
            padding: theme.spacing[5],
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              margin: 0,
            }}
          >
            Browse quick help
          </h2>
          <ul style={{ margin: 0, paddingLeft: theme.spacing[4], color: theme.colors.textSecondary }}>
            <li>
              <Link href="/contractor/verification" style={{ color: theme.colors.primary }}>
                Verification checklist
              </Link>
            </li>
            <li>
              <Link href="/contractor/quotes" style={{ color: theme.colors.primary }}>
                Build and send quotes
              </Link>
            </li>
            <li>
              <Link href="/contractor/service-areas" style={{ color: theme.colors.primary }}>
                Manage service coverage
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

