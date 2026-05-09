import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Logo from '../../../components/Logo';

/**
 * Top bar for the contractor public profile page.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 */
export function ContractorPageHeader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <Link
        href='/contractors'
        style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}
      >
        <Logo />
        <span
          style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
          }}
        >
          Mintenance
        </span>
      </Link>

      <nav
        style={{
          display: 'flex',
          gap: theme.spacing[4],
          alignItems: 'center',
        }}
      >
        <Link
          href='/contractors'
          style={{
            color: theme.colors.textSecondary,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Icon
              name='arrowLeft'
              size={16}
              color={theme.colors.textSecondary}
            />
            Back to directory
          </span>
        </Link>
        <Link
          href='/jobs'
          style={{
            color: theme.colors.textSecondary,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name='plus' size={16} color={theme.colors.textSecondary} />
          Post a job
        </Link>
      </nav>
    </div>
  );
}
