'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface UserManagementFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: 'all' | 'contractor' | 'homeowner';
  onRoleFilterChange: (role: 'all' | 'contractor' | 'homeowner') => void;
  verifiedFilter: 'all' | 'verified' | 'pending' | 'false';
  onVerifiedFilterChange: (status: 'all' | 'verified' | 'pending' | 'false') => void;
  excludeTestUsers: boolean;
  onExcludeTestUsersChange: (value: boolean) => void;
  selectedCount: number;
  bulkActionLoading: boolean;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
}
export function UserManagementFilters({
  search, onSearchChange,
  roleFilter, onRoleFilterChange,
  verifiedFilter, onVerifiedFilterChange,
  excludeTestUsers, onExcludeTestUsersChange,
  selectedCount, bulkActionLoading,
  onBulkApprove, onBulkReject, onClearSelection,
}: UserManagementFiltersProps) {
  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: theme.spacing[4] }}>
        <label htmlFor="user-search" className="sr-only">Search users by name or email</label>
        <Input
          id="user-search"
          type="text"
          placeholder="Search by name or email..."
          aria-label="Search users by name or email"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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
              aria-pressed={roleFilter === role}
              onClick={() => onRoleFilterChange(role)}
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
              onMouseEnter={(e) => { if (roleFilter !== role) e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary; }}
              onMouseLeave={(e) => { if (roleFilter !== role) e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary; }}
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
              aria-pressed={verifiedFilter === status}
              onClick={() => onVerifiedFilterChange(status)}
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
              onMouseEnter={(e) => { if (verifiedFilter !== status) e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary; }}
              onMouseLeave={(e) => { if (verifiedFilter !== status) e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary; }}
            >
              {status === 'all' ? 'All Status' : status === 'false' ? 'Not Verified' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Test Users Filter */}
        <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button
            aria-pressed={excludeTestUsers}
            onClick={() => onExcludeTestUsersChange(!excludeTestUsers)}
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
            onMouseEnter={(e) => { if (!excludeTestUsers) e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary; }}
            onMouseLeave={(e) => { if (!excludeTestUsers) e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary; }}
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
      {selectedCount > 0 && (
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
            {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: theme.spacing[2], marginLeft: 'auto' }}>
            <Button variant="primary" onClick={onBulkApprove} disabled={bulkActionLoading} style={{ fontSize: theme.typography.fontSize.sm }}>
              <Icon name="checkCircle" size={16} /> Approve Selected
            </Button>
            <Button variant="destructive" onClick={onBulkReject} disabled={bulkActionLoading} style={{ fontSize: theme.typography.fontSize.sm }}>
              <Icon name="xCircle" size={16} /> Reject Selected
            </Button>
            <Button variant="secondary" onClick={onClearSelection} style={{ fontSize: theme.typography.fontSize.sm }}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
