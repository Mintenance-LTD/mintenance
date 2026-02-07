import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface ContractorData {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  contractor?: ContractorData | ContractorData[];
}

interface JobListItemProps {
  job: Job;
  isSelected: boolean;
}

export function JobListItem({ job, isSelected }: JobListItemProps) {
  const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;

  let statusColor: string = theme.colors.info;
  let statusLabel = 'Posted';
  let statusBg = `${theme.colors.info}20`;

  if (job.status === 'assigned') {
    statusColor = theme.colors.info;
    statusLabel = 'Scheduled';
    statusBg = `${theme.colors.info}20`;
  } else if (job.status === 'in_progress') {
    statusColor = theme.colors.warning;
    statusLabel = 'In Progress';
    statusBg = `${theme.colors.warning}20`;
  } else if (job.status === 'completed') {
    statusColor = theme.colors.success;
    statusLabel = 'Awaiting Payment';
    statusBg = `${theme.colors.success}20`;
  }

  return (
    <Link href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', gap: theme.spacing[4], padding: theme.spacing[4], borderRadius: '18px',
        justifyContent: 'space-between', cursor: 'pointer',
        border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
        backgroundColor: isSelected ? `${theme.colors.primary}15` : theme.colors.surface
      }}>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', gap: theme.spacing[1] }}>
          <p style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, margin: 0 }}>
            {job.title}
          </p>
          {contractor && (
            <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, margin: 0 }}>
              {contractor.first_name} {contractor.last_name}
            </p>
          )}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2],
            borderRadius: theme.borderRadius.full, backgroundColor: statusBg,
            padding: '4px 10px', width: 'fit-content', marginTop: theme.spacing[1]
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
            <span style={{ fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <Icon name="arrowForward" size={24} color={theme.colors.textSecondary} />
        </div>
      </div>
    </Link>
  );
}
