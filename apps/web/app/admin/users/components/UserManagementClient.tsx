'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { UserDetailDialog } from './UserDetailDialog';
import { BulkActionDialog } from './BulkActionDialog';
import toast from 'react-hot-toast';
import { UserManagementFilters } from './UserManagementFilters';
import { UserManagementTable } from './UserManagementTable';
import type { User, Pagination } from './UserManagementTypes';
import { logger } from '@mintenance/shared';

interface UserManagementClientProps {
  initialUsers: User[];
  initialPagination: Pagination;
}

export function UserManagementClient({
  initialUsers,
  initialPagination,
}: UserManagementClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'contractor' | 'homeowner'
  >('all');
  const [verifiedFilter, setVerifiedFilter] = useState<
    'all' | 'verified' | 'pending' | 'false'
  >('all');
  const [excludeTestUsers, setExcludeTestUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState<
    'approve' | 'reject' | null
  >(null);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const fetchUsers = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);
        if (search.trim()) params.append('search', search.trim());
        if (excludeTestUsers) params.append('excludeTestUsers', 'true');

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (error) {
        logger.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, verifiedFilter, excludeTestUsers]
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, verifiedFilter, excludeTestUsers, fetchUsers]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = users
        .filter(
          (u) => u.role === 'contractor' && u.verificationStatus === 'pending'
        )
        .map((u) => u.id);
      setSelectedUserIds(new Set(ids));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) newSelected.add(userId);
    else newSelected.delete(userId);
    setSelectedUserIds(newSelected);
  };

  const handleBulkAction = async (
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    if (selectedUserIds.size === 0) return;
    if (action === 'reject' && !reason?.trim()) {
      alert('Reason is required when rejecting verifications');
      return;
    }
    setBulkActionLoading(true);
    try {
      const csrfRes = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      const { token: csrfToken } = csrfRes.ok
        ? await csrfRes.json()
        : { token: '' };
      if (csrfToken) await new Promise((r) => setTimeout(r, 50));
      const response = await fetch('/api/admin/users/bulk-verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          action,
          reason: action === 'reject' ? reason : undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to perform bulk action');
      }
      const result = await response.json();
      toast.success(
        `Bulk ${action} completed: ${result.results.successful} successful, ${result.results.failed} failed`
      );
      setSelectedUserIds(new Set());
      setShowBulkActionModal(null);
      setBulkRejectReason('');
      fetchUsers(pagination.page);
    } catch (error) {
      logger.error('Error performing bulk action:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to perform bulk action'
      );
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(verifiedFilter !== 'all' && { verified: verifiedFilter }),
        ...(search.trim() && { search: search.trim() }),
      });
      const response = await fetch(
        `/api/admin/users/export?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to export users');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting users:', error);
      alert('Failed to export users');
    }
  };

  const pendingContractors = users.filter(
    (u) => u.role === 'contractor' && u.verificationStatus === 'pending'
  );
  const allSelected =
    pendingContractors.length > 0 &&
    pendingContractors.every((u) => selectedUserIds.has(u.id));
  const someSelected = selectedUserIds.size > 0 && !allSelected;
  const totalUsers = users.length;
  const totalContractors = users.filter((u) => u.role === 'contractor').length;
  const pendingCount = users.filter(
    (u) => u.verificationStatus === 'pending'
  ).length;

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            User Management
          </h2>
          <p className='text-[#566166] text-lg mt-2'>
            Manage platform users, view profiles, and verify contractors.
          </p>
        </div>
        <div className='flex gap-3'>
          <button
            onClick={() => handleExport('csv')}
            className='px-5 py-2.5 bg-[#e1e9ee] text-[#2a3439] rounded-xl font-medium text-sm hover:bg-[#d9e4ea] transition-all flex items-center gap-2'
          >
            <Icon name='download' size={16} color='#565e74' /> Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-medium text-sm hover:brightness-110 transition-all flex items-center gap-2 shadow-sm'
          >
            <Icon name='download' size={16} color='#fff' /> Export PDF
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
        <AdminMetricCard
          label='Total Users'
          value={totalUsers}
          icon='users'
          iconColor='#565e74'
        />
        <AdminMetricCard
          label='Contractors'
          value={totalContractors}
          icon='briefcase'
          iconColor='#506076'
        />
        <AdminMetricCard
          label='Pending Verification'
          value={pendingCount}
          icon='clock'
          iconColor='#605c78'
        />
      </div>

      {/* Filters */}
      <div className='bg-white rounded-[1.5rem] p-4'>
        <UserManagementFilters
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          verifiedFilter={verifiedFilter}
          onVerifiedFilterChange={setVerifiedFilter}
          excludeTestUsers={excludeTestUsers}
          onExcludeTestUsersChange={setExcludeTestUsers}
          selectedCount={selectedUserIds.size}
          bulkActionLoading={bulkActionLoading}
          onBulkApprove={() => setShowBulkActionModal('approve')}
          onBulkReject={() => setShowBulkActionModal('reject')}
          onClearSelection={() => setSelectedUserIds(new Set())}
        />
      </div>

      {/* Table */}
      <div className='bg-white rounded-[1.5rem] overflow-hidden shadow-[0_12px_32px_-4px_rgba(42,52,57,0.04)] border border-[#a9b4b9]/10'>
        <UserManagementTable
          users={users}
          loading={loading}
          pagination={pagination}
          selectedUserIds={selectedUserIds}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={handleSelectAll}
          onSelectUser={handleSelectUser}
          onViewDetails={(userId) => {
            setSelectedUserId(userId);
            setShowDetailModal(true);
          }}
          onPageChange={fetchUsers}
        />
      </div>

      {selectedUserId && (
        <UserDetailDialog
          open={showDetailModal}
          onOpenChange={(open: boolean) => {
            setShowDetailModal(open);
            if (!open) setSelectedUserId(null);
          }}
          userId={selectedUserId || ''}
          onVerificationUpdate={() => fetchUsers(pagination.page)}
        />
      )}

      <BulkActionDialog
        open={!!showBulkActionModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowBulkActionModal(null);
            setBulkRejectReason('');
          }
        }}
        action={showBulkActionModal}
        selectedCount={selectedUserIds.size}
        onConfirm={handleBulkAction}
        loading={bulkActionLoading}
      />
    </div>
  );
}
