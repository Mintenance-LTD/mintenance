'use client';

import { theme } from '@/lib/theme';

interface WelcomeHeaderProps {
  contractorFullName: string;
  activeJobsCount: number;
  pendingBidsCount: number;
  thisMonthRevenue: number;
}

export function WelcomeHeader({
  contractorFullName,
  activeJobsCount,
  pendingBidsCount,
  thisMonthRevenue,
}: WelcomeHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(16, 185, 129, 0.03) 100%)',
        borderRadius: '20px',
        padding: theme.spacing[6],
        marginBottom: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <h2
        style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          margin: 0,
          marginBottom: theme.spacing[2],
          letterSpacing: '-0.02em',
        }}
      >
        {getGreeting()}, {contractorFullName}
      </h2>
      <p
        style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: theme.colors.success,
            }}
          />
          {activeJobsCount} active jobs
        </span>
        <span>•</span>
        <span>{pendingBidsCount} pending bids</span>
        <span>•</span>
        <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.success }}>
          £{thisMonthRevenue.toLocaleString()} this month
        </span>
      </p>
    </div>
  );
}
