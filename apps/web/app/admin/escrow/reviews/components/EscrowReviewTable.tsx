import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  tableHeaderStyle,
  tableCellStyle,
  getStatusColor,
} from './EscrowBulkDialogs';

interface EscrowReview {
  id: string;
  escrowId: string;
  jobId: string;
  jobTitle: string;
  contractorId: string;
  contractorName: string;
  homeownerId: string;
  homeownerName: string;
  amount: number;
  adminHoldStatus: 'pending_review' | 'admin_hold' | 'admin_approved';
  adminHoldReason: string | null;
  adminHoldAt: string | null;
  photoVerificationStatus: string | null;
  homeownerApproval: boolean;
  createdAt: string;
}

interface EscrowReviewTableProps {
  reviews: EscrowReview[];
  loading: boolean;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  actionLoading: boolean;
  formatCurrency: (amount: number) => string;
  onSelectAll: (checked: boolean) => void;
  onToggleSelect: (escrowId: string) => void;
  onReviewDetails: (escrowId: string) => void;
}

export function EscrowReviewTable({
  reviews,
  loading,
  selectedIds,
  allSelected,
  someSelected,
  actionLoading,
  formatCurrency,
  onSelectAll,
  onToggleSelect,
  onReviewDetails,
}: EscrowReviewTableProps) {
  return (
    <Card style={{ marginBottom: theme.spacing[6], padding: theme.spacing[6] }}>
      <h2
        style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[4],
          color: theme.colors.textPrimary,
        }}
      >
        Pending Reviews ({reviews.length})
      </h2>

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
      ) : reviews.length === 0 ? (
        <div
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
            <ClipboardCheck className='w-8 h-8' style={{ color: '#22c55e' }} />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: theme.colors.textPrimary,
              marginBottom: 4,
            }}
          >
            No Pending Reviews
          </h3>
          <p
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
              maxWidth: 384,
            }}
          >
            Escrow reviews will appear here when contractors complete jobs and
            submit photos for verification.
          </p>
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: theme.colors.backgroundSecondary,
                }}
              >
                <th style={{ ...tableHeaderStyle, width: '48px' }}>
                  <input
                    type='checkbox'
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                    }}
                    aria-label='Select all escrow reviews'
                  />
                </th>
                <th style={tableHeaderStyle}>Job</th>
                <th style={tableHeaderStyle}>Contractor</th>
                <th style={tableHeaderStyle}>Homeowner</th>
                <th style={tableHeaderStyle}>Amount</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Homeowner Approved</th>
                <th style={tableHeaderStyle}>Photo Verified</th>
                <th style={tableHeaderStyle}>Created</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <td style={tableCellStyle}>
                    <input
                      type='checkbox'
                      checked={selectedIds.has(review.escrowId)}
                      onChange={() => onToggleSelect(review.escrowId)}
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                      }}
                      aria-label={`Select escrow for ${review.jobTitle}`}
                    />
                  </td>
                  <td style={tableCellStyle}>{review.jobTitle}</td>
                  <td style={tableCellStyle}>{review.contractorName}</td>
                  <td style={tableCellStyle}>{review.homeownerName}</td>
                  <td style={tableCellStyle}>
                    {formatCurrency(review.amount)}
                  </td>
                  <td style={tableCellStyle}>
                    <span
                      style={{
                        color: getStatusColor(review.adminHoldStatus),
                      }}
                    >
                      {review.adminHoldStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    {review.homeownerApproval ? '\u2713 Yes' : '\u2717 No'}
                  </td>
                  <td style={tableCellStyle}>
                    {review.photoVerificationStatus === 'verified'
                      ? '\u2713 Verified'
                      : 'Pending'}
                  </td>
                  <td style={tableCellStyle}>
                    {format(new Date(review.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td style={tableCellStyle}>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onReviewDetails(review.escrowId)}
                      disabled={actionLoading}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
