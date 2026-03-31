'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { Icon } from '@/components/ui/Icon';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { EscrowTable } from './EscrowTable';
import { ActionModal } from './ActionModal';

interface EscrowStats {
  held_total: number;
  held_count: number;
  release_pending_count: number;
  refunded_total: number;
  refunded_count: number;
  failed_count: number;
}

export interface EscrowRecord {
  id: string;
  job_id: string;
  amount: number;
  status: string;
  payment_intent_id: string | null;
  transfer_id: string | null;
  platform_fee: number | null;
  contractor_payout: number | null;
  release_reason: string | null;
  created_at: string;
  updated_at: string;
  released_at: string | null;
  jobs: {
    id: string;
    title: string;
    status: string;
    homeowner_id: string;
    contractor_id: string;
    homeowner: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
    contractor: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  };
}

type ActionType = 'release' | 'refund' | 'hold';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'held', label: 'Held' },
  { key: 'release_pending', label: 'Pending Release' },
  { key: 'released', label: 'Completed' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'failed', label: 'Failed' },
] as const;

export function RefundManagementClient() {
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [stats, setStats] = useState<EscrowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: ActionType;
    escrow: EscrowRecord | null;
  }>({ open: false, type: 'release', escrow: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Error dialog
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: '',
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/refunds?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEscrows(data.data || []);
      setStats(data.stats || null);
    } catch {
      setErrorDialog({
        open: true,
        message: 'Failed to load escrow transactions',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openAction = (type: ActionType, escrow: EscrowRecord) => {
    setActionModal({ open: true, type, escrow });
  };

  const handleAction = async (reason: string, refundAmount?: number) => {
    if (!actionModal.escrow) return;
    setActionLoading(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/admin/refunds/${actionModal.escrow.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          action: actionModal.type,
          reason,
          refundAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Action failed', type: 'error' });
      } else {
        setToast({
          message: data.message || 'Action completed',
          type: 'success',
        });
        setActionModal({ open: false, type: 'release', escrow: null });
        fetchData();
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='flex flex-col gap-1'>
        <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
          Refund &amp; Payouts
        </h2>
        <p className='text-[#566166] text-lg max-w-2xl'>
          Monitor and manage the flow of funds within the escrow ecosystem.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[8],
          }}
        >
          <AdminMetricCard
            label='Held in Escrow'
            value={formatCurrency(stats.held_total)}
            icon='lock'
            iconColor={theme.colors.warning}
          />
          <AdminMetricCard
            label='Pending Release'
            value={stats.release_pending_count}
            icon='clock'
            iconColor={theme.colors.info}
          />
          <AdminMetricCard
            label='Total Refunded'
            value={formatCurrency(stats.refunded_total)}
            icon='undo'
            iconColor='#8b5cf6'
          />
          <AdminMetricCard
            label='Failed'
            value={stats.failed_count}
            icon='alert'
            iconColor={theme.colors.error}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: theme.spacing[4] }}>
        <input
          type='text'
          placeholder='Search by job title...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Search escrow transactions by job title'
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.sm,
            width: '100%',
            maxWidth: '400px',
            color: theme.colors.textPrimary,
            backgroundColor: 'white',
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[2],
          marginBottom: theme.spacing[4],
          flexWrap: 'wrap',
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid',
              borderColor:
                activeTab === tab.key
                  ? theme.colors.primary
                  : theme.colors.border,
              backgroundColor:
                activeTab === tab.key ? theme.colors.primary : 'white',
              color: activeTab === tab.key ? 'white' : theme.colors.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role='alert'
          style={{
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing[4],
            backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon
            name={toast.type === 'success' ? 'checkCircle' : 'alert'}
            size={16}
          />
          {toast.message}
        </div>
      )}

      {/* Table */}
      <EscrowTable
        escrows={escrows}
        loading={loading}
        onRelease={(e) => openAction('release', e)}
        onRefund={(e) => openAction('refund', e)}
        onHold={(e) => openAction('hold', e)}
      />

      {/* Action Modal */}
      <ActionModal
        open={actionModal.open}
        type={actionModal.type}
        escrow={actionModal.escrow}
        loading={actionLoading}
        onClose={() =>
          setActionModal({ open: false, type: 'release', escrow: null })
        }
        onConfirm={handleAction}
        formatCurrency={formatCurrency}
      />

      {/* Error Dialog */}
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ open, message: '' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
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
