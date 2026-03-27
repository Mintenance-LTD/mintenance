'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

export function ActionsDropdown({
  jobId,
  jobStatus,
}: {
  jobId: string;
  jobStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label='Job actions'
        aria-haspopup='true'
        aria-expanded={open}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: theme.borderRadius.md,
          border: '1px solid #E2E8F0',
          backgroundColor: open ? '#F1F5F9' : '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        <Icon name='menu' size={16} color='#64748B' />
      </button>
      {open && (
        <div
          role='menu'
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '4px',
            width: '180px',
            backgroundColor: '#FFFFFF',
            borderRadius: theme.borderRadius.lg,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            border: '1px solid #E2E8F0',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <DropdownLink
            href={`/jobs/${jobId}`}
            label='View Job'
            icon='eye'
            onClose={() => setOpen(false)}
          />
          <DropdownLink
            href={`/jobs/${jobId}#bids`}
            label='View Bids'
            icon='fileText'
            onClose={() => setOpen(false)}
          />
          {(jobStatus === 'completed' || jobStatus === 'in_progress') && (
            <DropdownLink
              href='/admin/escrow/reviews'
              label='Escrow Reviews'
              icon='dollarSign'
              onClose={() => setOpen(false)}
            />
          )}
          {jobStatus !== 'cancelled' && jobStatus !== 'completed' && (
            <DropdownButton
              label='Cancel Job'
              icon='x'
              variant='danger'
              onClick={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  label,
  icon,
  onClose,
}: {
  href: string;
  label: string;
  icon: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      role='menuitem'
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textPrimary,
        textDecoration: 'none',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon name={icon} size={15} color='#64748B' />
      {label}
    </Link>
  );
}

function DropdownButton({
  label,
  icon,
  variant,
  onClick,
}: {
  label: string;
  icon: string;
  variant?: 'danger';
  onClick: () => void;
}) {
  const color = variant === 'danger' ? '#B91C1C' : theme.colors.textPrimary;
  return (
    <button
      onClick={onClick}
      role='menuitem'
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        fontSize: theme.typography.fontSize.sm,
        color,
        width: '100%',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          variant === 'danger' ? '#FEF2F2' : '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon
        name={icon}
        size={15}
        color={variant === 'danger' ? '#B91C1C' : '#64748B'}
      />
      {label}
    </button>
  );
}
