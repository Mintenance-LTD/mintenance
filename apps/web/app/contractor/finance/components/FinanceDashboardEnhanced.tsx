'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/figma';
import { Button } from '@/components/ui/Button';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { MetricCard } from '@/components/ui/figma';
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


interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; expenses: number }>;
}

function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)));

  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-subheading-md font-[560] text-gray-900 mb-2 tracking-normal">
            Revenue vs Expenses
          </h3>
          <p className="text-sm font-[460] text-gray-600 m-0 leading-[1.5]">
            Monthly financial overview
          </p>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-green-500" />
            <span className="text-sm font-[560] text-gray-700">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-red-500" />
            <span className="text-sm font-[560] text-gray-700">Expenses</span>
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
                  background: theme.colors.success,
                  borderRadius: '6px 6px 0 0',
                  minHeight: '8px',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: theme.shadows.sm,
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: `${(item.expenses / maxValue) * 100}%`,
                  background: theme.colors.error,
                  borderRadius: '6px 6px 0 0',
                  minHeight: '8px',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: theme.shadows.sm,
                }}
              />
            </div>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, fontWeight: theme.typography.fontWeight.medium }}>
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
    <div className="group flex justify-between items-center p-5 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 relative overflow-hidden">
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-base font-[560] text-gray-900 m-0">
            {invoice.invoiceNumber || `Invoice #${invoice.id.slice(0, 8)}`}
          </h4>
          <StatusBadge
            status={invoice.status === 'paid' ? 'completed' : invoice.status === 'overdue' ? 'delayed' : 'pending'}
          />
        </div>
        <p className="text-sm font-[460] text-gray-600 m-0 mb-1">
          {invoice.client}
        </p>
        <p className="text-xs font-[460] text-gray-500 m-0">
          Due {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-[640] text-gray-900 m-0 tabular-nums">
          £{invoice.amount.toFixed(2)}
        </p>
      </div>
    </div>
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
      {/* Header - Modern Design */}
      <header className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-md font-[640] text-gray-900 mb-2 tracking-tighter">
            Finance Dashboard
          </h1>
          <p className="text-base font-[460] text-gray-600 m-0 leading-[1.5]">
            Track revenue, expenses, and financial performance
          </p>
        </div>
        <div className="flex gap-2 items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
          {PERIODS.map((period) => {
            const isActive = selectedPeriod === period;
            return (
              <Button
                key={period}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="capitalize"
              >
                {period}
              </Button>
            );
          })}
        </div>
      </header>

      {/* KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: theme.spacing[4] }}>
        <MetricCard
          label="Total Revenue"
          value={<AnimatedCounter value={financialData.totalRevenue} formatType="currency" currency="GBP" prefix="£" decimals={2} />}
          subtitle={`${financialData.completedJobs} completed jobs`}
          icon="currencyPound"
          iconColor={theme.colors.success}
          trend={{
            direction: revenueChange >= 0 ? 'up' : 'down',
            value: `${Math.abs(revenueChange).toFixed(1)}%`,
            label: 'from last month',
          }}
          gradient={true}
          gradientVariant="success"
        />
        <MetricCard
          label="Pending Payments"
          value={<AnimatedCounter value={financialData.pendingPayments} formatType="currency" currency="GBP" prefix="£" decimals={2} />}
          subtitle="Awaiting release"
          icon="clock"
          iconColor={theme.colors.warning}
          gradient={true}
          gradientVariant="warning"
        />
        <MetricCard
          label="Average Job Value"
          value={<AnimatedCounter value={financialData.avgJobValue} formatType="currency" currency="GBP" prefix="£" decimals={2} />}
          subtitle="Per completed job"
          icon="briefcase"
          iconColor={theme.colors.primary}
          trend={financialData.avgJobValueChange !== 0 ? {
            direction: financialData.avgJobValueChange >= 0 ? 'up' : 'down',
            value: `${Math.abs(financialData.avgJobValueChange).toFixed(1)}%`,
            label: 'change',
          } : undefined}
          gradient={true}
          gradientVariant="primary"
        />
        <MetricCard
          label="Profit Margin"
          value={<AnimatedCounter value={financialData.profitMargin} formatType="percentage" decimals={1} />}
          subtitle="Last 6 months avg"
          icon="chart"
          iconColor={theme.colors.info}
          trend={financialData.profitMarginChange !== 0 ? {
            direction: financialData.profitMarginChange >= 0 ? 'up' : 'down',
            value: `${Math.abs(financialData.profitMarginChange).toFixed(1)}%`,
            label: 'change',
          } : undefined}
          gradient={true}
          gradientVariant="primary"
        />
      </section>

      {/* Revenue Chart */}
      <RevenueChart data={financialData.chartData} />

      {/* Invoices and Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: theme.spacing[6] }}>
        {/* Recent Invoices */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-[560] text-gray-900 m-0">
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-[560] text-gray-900 m-0">
              Recent Transactions
            </h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {financialData.transactions.length > 0 ? (
                financialData.transactions.map(transaction => (
                  <div className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-[560] text-gray-900">
                        {transaction.description}
                      </span>
                      <span className="text-xs font-[460] text-gray-600">
                        {new Date(transaction.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-[560] text-gray-900">
                        £{transaction.amount.toFixed(2)}
                      </span>
                      <StatusBadge status={transaction.status === 'completed' ? 'completed' : transaction.status === 'pending' ? 'pending' : 'delayed'} />
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

