'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface ActionCardProps {
  label: string;
  href: string;
  icon: string;
}

export function ActionCard({ label, href, icon }: ActionCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[3],
        padding: theme.spacing[4],
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '16px',
        textDecoration: 'none',
        color: theme.colors.textPrimary,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.border}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Icon name={icon} size={24} color={theme.colors.primary} />
      <span
        style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
        }}
      >
        {label}
      </span>
    </Link>
  );
}

