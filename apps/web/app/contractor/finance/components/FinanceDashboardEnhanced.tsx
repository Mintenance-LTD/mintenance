'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { StatusBadge, BadgeStatus } from '@/components/ui/Badge.unified';
import { Button } from '@/components/ui/Button';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { getGradientCardStyle, getIconContainerStyle } from '@/lib/theme-enhancements';

interface FinanceDashboardEnhancedProps {
  financialData: {
    totalRevenue: number;
    pendingPayments: number;
    completedJobs: number;
    avgJobValue: number;
    avgJobValueChange: number;
    profitMargin: number;
    profitMarginChange: number;
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
    chartData: Array<{
      month: string;
      revenue: number;
      expenses: number;
    }>;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      client: string;
      amount: number;
      dueDate: string;
      status: 'paid' | 'pending' | 'overdue' | 'draft';
    }>;
    transactions: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      status: 'completed' | 'pending' | 'failed';
    }>;
  };
}

const PERIODS = ['Week', 'Month', 'Quarter', 'Year'] as const;

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
  subtitle: string;
}

function KpiCard({ title, value, change, changeType, icon, subtitle }: KpiCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getGradientVariant = () => {
    if (changeType === 'positive') return 'success';
    if (changeType === 'negative') return 'warning';
    return 'primary';
  };

  const getColor = () => {
    if (changeType === 'positive') return theme.colors.success;
    if (changeType === 'negative') return theme.colors.warning;
    return theme.colors.primary;
  };

  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
        ...getGradientCardStyle(getGradientVariant()),
        borderTop: `3px solid ${getColor()}`,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = theme.shadows.xl;
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = theme.shadows.sm;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          ...getIconContainerStyle(getColor(), 52),
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'scale(1.05) rotate(5deg)' : 'scale(1) rotate(0deg)',
        }}>
          <Icon name={icon as any} size={26} color={getColor()} />
        </div>
        {change && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              borderRadius: '8px',
              backgroundColor:
                changeType === 'positive'
                  ? `${theme.colors.success}15`
                  : changeType === 'negative'
                    ? `${theme.colors.error}15`
                    : `${theme.colors.textSecondary}15`,
            }}
          >
            <Icon
              name={changeType === 'positive' ? 'arrowUp' : changeType === 'negative' ? 'arrowDown' : 'minus'}
              size={12}
              color={
                changeType === 'positive'
                  ? theme.colors.success
                  : changeType === 'negative'
                    ? theme.colors.error
                    : theme.colors.textSecondary
              }
            />
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color:
                  changeType === 'positive'
                    ? theme.colors.success
                    : changeType === 'negative'
                      ? theme.colors.error
                      : theme.colors.textSecondary,
              }}
            >
              {change}
            </span>
          </div>
        )}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing[2],
          }}
        >
          {title}
        </p>
        <div
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize['4xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            letterSpacing: '-0.02em',
            lineHeight: '1.1',
          }}
        >
          {value}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing[2],
          }}
        >
          {subtitle}
        </p>
      </div>
    </Card>
  );
}

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; expenses: number }>;
}

function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)));

  return (
    <Card style={{ borderTop: `3px solid ${theme.colors.primary}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[6] }}>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              letterSpacing: '-0.02em',
            }}
          >
            Revenue vs Expenses
          </h3>
          <p style={{ margin: 0, fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary, marginTop: theme.spacing[2] }}>
            Monthly comparison
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: theme.colors.success }} />
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Revenue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: theme.colors.error }} />
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Expenses</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'flex-end', height: '240px' }}>
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1, display: 'flex', gap: theme.spacing[1], alignItems: 'flex-end', width: '100%' }}>
              <div
                style={{
                  flex: 1,
                  height: `${(item.revenue / maxValue) * 100}%`,
                  background: `linear-gradient(180deg, ${theme.colors.success} 0%, #34D399 100%)`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '8px',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: theme.shadows.sm,
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: `${(item.expenses / maxValue) * 100}%`,
                  background: `linear-gradient(180deg, ${theme.colors.error} 0%, #F87171 100%)`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '8px',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: theme.shadows.sm,
                }}
              />
            </div>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              {item.month}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface InvoiceCardProps {
  invoice: {
    id: string;
    invoiceNumber?: string;
    client: string;
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue' | 'draft';
  };
}

function InvoiceCard({ invoice }: InvoiceCardProps) {
  return (
    <Card 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: theme.spacing[4],
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: theme.shadows.sm,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = theme.shadows.md;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = theme.shadows.sm;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
          {invoice.invoiceNumber || `Invoice #${invoice.id.slice(0, 8)}`}
        </span>
        <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold }}>
          {invoice.client}
        </h4>
        <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
          Due: {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: theme.spacing[2] }}>
        <span style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold }}>
          £{invoice.amount.toFixed(2)}
        </span>
        <StatusBadge
          status={invoice.status === 'paid' ? 'completed' : invoice.status === 'overdue' ? 'delayed' : 'pending'}
          size="sm"
        />
      </div>
    </Card>
  );
}

export function FinanceDashboardEnhanced({ financialData }: FinanceDashboardEnhancedProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof PERIODS)[number]>('Month');

  // Calculate month-over-month revenue change
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const thisMonthRevenue = financialData.payments
    .filter(p => p.status === 'completed' && new Date(p.created_at) >= thisMonth)
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  const lastMonthRevenue = financialData.payments
    .filter(
      p =>
        p.status === 'completed' &&
        new Date(p.created_at) >= lastMonth &&
        new Date(p.created_at) < thisMonth
    )
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  const revenueChange =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
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
          <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Track revenue, expenses, and financial performance
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
                  borderRadius: theme.borderRadius.md,
                  border: `2px solid ${isActive ? theme.colors.primary : 'transparent'}`,
                  background: isActive 
                    ? `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%)`
                    : 'transparent',
                  color: isActive ? 'white' : theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: isActive ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? theme.shadows.sm : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = theme.colors.textPrimary;
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {period}
              </button>
            );
          })}
        </div>
      </header>

      {/* KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: theme.spacing[4] }}>
        <KpiCard
          title="Total Revenue"
          value={<AnimatedCounter value={financialData.totalRevenue} formatType="currency" currency="GBP" prefix="£" decimals={2} />}
          change={`${Math.abs(revenueChange).toFixed(1)}%`}
          changeType={revenueChange >= 0 ? 'positive' : 'negative'}
          icon="currencyPound"
          subtitle={`${financialData.completedJobs} completed jobs`}
        />
        <KpiCard
          title="Pending Payments"
          value={<AnimatedCounter value={financialData.pendingPayments} formatType="currency" currency="GBP" prefix="£" decimals={2} />}
          icon="clock"
          subtitle="Awaiting release"
        />
        <KpiCard
          title="Average Job Value"
          value={<AnimatedCounter value={financialData.avgJobValue} formatType="currency" currency="GBP" prefix="£" decimals={2} />}
          change={financialData.avgJobValueChange !== 0 ? `${financialData.avgJobValueChange >= 0 ? '+' : ''}${financialData.avgJobValueChange.toFixed(1)}%` : undefined}
          changeType={financialData.avgJobValueChange >= 0 ? 'positive' : 'negative'}
          icon="briefcase"
          subtitle="Per completed job"
        />
        <KpiCard
          title="Profit Margin"
          value={<AnimatedCounter value={financialData.profitMargin} formatType="percentage" decimals={1} />}
          change={financialData.profitMarginChange !== 0 ? `${financialData.profitMarginChange >= 0 ? '+' : ''}${financialData.profitMarginChange.toFixed(1)}%` : undefined}
          changeType={financialData.profitMarginChange >= 0 ? 'positive' : 'negative'}
          icon="chart"
          subtitle="Last 6 months avg"
        />
      </section>

      {/* Revenue Chart */}
      <RevenueChart data={financialData.chartData} />

      {/* Invoices and Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: theme.spacing[6] }}>
        {/* Recent Invoices */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] }}>
            <h2
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}
            >
              Recent Invoices
            </h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
            {financialData.invoices.length > 0 ? (
              financialData.invoices.map(invoice => (
                <InvoiceCard 
                  key={invoice.id} 
                  invoice={{
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    client: invoice.client,
                    amount: invoice.amount,
                    dueDate: invoice.dueDate,
                    status: invoice.status,
                  }} 
                />
              ))
            ) : (
              <div style={{ padding: theme.spacing[8], textAlign: 'center', color: theme.colors.textSecondary }}>
                No invoices found
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] }}>
            <h2
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}
            >
              Recent Transactions
            </h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {financialData.transactions.length > 0 ? (
                financialData.transactions.map(transaction => (
                  <div
                    key={transaction.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: theme.spacing[3],
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                      e.currentTarget.style.boxShadow = theme.shadows.sm;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.surface;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                      <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                        {transaction.description}
                      </span>
                      <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                        {new Date(transaction.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
                      <span style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold }}>
                        £{transaction.amount.toFixed(2)}
                      </span>
                      <StatusBadge status={transaction.status as BadgeStatus} size="sm" />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: theme.spacing[8], textAlign: 'center', color: theme.colors.textSecondary }}>
                  No transactions found
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

