import Link from 'next/link';
import { theme } from '@/lib/theme';

export default function ContractorsPage() {
  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surfaceSecondary,
        color: theme.colors.textPrimary,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: theme.typography.fontSize['3xl'], margin: 0 }}>Contractor Directory</h1>
      <p style={{ maxWidth: 520, lineHeight: 1.5 }}>
        The full contractor discovery experience lives in the mobile app today. We are working on a streamlined web
        experience. Until then, you can browse jobs or manage payments from the web dashboard.
      </p>
      <div style={{ display: 'flex', gap: theme.spacing.md }}>
        <Link
          href="/jobs"
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.secondary,
            color: theme.colors.white,
            textDecoration: 'none',
          }}
        >
          View jobs
        </Link>
        <Link
          href="/analytics"
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.secondary}`,
            color: theme.colors.secondary,
            textDecoration: 'none',
          }}
        >
          Check analytics (mobile)
        </Link>
      </div>
    </main>
  );
}
