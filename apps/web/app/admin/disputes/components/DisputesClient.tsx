'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';
import { useDisputeActions } from './useDisputeActions';
import { logger } from '@mintenance/shared';
import {
  DisputesTable,
  type Dispute,
  type Stats,
  type Pagination,
  type StatusFilter,
  type Resolution,
} from './DisputesTable';
import { ResolveDisputeDialog } from './ResolveDisputeDialog';
import { DisputesPageHeader } from './DisputesPageHeader';

interface DisputesResponse {
  data: Dispute[];
  stats: Stats;
  pagination: Pagination;
}

async function fetchDisputes(params: {
  page: number;
  statusFilter: StatusFilter;
}): Promise<DisputesResponse> {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: '20',
  });
  if (params.statusFilter !== 'all')
    searchParams.append('status', params.statusFilter);

  const response = await fetch(
    `/api/admin/disputes?${searchParams.toString()}`,
    { credentials: 'include' }
  );
  if (!response.ok) throw new Error('Failed to fetch disputes');
  const data = await response.json();
  return {
    data: data.data ?? [],
    stats: data.stats ?? {
      open: 0,
      reviewing: 0,
      resolved: 0,
      totalAmountAtRisk: 0,
    },
    pagination: data.pagination ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };
}

export function DisputesClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolution, setResolution] = useState<Resolution>('pay_contractor');
  const [resolveNotes, setResolveNotes] = useState('');
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const queryKey = ['admin', 'disputes', { page, statusFilter }];

  const {
    data,
    isLoading: loading,
    isError,
    isFetching,
    refetch,
  } = useQuery<DisputesResponse>({
    queryKey,
    queryFn: () => fetchDisputes({ page, statusFilter }),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    placeholderData: (previousData) => previousData,
    meta: {
      onError: (err: unknown) => {
        logger.error('Error fetching disputes:', err);
      },
    },
  });

  const disputes = data?.data ?? [];
  const currentSelection = selectedDispute
    ? (disputes.find((dispute) => dispute.id === selectedDispute.id) ??
      selectedDispute)
    : null;
  const stats: Stats = data?.stats ?? {
    open: 0,
    reviewing: 0,
    resolved: 0,
    totalAmountAtRisk: 0,
  };
  const pagination: Pagination = data?.pagination ?? {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  const invalidateDisputes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
  }, [queryClient]);

  // Reset page when filter changes
  const handleStatusFilterChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const actions = useDisputeActions({
    onConfirmed: (kind) => {
      if (kind === 'resolve') {
        setResolveDialog(false);
        setSelectedDispute(null);
        setResolveNotes('');
      }
      invalidateDisputes();
    },
    onError: (message) => {
      invalidateDisputes();
      setErrorDialog({ open: true, message });
    },
  });
  const actionLoading = actions.loading || actions.requiresVerification;

  const handleResolve = () => {
    if (!selectedDispute || isError) return;
    void actions.submit({
      kind: 'resolve',
      body: {
        escrowId: selectedDispute.id,
        decision: currentSelection?.resolution?.decision ?? resolution,
        reason:
          currentSelection?.resolution?.reason ??
          (resolveNotes.trim() ||
            `Dispute resolved: ${resolution.replace(/_/g, ' ')}`),
      },
    });
  };

  const handleHoldForReview = (dispute: Dispute) => {
    if (isError) return;
    void actions.submit({
      kind: 'hold',
      body: {
        escrowId: dispute.id,
        reason: 'Escalated from disputes dashboard for detailed review',
      },
    });
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
        onStatusFilterChange={handleStatusFilterChange}
      />

      {/* Disputes Table */}
      {isError ? (
        <div role='alert'>
          <p>
            Unable to load current disputes and settlement decisions. Any
            displayed data may be out of date.
          </p>
          <Button onClick={() => void refetch()} disabled={isFetching}>
            Retry loading disputes
          </Button>
        </div>
      ) : null}
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
        ) : isError && !data ? null : disputes.length === 0 ? (
          <div
            role='status'
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
              actionLoading={actionLoading || isError}
              onHoldForReview={handleHoldForReview}
              onResolve={(dispute) => {
                setSelectedDispute(dispute);
                setResolution(dispute.resolution?.decision ?? 'pay_contractor');
                setResolveNotes(dispute.resolution?.reason ?? '');
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
                    onClick={() => setPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='secondary'
                    onClick={() => setPage(pagination.page + 1)}
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
        open={
          resolveDialog && !actions.requiresVerification && !errorDialog.open
        }
        selectedDispute={currentSelection}
        resolution={currentSelection?.resolution?.decision ?? resolution}
        resolveNotes={currentSelection?.resolution?.reason ?? resolveNotes}
        actionLoading={actionLoading || isError}
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

      {actions.requiresVerification ? (
        <MfaStepUpDialog
          onCancel={actions.cancelVerification}
          onSuccess={actions.resumeAfterVerification}
        />
      ) : null}

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
