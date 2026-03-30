'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import {
  DisputesTable,
  formatCurrency,
  type Dispute,
  type Stats,
  type Pagination,
  type StatusFilter,
  type Resolution,
} from './DisputesTable';
import { ResolveDisputeDialog } from './ResolveDisputeDialog';
import { DisputesPageHeader } from './DisputesPageHeader';

export function DisputesClient() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<Stats>({
    open: 0,
    reviewing: 0,
    resolved: 0,
    totalAmountAtRisk: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolution, setResolution] = useState<Resolution>('pay_contractor');
  const [resolveNotes, setResolveNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const fetchDisputes = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });
        if (statusFilter !== 'all') params.append('status', statusFilter);

        const response = await fetch(
          `/api/admin/disputes?${params.toString()}`,
          {
            credentials: 'include',
          }
        );
        if (!response.ok) throw new Error('Failed to fetch disputes');
        const data = await response.json();
        setDisputes(data.data ?? []);
        setStats(
          data.stats ?? {
            open: 0,
            reviewing: 0,
            resolved: 0,
            totalAmountAtRisk: 0,
          }
        );
        setPagination(
          data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }
        );
      } catch (error) {
        logger.error('Error fetching disputes:', error);
        setErrorDialog({
          open: true,
          message: 'Failed to load disputes. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchDisputes(1);
  }, [fetchDisputes]);

  useEffect(() => {
    const interval = setInterval(() => fetchDisputes(pagination.page), 30000);
    return () => clearInterval(interval);
  }, [fetchDisputes, pagination.page]);

  const handleResolve = async () => {
    if (!selectedDispute) return;
    setActionLoading(true);
    try {
      const csrfHeaders = await getCsrfHeaders();

      const endpoint =
        resolution === 'refund_homeowner'
          ? '/api/admin/escrow/reject'
          : '/api/admin/escrow/approve';

      const body =
        resolution === 'refund_homeowner'
          ? {
              escrowId: selectedDispute.id,
              reason: resolveNotes || 'Dispute resolved: refund to homeowner',
            }
          : {
              escrowId: selectedDispute.id,
              notes:
                resolveNotes ||
                `Dispute resolved: ${resolution.replace(/_/g, ' ')}`,
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Action failed' }));
        throw new Error(errorData.error || 'Failed to resolve dispute');
      }

      setResolveDialog(false);
      setSelectedDispute(null);
      setResolveNotes('');
      await fetchDisputes(pagination.page);
    } catch (error) {
      logger.error('Error resolving dispute:', error);
      setErrorDialog({ open: true, message: (error as Error).message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleHoldForReview = async (dispute: Dispute) => {
    setActionLoading(true);
    try {
      const csrfHeaders = await getCsrfHeaders();

      const response = await fetch('/api/admin/escrow/hold', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({
          escrowId: dispute.id,
          reason: 'Escalated from disputes dashboard for detailed review',
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Action failed' }));
        throw new Error(errorData.error || 'Failed to hold escrow');
      }

      await fetchDisputes(pagination.page);
    } catch (error) {
      logger.error('Error holding dispute:', error);
      setErrorDialog({ open: true, message: (error as Error).message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: theme.spacing[8],
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <DisputesPageHeader
        stats={stats}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Disputes Table */}
      <AdminCard padding='none' className='overflow-hidden'>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: theme.spacing[8],
            }}
          >
            <Spinner size='lg' />
          </div>
        ) : disputes.length === 0 ? (
          <div
            style={{
              padding: '64px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon name='checkCircle' size={32} color='#22c55e' />
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: theme.colors.textPrimary,
                marginBottom: 4,
              }}
            >
              No Disputes Found
            </h3>
            <p
              style={{
                fontSize: 14,
                color: theme.colors.textSecondary,
                maxWidth: 384,
              }}
            >
              {statusFilter === 'all'
                ? 'There are currently no escalated escrow disputes. Disputes appear when escrow transactions are flagged for admin review.'
                : `No disputes with "${statusFilter}" status.`}
            </p>
          </div>
        ) : (
          <>
            <DisputesTable
              disputes={disputes}
              actionLoading={actionLoading}
              onHoldForReview={handleHoldForReview}
              onResolve={(dispute) => {
                setSelectedDispute(dispute);
                setResolveDialog(true);
              }}
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: theme.spacing[4],
                  borderTop: `1px solid ${theme.colors.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{' '}
                  of {pagination.total} disputes
                </div>
                <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                  <Button
                    variant='secondary'
                    onClick={() => fetchDisputes(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='secondary'
                    onClick={() => fetchDisputes(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* Resolve Dialog */}
      <ResolveDisputeDialog
        open={resolveDialog}
        selectedDispute={selectedDispute}
        resolution={resolution}
        resolveNotes={resolveNotes}
        actionLoading={actionLoading}
        onOpenChange={(open) => {
          setResolveDialog(open);
          if (!open) {
            setSelectedDispute(null);
            setResolveNotes('');
          }
        }}
        onResolutionChange={setResolution}
        onNotesChange={setResolveNotes}
        onResolve={handleResolve}
      />

      {/* Error Dialog */}
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: theme.colors.error }}>
              Error
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
