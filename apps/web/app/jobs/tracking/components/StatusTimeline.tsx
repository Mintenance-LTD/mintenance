import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface StatusTimelineProps {
  createdAt: string;
  updatedAt?: string;
  /** Optional scheduled date for the service. When provided, displays a formatted en-GB date. */
  scheduledDate?: string | null;
}

export function StatusTimeline({ createdAt, updatedAt, scheduledDate }: StatusTimelineProps) {
  /** Format a date string using en-GB locale with a readable long-form style. */
  const formatDateGB = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  return (
    <div style={{
      gridColumn: 'span 2', backgroundColor: theme.colors.surface,
      padding: theme.spacing[6], borderRadius: '18px', border: `1px solid ${theme.colors.border}`
    }}>
      <h4 style={{
        fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary, marginBottom: theme.spacing[4]
      }}>
        Status Timeline
      </h4>

      <ol style={{ position: 'relative', borderLeft: `2px solid ${theme.colors.border}`, padding: 0, margin: 0, listStyle: 'none' }}>
        <li style={{ marginBottom: theme.spacing[6], marginLeft: theme.spacing[6] }}>
          <span style={{
            position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', backgroundColor: theme.colors.success, borderRadius: '50%',
            left: '-13px', border: `4px solid ${theme.colors.surface}`
          }}>
            <Icon name="check" size={12} color="white" />
          </span>
          <h5 style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textPrimary, margin: 0 }}>Job Booked</h5>
          <time style={{ display: 'block', fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            {formatDateGB(createdAt)}
          </time>
        </li>

        <li style={{ marginBottom: theme.spacing[6], marginLeft: theme.spacing[6] }}>
          <span style={{
            position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', backgroundColor: theme.colors.success, borderRadius: '50%',
            left: '-13px', border: `4px solid ${theme.colors.surface}`
          }}>
            <Icon name="check" size={12} color="white" />
          </span>
          <h5 style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textPrimary, margin: 0 }}>Service Scheduled</h5>
          <time style={{ display: 'block', fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, fontStyle: scheduledDate ? 'normal' : 'italic' }}>
            {scheduledDate ? formatDateGB(scheduledDate) : 'Not yet scheduled'}
          </time>
        </li>

        <li style={{ marginBottom: theme.spacing[6], marginLeft: theme.spacing[6] }}>
          <span style={{
            position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', backgroundColor: theme.colors.primary, borderRadius: '50%',
            left: '-13px', border: `4px solid ${theme.colors.surface}`
          }}>
            <Icon name="autorenew" size={12} color="white" />
          </span>
          <h5 style={{ fontWeight: theme.typography.fontWeight.bold, color: theme.colors.primary, margin: 0 }}>Work In Progress</h5>
          <time style={{ display: 'block', fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Started {formatDateGB(updatedAt || createdAt)}
          </time>
        </li>

        <li style={{ marginLeft: theme.spacing[6] }}>
          <span style={{
            position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', backgroundColor: theme.colors.border, borderRadius: '50%',
            left: '-13px', border: `4px solid ${theme.colors.surface}`
          }}>
            <Icon name="payments" size={12} color={theme.colors.textSecondary} />
          </span>
          <h5 style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary, margin: 0 }}>Awaiting Payment</h5>
        </li>
      </ol>
    </div>
  );
}
