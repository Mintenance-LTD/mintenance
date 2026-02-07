'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from './VerificationBadge';
import { Checkbox } from '@/components/ui/checkbox';
import type { User, Pagination } from './UserManagementTypes';
import { formatDate, getUserDisplayName, getUserInitials } from './UserManagementTypes';

interface UserManagementTableProps {
  users: User[];
  loading: boolean;
  pagination: Pagination;
  selectedUserIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectUser: (userId: string, checked: boolean) => void;
  onViewDetails: (userId: string) => void;
  onPageChange: (page: number) => void;
}

const thStyle: React.CSSProperties = {
  padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '2px solid #E2E8F0',
  backgroundColor: '#F8FAFC',
};

export function UserManagementTable({
  users, loading, pagination,
  selectedUserIds, allSelected, someSelected,
  onSelectAll, onSelectUser, onViewDetails, onPageChange,
}: UserManagementTableProps) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading users" style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing[8] }}>
        <Icon name="loader" size={32} className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading users</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>
        No users found matching your criteria
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }} aria-label="User management table">
          <caption className="sr-only">Platform users with their roles, verification status, and actions</caption>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC' }}>
            <tr>
              <th scope="col" style={{ ...thStyle, width: '48px' }}>
                <input
                  type="checkbox"
                  aria-label="Select all pending contractors"
                  checked={allSelected}
                  ref={(input) => { if (input) input.indeterminate = someSelected; }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', borderRadius: '4px', border: '2px solid #CBD5E1', accentColor: '#4A67FF' }}
                  className="rounded-md"
                />
              </th>
              <th scope="col" style={thStyle}>User</th>
              <th scope="col" style={thStyle}>Role</th>
              <th scope="col" style={thStyle}>Verification</th>
              <th scope="col" style={thStyle}>Registered</th>
              <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
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
                    backgroundColor: isSelected ? '#EFF6FF' : isEvenRow ? '#FFFFFF' : '#F8FAFC',
                    borderBottom: index < users.length - 1 ? '1px solid #E2E8F0' : 'none',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isEvenRow ? '#FFFFFF' : '#F8FAFC'; }}
                >
                  <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                    {isContractorPending && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)}
                        className="rounded-md border-slate-300 data-[state=checked]:bg-[#4A67FF] data-[state=checked]:border-[#4A67FF]"
                      />
                    )}
                  </td>
                  <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#4A67FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                          {getUserDisplayName(user)}
                          {user.isTestUser && (
                            <span style={{ padding: '2px 8px', backgroundColor: '#FEF3C7', borderRadius: theme.borderRadius.full, fontSize: '10px', fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Icon name="info" size={12} color="#92400E" />
                              Test
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: `0 ${theme.spacing[4]}`, verticalAlign: 'middle' }}>
                    <span style={{ padding: '4px 12px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontSize: '12px', fontWeight: 500, color: '#475569', textTransform: 'capitalize' }}>
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
                      aria-label={"View details for " + getUserDisplayName(user)}
                      onClick={() => onViewDetails(user.id)}
                      style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 500 }}
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
            <Button variant="secondary" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1}>
              Previous
            </Button>
            <Button variant="secondary" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
