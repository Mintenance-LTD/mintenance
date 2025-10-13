'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MetricCard } from '@/components/ui/MetricCard';

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
      payer_id?: string;
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

  // Calculate month-over-month trend
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const thisMonthRevenue = financialData.payments
    .filter(p => p.status === 'completed' && new Date(p.created_at) >= thisMonth)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const lastMonthRevenue = financialData.payments
    .filter(
      p =>
        p.status === 'completed' &&
        new Date(p.created_at) >= lastMonth &&
        new Date(p.created_at) < thisMonth
    )
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const revenueChange =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Payment columns for DataTable
  const paymentColumns: Column<typeof financialData.payments[0]>[] = [
    {
      key: 'created_at',
      label: 'Date',
      render: (payment) =>
        new Date(payment.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      key: 'id',
      label: 'Transaction',
      render: (payment) => `#${payment.id.slice(0, 8)}`,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right' as const,
      render: (payment) => (
        <span
          style={{
            fontWeight: theme.typography.fontWeight.semibold,
            color: payment.status === 'completed' ? theme.colors.success : theme.colors.textPrimary,
          }}
        >
          £{parseFloat(payment.amount).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center' as const,
      render: (payment) => <StatusBadge status={payment.status} size="sm" />,
    },
  ];

  // Job columns for DataTable
  const jobColumns: Column<typeof financialData.jobs[0]>[] = [
    {
      key: 'title',
      label: 'Job Title',
      render: (job) => (
        <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
          {job.title || 'Untitled Job'}
        </span>
      ),
    },
    {
      key: 'completed_at',
      label: 'Completed',
      render: (job) =>
        new Date(job.completed_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center' as const,
      render: (job) => <StatusBadge status={job.status} size="sm" />,
    },
    {
      key: 'price',
      label: 'Value',
      align: 'right' as const,
      render: (job) => (job.price ? `£${job.price.toFixed(2)}` : '-'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: theme.spacing[4],
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
              margin: 0,
            }}
          >
            Finance Dashboard
          </h1>
          <p
            style={{
              margin: 0,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Track cash flow, payments, and financial performance
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
                  backgroundColor: isActive
                    ? `${theme.colors.primary}15`
                    : theme.colors.surface,
                  color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {period}
              </button>
            );
          })}
        </div>
      </header>

      {/* Metric Cards with Trends */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <MetricCard
          label="Total Revenue"
          value={`£${financialData.totalRevenue.toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          subtitle={`${financialData.completedJobs} completed jobs`}
          icon="currencyDollar"
          trend={{
            direction: revenueChange >= 0 ? 'up' : 'down',
            value: `${Math.abs(revenueChange).toFixed(1)}%`,
            label: 'from last month',
          }}
          color={theme.colors.success}
        />

        <MetricCard
          label="Pending Payments"
          value={`£${financialData.pendingPayments.toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          subtitle="Awaiting release"
          icon="clock"
          color="#F59E0B"
        />

        <MetricCard
          label="Average Job Value"
          value={`£${avgJobValue.toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          subtitle="Per completed job"
          icon="briefcase"
          color={theme.colors.primary}
        />

        <MetricCard
          label="Annual Projection"
          value={`£${revenueProjection.toLocaleString('en-GB', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          subtitle="At current pace"
          icon="chart"
          color={theme.colors.info}
        />
      </section>

      {/* Payment History Table */}
      <DataTable
        data={financialData.payments.slice(0, 10)}
        columns={paymentColumns}
        title="Recent Payments"
        emptyMessage="No payments received yet"
        actions={
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.primary,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            View All
          </button>
        }
      />

      {/* Completed Jobs Table */}
      <DataTable
        data={financialData.jobs.slice(0, 10)}
        columns={jobColumns}
        title="Recent Completed Jobs"
        emptyMessage="No completed jobs yet"
        actions={
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.primary,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            View All Jobs
          </button>
        }
      />
    </div>
  );
}
