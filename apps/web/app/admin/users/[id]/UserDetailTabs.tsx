'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { UserDetail, Job, Review, Tab } from './UserDetailTypes';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getJobStatusBadge,
  getActivityIcon,
} from './UserDetailTypes';

// ── Shared Table Styles ─────────────────────────────────────────────

const smallThStyle: React.CSSProperties = {
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #E2E8F0',
};

const smallTdStyle: React.CSSProperties = {
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  verticalAlign: 'middle',
};

// ── Empty State ─────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: theme.spacing[8],
        color: '#64748B',
      }}
    >
      <Icon name='info' size={32} color='#CBD5E1' />
      <p style={{ marginTop: theme.spacing[2], fontSize: '14px' }}>{message}</p>
    </div>
  );
}

// ── Star Renderer ───────────────────────────────────────────────────

function renderStars(rating: number) {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Icon
        key={i}
        name={i <= rating ? 'starFilled' : 'star'}
        size={14}
        color={i <= rating ? '#F59E0B' : '#CBD5E1'}
      />
    );
  }
  return <span style={{ display: 'inline-flex', gap: 1 }}>{stars}</span>;
}

// ── Review Card ─────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      style={{
        padding: theme.spacing[3],
        border: '1px solid #F1F5F9',
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#FAFAFA',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        {renderStars(review.rating)}
        <span style={{ fontSize: '12px', color: '#94A3B8' }}>
          {formatDate(review.createdAt)}
        </span>
      </div>
      {review.comment && (
        <p
          style={{
            fontSize: '13px',
            color: '#475569',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {review.comment}
        </p>
      )}
    </div>
  );
}

// ── Job Table ───────────────────────────────────────────────────────

function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
      }}
    >
      <table
        style={{ width: '100%', borderCollapse: 'collapse' }}
        aria-label='Jobs list'
      >
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC' }}>
            <th style={smallThStyle}>Title</th>
            <th style={smallThStyle}>Category</th>
            <th style={smallThStyle}>Status</th>
            <th style={smallThStyle}>Date</th>
            <th style={{ ...smallThStyle, textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const badge = getJobStatusBadge(job.status);
            return (
              <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={smallTdStyle}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#0F172A',
                    }}
                  >
                    {job.title}
                  </span>
                </td>
                <td style={smallTdStyle}>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      textTransform: 'capitalize',
                    }}
                  >
                    {job.category || '-'}
                  </span>
                </td>
                <td style={smallTdStyle}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: badge.bg,
                      color: badge.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {job.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={smallTdStyle}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>
                    {formatDate(job.createdAt)}
                  </span>
                </td>
                <td style={{ ...smallTdStyle, textAlign: 'right' }}>
                  <Link
                    href='/admin/jobs'
                    style={{
                      fontSize: '13px',
                      color: '#4A67FF',
                      textDecoration: 'none',
                    }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab Content Components ──────────────────────────────────────────

export function ActivityTab({ data }: { data: UserDetail }) {
  if (data.activity.length === 0) {
    return <EmptyState message='No recent activity for this user.' />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
      }}
    >
      {data.activity.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing[3],
            padding: theme.spacing[3],
            borderRadius: theme.borderRadius.md,
            backgroundColor: item.read ? '#FFFFFF' : '#F8FAFC',
            border: `1px solid ${item.read ? '#F1F5F9' : '#E2E8F0'}`,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: item.read ? '#F1F5F9' : '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon
              name={getActivityIcon(item.type)}
              size={14}
              color={item.read ? '#94A3B8' : '#4A67FF'}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                marginBottom: 2,
              }}
            >
              {item.title}
            </div>
            {item.message && (
              <div
                style={{ fontSize: '13px', color: '#64748B', marginBottom: 4 }}
              >
                {item.message}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              {formatDateTime(item.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function JobsTab({ data }: { data: UserDetail }) {
  if (data.recentJobs.length === 0 && data.contractorJobs.length === 0) {
    return <EmptyState message='No jobs found for this user.' />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}
    >
      {data.recentJobs.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: theme.spacing[3],
            }}
          >
            Jobs Posted
          </h3>
          <JobTable jobs={data.recentJobs} />
        </div>
      )}
      {data.contractorJobs.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: theme.spacing[3],
            }}
          >
            Jobs Assigned (Contractor)
          </h3>
          <JobTable jobs={data.contractorJobs} />
        </div>
      )}
    </div>
  );
}

export function PaymentsTab({ data }: { data: UserDetail }) {
  if (data.paymentHistory.length === 0) {
    return <EmptyState message='No payment history for this user.' />;
  }

  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
      }}
    >
      <table
        style={{ width: '100%', borderCollapse: 'collapse' }}
        aria-label='Payment history'
      >
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC' }}>
            <th style={smallThStyle}>Type</th>
            <th style={smallThStyle}>Amount</th>
            <th style={smallThStyle}>Status</th>
            <th style={smallThStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          {data.paymentHistory.map((payment) => (
            <tr key={payment.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={smallTdStyle}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor:
                      payment.type === 'earning' ? '#D1FAE5' : '#FEE2E2',
                    color: payment.type === 'earning' ? '#065F46' : '#991B1B',
                  }}
                >
                  {payment.type === 'earning' ? 'Earned' : 'Paid'}
                </span>
              </td>
              <td style={smallTdStyle}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {formatCurrency(payment.amount)}
                </span>
              </td>
              <td style={smallTdStyle}>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    textTransform: 'capitalize',
                  }}
                >
                  {payment.status?.replace(/_/g, ' ')}
                </span>
              </td>
              <td style={smallTdStyle}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>
                  {formatDate(payment.createdAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReviewsTab({ data }: { data: UserDetail }) {
  if (data.reviewsReceived.length === 0 && data.reviewsGiven.length === 0) {
    return <EmptyState message='No reviews found for this user.' />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}
    >
      {data.reviewsReceived.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: theme.spacing[3],
            }}
          >
            Reviews Received ({data.reviewsReceived.length})
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {data.reviewsReceived.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}
      {data.reviewsGiven.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: theme.spacing[3],
            }}
          >
            Reviews Given ({data.reviewsGiven.length})
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {data.reviewsGiven.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
