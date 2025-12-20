import { use } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';

interface Params {
  params: Promise<{ jobId: string }>;
}

export default function TimelinePage({ params }: Params) {
  const { jobId } = use(params);

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
      <h1 style={{ fontSize: theme.typography.fontSize['3xl'], margin: 0 }}>Project timeline</h1>
      <p style={{ maxWidth: 480, lineHeight: 1.5 }}>
        Detailed project timelines are being rebuilt for the web dashboard. You can review and update milestones from
        the mobile application in the meantime.
      </p>
      <div style={{ display: 'flex', gap: theme.spacing.md }}>
        <Link
          href={`/jobs/${jobId}`}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.primary,
            color: theme.colors.white,
            textDecoration: 'none',
          }}
        >
          View job details
        </Link>
        <Link
          href="/"
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.primary}`,
            color: theme.colors.primary,
            textDecoration: 'none',
          }}
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
