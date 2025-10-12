'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface FinanceDashboardClientProps {
  financialData: {
    totalRevenue: number;
    pendingPayments: number;
    completedJobs: number;
    payments: Array<{
      id: string;
      amount: string;
      status: string;
      created_at: string;
    }>;
    jobs: Array<{
      id: string;
      title: string;
      status: string;
      completed_at: string;
      price?: number;
    }>;
  };
}

const PERIODS: Array<'week' | 'month' | 'quarter' | 'year'> = ['week', 'month', 'quarter', 'year'];

export function FinanceDashboardClient({ financialData }: FinanceDashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof PERIODS)[number]>('month');

  const avgJobValue = financialData.completedJobs
    ? financialData.totalRevenue / financialData.completedJobs
    : 0;

  const revenueProjection = useMemo(() => {
    if (!financialData.jobs.length) return 0;
    const jobRate = financialData.totalRevenue / financialData.jobs.length;
    return jobRate * 12;
  }, [financialData.totalRevenue, financialData.jobs.length]);

  const periodCards = [
    {
      label: 'Total revenue',
      value: `£${financialData.totalRevenue.toFixed(2)}`,
      helper: `${financialData.completedJobs} completed jobs`,
      icon: 'currencyDollar',
    },
    {
      label: 'Pending payments',
      value: `£${financialData.pendingPayments.toFixed(2)}`,
      helper: 'Awaiting homeowner release',
      icon: 'creditCard',
    },
    {
      label: 'Average job value',
      value: `£${avgJobValue.toFixed(2)}`,
      helper: 'Based on completed work',
      icon: 'briefcase',
    },
    {
      label: 'Projected annual revenue',
      value: `£${revenueProjection.toFixed(2)}`,
      helper: 'If you maintain current pace',
      icon: 'chart',
    },
  ];

  const latestPayments = financialData.payments.slice(0, 6);
  const recentJobs = financialData.jobs.slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Finance overview
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Keep eyes on cash flow, outstanding invoices, and how your jobs are performing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
          {PERIODS.map((period) => {
            const isActive = selectedPeriod === period;
            return (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: '12px',
                  border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                  backgroundColor: isActive ? theme.colors.backgroundSecondary : theme.colors.surface,
                  color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {period}
              </button>
            );
          })}
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        {periodCards.map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: '20px',
              border: `1px solid ${theme.colors.border}`,
              padding: theme.spacing[5],
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], color: theme.colors.textSecondary }}>
              <Icon name={card.icon} size={18} color={theme.colors.primary} />
              {card.label}
            </span>
            <span style={{ fontSize: theme.typography.fontSize['3xl'], fontWeight: theme.typography.fontWeight.bold }}>
              {card.value}
            </span>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              {card.helper}
            </span>
          </div>
        ))}
      </section>

      <section
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold }}>
              Cash flow health
            </h2>
            <p style={{ margin: 0, fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              At a glance view of revenue movement this {selectedPeriod}.
            </p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.success,
            }}
          >
            <Icon name='progress' size={16} color={theme.colors.success} />
            On track
          </span>
        </header>
        <div
          style={{
            height: '160px',
            borderRadius: '12px',
            border: `1px dashed ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          Revenue chart placeholder  -  integrate analytics for real data visualisation.
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold }}>
              Recent transactions
            </h3>
            <button
              type='button'
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.xs,
                cursor: 'pointer',
              }}
            >
              View all
            </button>
          </header>

          {latestPayments.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {latestPayments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    padding: theme.spacing[4],
                  }}
                >
                  <div>
                    <div style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textPrimary }}>
                      Payment #{payment.id.slice(0, 6)}
                    </div>
                    <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: payment.status === 'completed' ? theme.colors.success : theme.colors.warning,
                        fontWeight: theme.typography.fontWeight.semibold,
                      }}
                    >
                      £{parseFloat(payment.amount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {payment.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: `${theme.spacing[10]} 0`,
                color: theme.colors.textSecondary,
              }}
            >
              No transactions yet
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold }}>
              Recent jobs
            </h3>
            <button
              type='button'
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.xs,
                cursor: 'pointer',
              }}
            >
              Open job board
            </button>
          </header>

          {recentJobs.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    padding: theme.spacing[4],
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] }}>
                    <span style={{ fontWeight: theme.typography.fontWeight.semibold }}>{job.title || 'Untitled job'}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    <span>Completed {new Date(job.completed_at).toLocaleDateString()}</span>
                    <span>{job.price ? `£${job.price.toFixed(2)}` : 'Awaiting payment'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: `${theme.spacing[10]} 0`,
                color: theme.colors.textSecondary,
              }}
            >
              Complete jobs to populate this list.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
