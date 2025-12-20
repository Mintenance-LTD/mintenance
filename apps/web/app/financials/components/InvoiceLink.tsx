'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface InvoiceLinkProps {
  href: string;
  children: React.ReactNode;
  isCard?: boolean;
}

export function InvoiceLink({ href, children, isCard = false }: InvoiceLinkProps) {
  return (
    <>
      <Link
        href={href}
        style={{
          display: 'block',
          padding: isCard ? theme.spacing[4] : theme.spacing[8],
          borderRadius: isCard ? theme.borderRadius.lg : theme.borderRadius.md,
          border: isCard ? `1px solid ${theme.colors.border}` : 'none',
          transition: 'all 0.2s',
          textDecoration: 'none',
          cursor: 'pointer',
          ...(isCard ? {} : {
            textAlign: 'center',
            color: theme.colors.textSecondary,
          }),
        }}
        className={isCard ? 'invoice-card-link' : 'invoice-empty-state-link'}
      >
        {children}
      </Link>
      <style jsx>{`
        .invoice-empty-state-link:hover {
          background-color: ${theme.colors.backgroundSecondary};
          color: ${theme.colors.textPrimary};
        }
        .invoice-card-link:hover {
          border-color: ${theme.colors.primary};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}
