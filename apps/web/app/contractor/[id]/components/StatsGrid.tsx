import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

/**
 * Two-stat grid (jobs completed, average rating).
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 */
export function StatsGrid({
  totalJobsCompleted,
  avgRating,
  reviewCount,
}: {
  totalJobsCompleted: number;
  avgRating: number;
  reviewCount: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: theme.spacing[6],
        marginBottom: theme.spacing[8],
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: theme.typography.fontSize['4xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary,
            marginBottom: theme.spacing[2],
          }}
        >
          {totalJobsCompleted}
        </div>
        <div
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}
        >
          Jobs Completed
        </div>
      </div>

      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[2],
          }}
        >
          <Icon name='star' size={24} color={theme.colors.warning} />
          <span
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
            }}
          >
            {avgRating.toFixed(1)}
          </span>
        </div>
        <div
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}
        >
          Average Rating ({reviewCount} reviews)
        </div>
      </div>
    </div>
  );
}
