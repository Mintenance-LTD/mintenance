'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
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

import type {
  ContractorVerification,
  Stats,
  StatusFilter,
  VerificationClientProps,
} from './types';
import {
  ContractorVerificationCard,
  getDisplayName,
} from './ContractorVerificationCard';
import { RejectDialog } from './RejectDialog';
import {
  VerificationPageHeader,
  VerificationSearchAndFilters,
} from './VerificationFilters';

// ── Fetch functions ───────────────────────────────────────────────

async function fetchContractors(params: {
  filterStatus: StatusFilter;
  search: string;
}): Promise<ContractorVerification[]> {
  const searchParams = new URLSearchParams({ status: params.filterStatus });
  if (params.search.trim()) searchParams.append('search', params.search.trim());

  const response = await fetch(
    `/api/admin/verifications?${searchParams.toString()}`,
    { credentials: 'include' }
  );
  if (!response.ok) throw new Error('Failed to fetch contractors');
  const data = await response.json();
  return data.data || [];
}

async function fetchVerificationStats(): Promise<Stats> {
  const statuses: StatusFilter[] = ['pending', 'verified', 'rejected', 'all'];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const response = await fetch(
        `/api/admin/verifications?status=${status}&limit=1`,
        { credentials: 'include' }
      );
      if (!response.ok) return 0;
      const data = await response.json();
      return data.total ?? 0;
    })
  );
  return {
    pending: results[0],
    verified: results[1],
    rejected: results[2],
    total: results[3],
  };
}

// ── Component ──────────────────────────────────────────────────────

export function VerificationClient({ initialStats }: VerificationClientProps) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Reject dialog state
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    contractorId: string | null;
    contractorName: string;
  }>({ open: false, contractorId: null, contractorName: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Error/success state
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debounce search
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  // ── Data Fetching via React Query ─────────────────────────────

  const { data: contractors = [], isLoading: loading } = useQuery<
    ContractorVerification[]
  >({
    queryKey: [
      'admin',
      'verifications',
      'list',
      { filterStatus, search: debouncedSearch },
    ],
    queryFn: () => fetchContractors({ filterStatus, search: debouncedSearch }),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    meta: {
      onError: (err: unknown) => {
        logger.error('Error fetching contractor verifications', err, {
          service: 'admin-verifications',
        });
      },
    },
  });

  const { data: stats = initialStats } = useQuery<Stats>({
    queryKey: ['admin', 'verifications', 'stats'],
    queryFn: fetchVerificationStats,
    initialData: initialStats,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    meta: {
      onError: (err: unknown) => {
        logger.error('Error fetching verification stats', err, {
          service: 'admin-verifications',
        });
      },
    },
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
  }, [queryClient]);

  // ── Actions ────────────────────────────────────────────────────

  const handleApprove = async (contractor: ContractorVerification) => {
    setActionLoading(contractor.id);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(
        `/api/admin/verifications/${contractor.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders,
          },
          body: JSON.stringify({ status: 'verified' }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to approve contractor');
      }

      setSuccessMessage(
        `${contractor.first_name ?? ''} ${contractor.last_name ?? contractor.email} has been verified.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      invalidateAll();
    } catch (error) {
      setErrorDialog({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to approve contractor',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.contractorId) return;
    if (!rejectReason.trim()) {
      setErrorDialog({
        open: true,
        message: 'A reason is required when rejecting.',
      });
      return;
    }

    setActionLoading(rejectDialog.contractorId);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(
        `/api/admin/verifications/${rejectDialog.contractorId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders,
          },
          body: JSON.stringify({
            status: 'rejected',
            reason: rejectReason.trim(),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reject contractor');
      }

      setSuccessMessage(`${rejectDialog.contractorName} has been rejected.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setRejectDialog({ open: false, contractorId: null, contractorName: '' });
      setRejectReason('');
      invalidateAll();
    } catch (error) {
      setErrorDialog({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to reject contractor',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className='p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen flex flex-col gap-6'>
      <VerificationPageHeader stats={stats} />

      <VerificationSearchAndFilters
        stats={stats}
        filterStatus={filterStatus}
        search={search}
        successMessage={successMessage}
        onFilterChange={setFilterStatus}
        onSearchChange={handleSearchChange}
      />

      {/* Contractors List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        {loading && contractors.length === 0 ? (
          <AdminCard padding='lg'>
            <div
              style={{
                textAlign: 'center',
                padding: theme.spacing[8],
                color: theme.colors.textSecondary,
              }}
            >
              <Icon name='loader' size={32} className='animate-spin' />
              <p style={{ marginTop: theme.spacing[3] }}>
                Loading contractors...
              </p>
            </div>
          </AdminCard>
        ) : contractors.length === 0 ? (
          <AdminCard padding='lg'>
            <div
              style={{
                textAlign: 'center',
                padding: theme.spacing[8],
                color: theme.colors.textSecondary,
              }}
            >
              <Icon name='users' size={48} color={theme.colors.border} />
              <p
                style={{
                  marginTop: theme.spacing[4],
                  fontSize: theme.typography.fontSize.base,
                }}
              >
                No contractors found{' '}
                {filterStatus !== 'all' ? `with "${filterStatus}" status` : ''}
              </p>
            </div>
          </AdminCard>
        ) : (
          contractors.map((contractor) => (
            <ContractorVerificationCard
              key={contractor.id}
              contractor={contractor}
              actionLoading={actionLoading}
              onApprove={handleApprove}
              onReject={(c) =>
                setRejectDialog({
                  open: true,
                  contractorId: c.id,
                  contractorName: getDisplayName(c),
                })
              }
            />
          ))
        )}
      </div>

      {/* Reject Reason Dialog */}
      <RejectDialog
        open={rejectDialog.open}
        contractorName={rejectDialog.contractorName}
        rejectReason={rejectReason}
        actionLoading={actionLoading}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({
              open: false,
              contractorId: null,
              contractorName: '',
            });
            setRejectReason('');
          }
        }}
        onRejectReasonChange={setRejectReason}
        onConfirmReject={handleReject}
        onCancel={() => {
          setRejectDialog({
            open: false,
            contractorId: null,
            contractorName: '',
          });
          setRejectReason('');
        }}
      />

      {/* Error Dialog */}
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open: boolean) =>
          setErrorDialog({ ...errorDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setErrorDialog({ open: false, message: '' })}
            >
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
