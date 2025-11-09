'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerificationBadge } from './VerificationBadge';
import { UserDetailDialog } from './UserDetailDialog';
import { BulkActionDialog } from './BulkActionDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'contractor' | 'homeowner' | 'admin';
  company_name?: string | null;
  admin_verified?: boolean;
  created_at: string;
  updated_at: string;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'not_submitted' | 'not_applicable';
  hasVerificationData?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState<'approve' | 'reject' | null>(null);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const fetchUsers = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      if (verifiedFilter !== 'all') {
        params.append('verified', verifiedFilter);
      }

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, verifiedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [search, roleFilter, verifiedFilter, fetchUsers]);

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setShowDetailModal(true);
  };

  const handleVerificationUpdate = () => {
    fetchUsers(pagination.page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    if (user.company_name) {
      return user.company_name;
    }
    return user.email.split('@')[0];
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const contractorIds = users
        .filter(u => u.role === 'contractor' && u.verificationStatus === 'pending')
        .map(u => u.id);
      setSelectedUserIds(new Set(contractorIds));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
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
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          action,
          reason: action === 'reject' ? reason : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform bulk action');
      }

      const result = await response.json();
      alert(`Bulk ${action} completed: ${result.results.successful} successful, ${result.results.failed} failed`);
      
      setSelectedUserIds(new Set());
      setShowBulkActionModal(null);
      setBulkRejectReason('');
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Error performing bulk action:', error);
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
      if (!response.ok) {
        throw new Error('Failed to export users');
      }

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
      console.error('Error exporting users:', error);
      alert('Failed to export users');
    }
  };

  const pendingContractors = users.filter(u => u.role === 'contractor' && u.verificationStatus === 'pending');
  const allSelected = pendingContractors.length > 0 && pendingContractors.every(u => selectedUserIds.has(u.id));
  const someSelected = selectedUserIds.size > 0 && !allSelected;

  const totalUsers = users.length;
  const totalContractors = users.filter(u => u.role === 'contractor').length;
  const totalHomeowners = users.filter(u => u.role === 'homeowner').length;
  const pendingCount = users.filter(u => u.verificationStatus === 'pending').length;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: theme.spacing[6],
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
    }}>
      <AdminPageHeader
        title="User Management"
        subtitle="Manage platform users, view profiles, and verify contractors"
        quickStats={[
          {
            label: 'total',
            value: totalUsers,
            icon: 'users',
            color: theme.colors.primary,
          },
          {
            label: 'contractors',
            value: totalContractors,
            icon: 'briefcase',
            color: theme.colors.info,
          },
          {
            label: 'pending',
            value: pendingCount,
            icon: 'clock',
            color: '#F59E0B',
          },
        ]}
        actions={
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            <Button
              variant="secondary"
              onClick={() => handleExport('csv')}
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              <Icon name="download" size={16} /> Export CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              <Icon name="download" size={16} /> Export PDF
            </Button>
          </div>
        }
      />

      {/* Filters and Actions */}
      <Card style={{ padding: theme.spacing[6] }}>
        {/* Search */}
        <div style={{ marginBottom: theme.spacing[4] }}>
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="search" size={20} color={theme.colors.textSecondary} />}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[4] }}>
          {/* Role Filters */}
          <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
            {(['all', 'contractor', 'homeowner'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: roleFilter === role ? theme.colors.primary : theme.colors.backgroundSecondary,
                  color: roleFilter === role ? theme.colors.white : theme.colors.textPrimary,
                }}
                onMouseEnter={(e) => {
                  if (roleFilter !== role) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (roleFilter !== role) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
              >
                {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>

          {/* Verification Filters */}
          <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
            {(['all', 'verified', 'pending', 'false'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setVerifiedFilter(status)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: verifiedFilter === status 
                    ? (status === 'pending' ? '#F59E0B' : status === 'verified' ? theme.colors.success : theme.colors.primary)
                    : theme.colors.backgroundSecondary,
                  color: verifiedFilter === status ? theme.colors.white : theme.colors.textPrimary,
                }}
                onMouseEnter={(e) => {
                  if (verifiedFilter !== status) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (verifiedFilter !== status) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
              >
                {status === 'all' ? 'All Status' : status === 'false' ? 'Not Verified' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedUserIds.size > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            marginTop: theme.spacing[4],
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
            }}>
              {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: theme.spacing[2], marginLeft: 'auto' }}>
              <Button
                variant="primary"
                onClick={() => setShowBulkActionModal('approve')}
                disabled={bulkActionLoading}
                style={{ fontSize: theme.typography.fontSize.sm }}
              >
                <Icon name="checkCircle" size={16} /> Approve Selected
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowBulkActionModal('reject')}
                disabled={bulkActionLoading}
                style={{ fontSize: theme.typography.fontSize.sm }}
              >
                <Icon name="xCircle" size={16} /> Reject Selected
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedUserIds(new Set())}
                style={{ fontSize: theme.typography.fontSize.sm }}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

      </Card>

      {/* Users Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing[8] }}>
            <Icon name="loader" size={32} className="animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>
            No users found matching your criteria
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>
                    <th style={{
                      padding: theme.spacing[3],
                      textAlign: 'left',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                      width: '40px',
                    }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{
                      padding: theme.spacing[3],
                      textAlign: 'left',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                    }}>
                      User
                    </th>
                    <th style={{
                      padding: theme.spacing[3],
                      textAlign: 'left',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                    }}>
                      Role
                    </th>
                    <th style={{
                      padding: theme.spacing[3],
                      textAlign: 'left',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                    }}>
                      Verification
                    </th>
                    <th style={{
                      padding: theme.spacing[3],
                      textAlign: 'left',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                    }}>
                      Registered
                    </th>
                    <th style={{
                      padding: theme.spacing[3],
                      textAlign: 'right',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isContractorPending = user.role === 'contractor' && user.verificationStatus === 'pending';
                    const isSelected = selectedUserIds.has(user.id);
                    
                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: `1px solid ${theme.colors.border}`,
                          transition: 'background-color 0.2s',
                          backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <td style={{ padding: theme.spacing[3] }}>
                          {isContractorPending && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                        </td>
                        <td style={{ padding: theme.spacing[3] }}>
                        <div>
                          <div style={{
                            fontSize: theme.typography.fontSize.base,
                            fontWeight: theme.typography.fontWeight.medium,
                            color: theme.colors.textPrimary,
                          }}>
                            {getUserDisplayName(user)}
                          </div>
                          <div style={{
                            fontSize: theme.typography.fontSize.sm,
                            color: theme.colors.textSecondary,
                            marginTop: theme.spacing[1],
                          }}>
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing[3] }}>
                        <span style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: theme.colors.backgroundSecondary,
                          borderRadius: theme.borderRadius.md,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          color: theme.colors.textPrimary,
                          textTransform: 'capitalize',
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing[3] }}>
                        <VerificationBadge status={user.verificationStatus} size="sm" />
                      </td>
                      <td style={{ padding: theme.spacing[3], fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                        {formatDate(user.created_at)}
                      </td>
                      <td style={{ padding: theme.spacing[3], textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          onClick={() => handleViewDetails(user.id)}
                          style={{ padding: `${theme.spacing[1]} ${theme.spacing[2]}` }}
                        >
                          <Icon name="eye" size={16} /> View
                        </Button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: theme.spacing[4],
                borderTop: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                </div>
                <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                  <Button
                    variant="secondary"
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* User Detail Dialog */}
      {selectedUserId && (
        <UserDetailDialog
          open={showDetailModal}
        onOpenChange={(open: boolean) => {
          setShowDetailModal(open);
          if (!open) {
            setSelectedUserId(null);
          }
        }}
          userId={selectedUserId || ''}
          onVerificationUpdate={handleVerificationUpdate}
        />
      )}

      {/* Bulk Action Dialog */}
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

