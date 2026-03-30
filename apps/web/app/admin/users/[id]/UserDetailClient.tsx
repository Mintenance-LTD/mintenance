'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
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
import { logger } from '@mintenance/shared';
import type { UserDetail, Tab } from './UserDetailTypes';
import { formatCurrency } from './UserDetailTypes';
import {
  ActivityTab,
  JobsTab,
  PaymentsTab,
  ReviewsTab,
} from './UserDetailTabs';
import { UserDetailHeader } from './UserDetailHeader';

// ── Component ───────────────────────────────────────────────────────

interface UserDetailClientProps {
  userId: string;
}

export function UserDetailClient({ userId }: UserDetailClientProps) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: '', description: '', action: async () => {} });

  const fetchUserDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/admin/users/${userId}/detail`, {
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch user' }));
        throw new Error(errorData.error || 'Failed to fetch user details');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Request timed out. Please try again.');
      } else {
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to load user details'
        );
      }
      logger.error('Error fetching user detail:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  const performAdminAction = async (
    endpoint: string,
    body: Record<string, unknown>
  ) => {
    setActionLoading(true);
    try {
      const csrfRes = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      const { token: csrfToken } = csrfRes.ok
        ? await csrfRes.json()
        : { token: '' };

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Action failed' }));
        throw new Error(errorData.error || 'Action failed');
      }

      await fetchUserDetail();
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = () => {
    setConfirmDialog({
      open: true,
      title: 'Verify User',
      description:
        'Are you sure you want to verify this user? This will grant them verified status on the platform.',
      action: () =>
        performAdminAction(`/api/admin/users/${userId}/verify`, {
          action: 'approve',
        }),
    });
  };

  const handleUnverify = () => {
    setConfirmDialog({
      open: true,
      title: 'Remove Verification',
      description:
        'Are you sure you want to remove verification from this user?',
      action: () =>
        performAdminAction(`/api/admin/users/${userId}/verify`, {
          action: 'reject',
          reason: 'Verification revoked by admin',
        }),
    });
  };

  // ── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          padding: theme.spacing[8],
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: theme.spacing[16],
          }}
        >
          <Spinner size='lg' />
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────
  if (errorMsg || !data) {
    return (
      <div
        style={{
          padding: theme.spacing[8],
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        <AdminCard padding='lg'>
          <div style={{ textAlign: 'center', padding: theme.spacing[8] }}>
            <Icon name='alert' size={48} color='#EF4444' />
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#0F172A',
                marginTop: 16,
              }}
            >
              {errorMsg || 'User not found'}
            </h3>
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                gap: theme.spacing[3],
                justifyContent: 'center',
              }}
            >
              <Button onClick={fetchUserDetail}>Try Again</Button>
              <Link href='/admin/users'>
                <Button variant='secondary'>Back to Users</Button>
              </Link>
            </div>
          </div>
        </AdminCard>
      </div>
    );
  }

  const { profile, stats } = data;
  const displayName =
    `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
    profile.companyName ||
    profile.email.split('@')[0];

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'activity', label: 'Activity', count: data.activity.length },
    {
      value: 'jobs',
      label: 'Jobs',
      count: data.recentJobs.length + data.contractorJobs.length,
    },
    { value: 'payments', label: 'Payments', count: data.paymentHistory.length },
    {
      value: 'reviews',
      label: 'Reviews',
      count: data.reviewsReceived.length + data.reviewsGiven.length,
    },
  ];

  return (
    <div
      style={{
        padding: theme.spacing[8],
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          marginBottom: theme.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}
      >
        <Link
          href='/admin/users'
          style={{ color: '#64748B', fontSize: '14px', textDecoration: 'none' }}
        >
          Users
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: 500 }}>
          {displayName}
        </span>
      </div>

      {/* User Header Card */}
      <UserDetailHeader
        data={data}
        actionLoading={actionLoading}
        onVerify={handleVerify}
        onUnverify={handleUnverify}
      />

      {/* Quick Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[6],
        }}
      >
        <AdminMetricCard
          label={profile.role === 'contractor' ? 'Jobs Done' : 'Jobs Posted'}
          value={
            profile.role === 'contractor'
              ? stats.jobsCompleted
              : stats.jobsPosted
          }
          icon='briefcase'
          iconColor={theme.colors.adminPrimary}
        />
        <AdminMetricCard
          label='Completed'
          value={stats.jobsCompleted}
          icon='checkCircle'
          iconColor={theme.colors.success}
        />
        {profile.role === 'contractor' && (
          <>
            <AdminMetricCard
              label='Bids Won'
              value={`${stats.bidsWon}/${stats.bidsSent}`}
              icon='target'
              iconColor='#8B5CF6'
            />
            <AdminMetricCard
              label='Avg Rating'
              value={stats.avgRating > 0 ? `${stats.avgRating}/5` : 'N/A'}
              icon='star'
              iconColor='#F59E0B'
              subtitle={`${stats.reviewCount} reviews`}
            />
          </>
        )}
        <AdminMetricCard
          label='Total Spent'
          value={formatCurrency(stats.totalSpent)}
          icon='currencyPound'
          iconColor='#EF4444'
        />
        <AdminMetricCard
          label='Total Earned'
          value={formatCurrency(stats.totalEarned)}
          icon='currencyPound'
          iconColor={theme.colors.success}
        />
      </div>

      {/* Tabs */}
      <AdminCard padding='none' className='overflow-hidden'>
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
                border: 'none',
                borderBottom:
                  activeTab === tab.value
                    ? `2px solid ${theme.colors.adminPrimary}`
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.value ? '#0F172A' : '#64748B',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
              aria-selected={activeTab === tab.value}
              role='tab'
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  style={{
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor:
                      activeTab === tab.value ? '#EFF6FF' : '#F1F5F9',
                    color:
                      activeTab === tab.value
                        ? theme.colors.adminPrimary
                        : '#64748B',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: theme.spacing[5] }}>
          {activeTab === 'activity' && <ActivityTab data={data} />}
          {activeTab === 'jobs' && <JobsTab data={data} />}
          {activeTab === 'payments' && <PaymentsTab data={data} />}
          {activeTab === 'reviews' && <ReviewsTab data={data} />}
        </div>
      </AdminCard>

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={confirmDialog.action} disabled={actionLoading}>
              {actionLoading ? <Spinner size='sm' /> : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
