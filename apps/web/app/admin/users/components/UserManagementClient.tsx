'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerificationBadge } from './VerificationBadge';
import { UserDetailDialog } from './UserDetailDialog';
import { BulkActionDialog } from './BulkActionDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { logger } from '@mintenance/shared';

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
  isTestUser?: boolean;
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
  const [excludeTestUsers, setExcludeTestUsers] = useState(true); // Default to excluding test users
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

      if (excludeTestUsers) {
        params.append('excludeTestUsers', 'true');
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

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
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [search, roleFilter, verifiedFilter, excludeTestUsers, fetchUsers]);

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

  const getUserInitials = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    }
    if (user.company_name) {
      return user.company_name.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
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
      logger.error('Error exporting users:', error);
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
    <div className="p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen flex flex-col gap-6">
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
      <AdminCard padding="lg">
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

          {/* Test Users Filter */}
          <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button
              onClick={() => setExcludeTestUsers(!excludeTestUsers)}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: excludeTestUsers ? '#10B981' : theme.colors.backgroundSecondary,
                color: excludeTestUsers ? theme.colors.white : theme.colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
              onMouseEnter={(e) => {
                if (!excludeTestUsers) {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }
              }}
              onMouseLeave={(e) => {
                if (!excludeTestUsers) {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }
              }}
            >
              <Icon 
                name={excludeTestUsers ? 'checkCircle' : 'filter'} 
                size={16} 
                color={excludeTestUsers ? theme.colors.white : theme.colors.textPrimary} 
              />
              {excludeTestUsers ? 'Hide Test Users' : 'Show Test Users'}
            </button>
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

      </AdminCard>

      {/* Users Table */}
      <AdminCard padding="none" className="overflow-hidden">
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
            <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC' }}>
                  <tr>
                    <th style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: '48px',
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                    }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{
                          cursor: 'pointer',
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: '2px solid #CBD5E1',
                          accentColor: '#4A67FF',
                        }}
                        className="rounded-md"
                      />
                    </th>
                    <th style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                    }}>
                      User
                    </th>
                    <th style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                    }}>
                      Role
                    </th>
                    <th style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                    }}>
                      Verification
                    </th>
                    <th style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                    }}>
                      Registered
                    </th>
                    <th style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const isContractorPending = user.role === 'contractor' && user.verificationStatus === 'pending';
                    const isSelected = selectedUserIds.has(user.id);
                    const isEvenRow = index % 2 === 0;
                    const initials = getUserInitials(user);
                    
                    return (
                      <tr
                        key={user.id}
                        style={{
                          height: '72px',
                          transition: 'all 0.2s ease',
                          backgroundColor: isSelected 
                            ? '#EFF6FF' 
                            : isEvenRow 
                              ? '#FFFFFF' 
                              : '#F8FAFC',
                          borderBottom: index < users.length - 1 ? '1px solid #E2E8F0' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#F1F5F9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = isEvenRow ? '#FFFFFF' : '#F8FAFC';
                          }
                        }}
                      >
                        <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                          {isContractorPending && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                              className="rounded-md border-slate-300 data-[state=checked]:bg-[#4A67FF] data-[state=checked]:border-[#4A67FF]"
                            />
                          )}
                        </td>
                        <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
                            {/* User Avatar */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: '#4A67FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: 'white',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#0F172A',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing[2],
                              }}>
                                {getUserDisplayName(user)}
                                {user.isTestUser && (
                                  <span style={{
                                    padding: '2px 8px',
                                    backgroundColor: '#FEF3C7',
                                    borderRadius: theme.borderRadius.full,
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#92400E',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}>
                                    <Icon name="info" size={12} color="#92400E" />
                                    Test
                                  </span>
                                )}
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: '#64748B',
                              }}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: '#F1F5F9',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#475569',
                            textTransform: 'capitalize',
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                          <VerificationBadge status={user.verificationStatus} size="sm" />
                        </td>
                        <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle', fontSize: '13px', color: '#64748B' }}>
                          {formatDate(user.created_at)}
                        </td>
                        <td style={{ padding: `0 ${theme.spacing[4]}`, textAlign: 'right', verticalAlign: 'middle' }}>
                          <Button
                            variant="ghost"
                            onClick={() => handleViewDetails(user.id)}
                            style={{ 
                              padding: '6px 12px',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                            className="hover:bg-slate-100"
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
      </AdminCard>

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

