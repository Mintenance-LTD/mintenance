'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface MessageContractorButtonProps {
  jobId: string;
  contractorId: string;
  contractorName: string;
  jobTitle: string;
}

export function MessageContractorButton({
  jobId,
  contractorId,
  contractorName,
  jobTitle,
}: MessageContractorButtonProps) {
  const href = `/messages/${jobId}?userId=${contractorId}&userName=${encodeURIComponent(contractorName)}&jobTitle=${encodeURIComponent(jobTitle)}`;

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[2],
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
        backgroundColor: theme.colors.primary,
        color: 'white',
        borderRadius: theme.borderRadius.md,
        textDecoration: 'none',
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        transition: 'all 0.2s',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#2563EB';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.primary;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Icon name="messages" size={20} color="white" />
      Message Contractor
    </Link>
  );
}
