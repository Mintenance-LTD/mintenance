'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { UserDetailDialog } from './UserDetailDialog';
import { BulkActionDialog } from './BulkActionDialog';
import { UserManagementFilters } from './UserManagementFilters';
import { UserManagementTable } from './UserManagementTable';
import type { User, Pagination } from './UserManagementTypes';
import { logger } from '@mintenance/shared';

interface UserManagementClientProps {
  initialUsers: User[];
  initialPagination: Pagination;
}

export function UserManagementClient({ initialUsers, initialPagination }: UserManagementClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'contractor' | 'homeowner'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'pending' | 'false'>('all');
  const [excludeTestUsers, setExcludeTestUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState<'approve' | 'reject' | null>(null);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const fetchUsers = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
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
  }, [search, roleFilter, verifiedFilter, excludeTestUsers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, verifiedFilter, excludeTestUsers, fetchUsers]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = users.filter(u => u.role === 'contractor' && u.verificationStatus === 'pending').map(u => u.id);
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

  const handleBulkAction = async (action: 'approve' | 'reject', reason?: string) => {
    if (selectedUserIds.size === 0) return;
    if (action === 'reject' && !reason?.trim()) {
      alert('Reason is required when rejecting verifications');
      return;
    }
    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/users/bulk-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds), action, reason: action === 'reject' ? reason : undefined }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to perform bulk action'); }
      const result = await response.json();
      alert(`Bulk ${action} completed: ${result.results.successful} successful, ${result.results.failed} failed`);
      setSelectedUserIds(new Set());
      setShowBulkActionModal(null);
      setBulkRejectReason('');
      fetchUsers(pagination.page);
    } catch (error) {
      logger.error('Error performing bulk action:', error);
      alert(error instanceof Error ? error.message : 'Failed to perform bulk action');
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
      const response = await fetch(`/api/admin/users/export?${params.toString()}`);
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

  const pendingContractors = users.filter(u => u.role === 'contractor' && u.verificationStatus === 'pending');
  const allSelected = pendingContractors.length > 0 && pendingContractors.every(u => selectedUserIds.has(u.id));
  const someSelected = selectedUserIds.size > 0 && !allSelected;
  const totalUsers = users.length;
  const totalContractors = users.filter(u => u.role === 'contractor').length;
  const pendingCount = users.filter(u => u.verificationStatus === 'pending').length;

  return (
    <div className="p-8 md:p-10 max-w[1440px] mx-auto bg-slate-50 min-h-screen flex flex-col gap-6">
      <AdminPageHeader
        title="User Management"
        subtitle="Manage platform users, view profiles, and verify contractors"
        quickStats={[
          { label: 'total', value: totalUsers, icon: 'users', color: theme.colors.primary },
          { label: 'contractors', value: totalContractors, icon: 'briefcase', color: theme.colors.info },
          { label: 'pending', value: pendingCount, icon: 'clock', color: '#F59E0B' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            <Button variant="secondary" onClick={() => handleExport('csv')} style={{ fontSize: theme.typography.fontSize.sm }}>
              <Icon name="download" size={16} /> Export CSV
            </Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')} style={{ fontSize: theme.typography.fontSize.sm }}>
              <Icon name="download" size={16} /> Export PDF
            </Button>
          </div>
        }
      />

      <AdminCard padding="lg">
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
      </AdminCard>

      <AdminCard padding="none" className="overflow-hidden">
        <UserManagementTable
          users={users}
          loading={loading}
          pagination={pagination}
          selectedUserIds={selectedUserIds}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={handleSelectAll}
          onSelectUser={handleSelectUser}
          onViewDetails={(userId) => { setSelectedUserId(userId); setShowDetailModal(true); }}
          onPageChange={fetchUsers}
        />
      </AdminCard>

      {selectedUserId && (
        <UserDetailDialog
          open={showDetailModal}
          onOpenChange={(open: boolean) => { setShowDetailModal(open); if (!open) setSelectedUserId(null); }}
          userId={selectedUserId || ''}
          onVerificationUpdate={() => fetchUsers(pagination.page)}
        />
      )}

      <BulkActionDialog
        open={!!showBulkActionModal}
        onOpenChange={(open) => { if (!open) { setShowBulkActionModal(null); setBulkRejectReason(''); } }}
        action={showBulkActionModal}
        selectedCount={selectedUserIds.size}
        onConfirm={handleBulkAction}
        loading={bulkActionLoading}
      />
    </div>
  );
}
