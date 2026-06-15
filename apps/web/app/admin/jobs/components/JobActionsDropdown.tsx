'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { AdminJobTrackingModal } from './AdminJobTrackingModal';

export function ActionsDropdown({
  jobId,
  jobStatus,
  onJobCancelled,
}: {
  jobId: string;
  jobStatus: string;
  onJobCancelled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCancelJob = async () => {
    setCancelling(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel job');
      }
      toast.success('Job cancelled successfully');
      setConfirmCancel(false);
      setOpen(false);
      onJobCancelled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  };

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
          {(jobStatus === 'assigned' || jobStatus === 'in_progress') && (
            <DropdownButton
              label='Live Tracking'
              icon='mapPin'
              onClick={() => {
                setOpen(false);
                setTrackingOpen(true);
              }}
            />
          )}
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
              onClick={() => {
                setOpen(false);
                setConfirmCancel(true);
              }}
            />
          )}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {confirmCancel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => !cancelling && setConfirmCancel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: theme.borderRadius.xl,
              padding: '24px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#1E293B',
              }}
            >
              Cancel this job?
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                marginBottom: '20px',
              }}
            >
              This will cancel the job and notify all parties. This action
              cannot be undone.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.borderRadius.md,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Keep Job
              </button>
              <button
                onClick={handleCancelJob}
                disabled={cancelling}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.borderRadius.md,
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  cursor: cancelling ? 'wait' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: cancelling ? 0.7 : 1,
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingOpen && (
        <AdminJobTrackingModal
          jobId={jobId}
          onClose={() => setTrackingOpen(false)}
        />
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
