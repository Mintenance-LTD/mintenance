import Link from 'next/link';
import { theme } from '@/lib/theme';

export default function AnalyticsPage() {
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
      <h1 style={{ fontSize: theme.typography.fontSize['3xl'], margin: 0 }}>Analytics Coming Soon</h1>
      <p style={{ maxWidth: 480, lineHeight: 1.5 }}>
        The contractor analytics dashboard is being migrated from the mobile app. In the meantime you can continue to
        review performance metrics from the mobile experience or export reports through the admin console.
      </p>
      <div style={{ display: 'flex', gap: theme.spacing.md }}>
        <Link
          href="/"
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.primary,
            color: theme.colors.white,
            textDecoration: 'none',
          }}
        >
          Go back home
        </Link>
        <Link
          href="/payments"
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.primary}`,
            color: theme.colors.primary,
            textDecoration: 'none',
          }}
        >
          View payments
        </Link>
      </div>
    </main>
  );
}
