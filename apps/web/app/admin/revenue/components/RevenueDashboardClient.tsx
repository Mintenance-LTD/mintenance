'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RevenueMetrics, MRRMetrics, RevenueTrend } from '@/lib/services/revenue/RevenueAnalytics';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RevenueDashboardClientProps {
  revenueMetrics: RevenueMetrics | null;
  mrr: MRRMetrics | null;
  conversionRate: { conversionRate: number; totalTrials: number; convertedTrials: number };
  arpc: number;
  trends: RevenueTrend[];
}

export function RevenueDashboardClient({
  revenueMetrics: initialRevenueMetrics,
  mrr: initialMrr,
  conversionRate: initialConversionRate,
  arpc: initialArpc,
  trends: initialTrends,
}: RevenueDashboardClientProps) {
  const [revenueMetrics, setRevenueMetrics] = useState(initialRevenueMetrics);
  const [mrr, setMrr] = useState(initialMrr);
  const [conversionRate, setConversionRate] = useState(initialConversionRate);
  const [arpc, setArpc] = useState(initialArpc);
  const [trends, setTrends] = useState(initialTrends);
  const [loading, setLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/admin/revenue?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const data = await response.json();
      setRevenueMetrics(data.revenueMetrics);
      setMrr(data.mrr);
      setConversionRate(data.conversionRate);
      setArpc(data.arpc);
      setTrends(data.trends);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Real-time polling (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRevenueData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchRevenueData]);

  const handleDateRangeChange = (preset: '7d' | '30d' | '90d' | 'custom') => {
    const end = new Date();
    let start: Date;

    if (preset === 'custom') {
      // Custom date picker would be implemented here
      return;
    }

    switch (preset) {
      case '7d':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    setDateRange({ start, end });
  };

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/admin/revenue/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export revenue data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting revenue:', error);
      setErrorDialog({ open: true, message: 'Failed to export revenue data' });
    }
  };
  return (
    <div className="p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[8] }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          margin: 0,
        }}>
          Revenue Analytics
        </h1>
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
      </div>

      {/* Date Range Picker */}
      <AdminCard padding="sm" className="mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4], flexWrap: 'wrap' }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
          }}>
            Date Range:
          </label>
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            {(['7d', '30d', '90d'] as const).map((preset) => {
              const isActive = 
                (preset === '7d' && dateRange.start.getTime() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()) ||
                (preset === '30d' && dateRange.start.getTime() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()) ||
                (preset === '90d' && dateRange.start.getTime() === new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).getTime());
              
              return (
                <Button
                  key={preset}
                  variant={isActive ? 'primary' : 'secondary'}
                  onClick={() => handleDateRangeChange(preset)}
                  style={{ fontSize: theme.typography.fontSize.sm }}
                >
                  {preset}
                </Button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginLeft: 'auto' }}>
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
            <span style={{ color: theme.colors.textSecondary }}>to</span>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
          </div>
          {loading && (
            <Icon name="loader" size={20} className="animate-spin" />
          )}
        </div>
      </AdminCard>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <AdminCard padding="lg" hover>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="currencyPound" size={24} color="#4A67FF" />
            </div>
            <div>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                Total Revenue
              </h3>
            </div>
          </div>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0F172A',
            margin: 0,
            lineHeight: '1.2',
          }}>
            {formatCurrency(revenueMetrics?.totalRevenue || 0)}
          </p>
        </AdminCard>

        <AdminCard padding="lg" hover>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="currencyPound" size={24} color="#4CC38A" />
            </div>
            <div>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                MRR
              </h3>
            </div>
          </div>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0F172A',
            margin: 0,
            lineHeight: '1.2',
            marginBottom: theme.spacing[1],
          }}>
            {formatCurrency(mrr?.totalMRR || 0)}
          </p>
          <p style={{
            fontSize: '13px',
            color: '#64748B',
            margin: 0,
          }}>
            {mrr?.activeSubscriptions || 0} active subscriptions
          </p>
        </AdminCard>

        <AdminCard padding="lg" hover>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="trendingUp" size={24} color="#F59E0B" />
            </div>
            <div>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                Conversion Rate
              </h3>
            </div>
          </div>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0F172A',
            margin: 0,
            lineHeight: '1.2',
            marginBottom: theme.spacing[1],
          }}>
            {conversionRate.conversionRate.toFixed(1)}%
          </p>
          <p style={{
            fontSize: '13px',
            color: '#64748B',
            margin: 0,
          }}>
            {conversionRate.convertedTrials} of {conversionRate.totalTrials} trials
          </p>
        </AdminCard>

        <AdminCard padding="lg" hover>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="users" size={24} color="#3B82F6" />
            </div>
            <div>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                ARPC
              </h3>
            </div>
          </div>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0F172A',
            margin: 0,
            lineHeight: '1.2',
          }}>
            {formatCurrency(arpc)}
          </p>
        </AdminCard>
      </div>

      {/* Revenue Breakdown Pie Chart */}
      {revenueMetrics && (
        <AdminCard padding="lg" className="mb-8">
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: theme.spacing[6],
          }}>
            Revenue Breakdown
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing[6],
            alignItems: 'center',
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Subscriptions', value: revenueMetrics.subscriptionRevenue || 0, color: '#4A67FF' },
                    { name: 'Transaction Fees', value: revenueMetrics.transactionFeeRevenue || 0, color: '#4CC38A' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Subscriptions', value: revenueMetrics.subscriptionRevenue || 0, color: '#4A67FF' },
                    { name: 'Transaction Fees', value: revenueMetrics.transactionFeeRevenue || 0, color: '#4CC38A' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[4],
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[2],
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: '#4A67FF',
                  }} />
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#475569',
                    margin: 0,
                  }}>
                    Subscription Revenue
                  </p>
                </div>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  {formatCurrency(revenueMetrics.subscriptionRevenue || 0)}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#64748B',
                  margin: 0,
                }}>
                  {revenueMetrics.subscriptionCount || 0} payments
                </p>
              </div>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[2],
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: '#4CC38A',
                  }} />
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#475569',
                    margin: 0,
                  }}>
                    Transaction Fees
                  </p>
                </div>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  {formatCurrency(revenueMetrics.transactionFeeRevenue || 0)}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#64748B',
                  margin: 0,
                }}>
                  {revenueMetrics.transactionCount || 0} transactions
                </p>
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Revenue Trends Chart */}
      {trends && trends.length > 0 && (
        <AdminCard padding="lg" className="mb-8">
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: theme.spacing[6],
          }}>
            Revenue Trends
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CC38A" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4CC38A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4CC38A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AdminCard>
      )}

      {/* MRR by Plan Chart */}
      {mrr && Object.keys(mrr.mrrByPlan).length > 0 && (
        <AdminCard padding="lg" className="mb-8">
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: theme.spacing[6],
          }}>
            MRR by Plan
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={Object.entries(mrr.mrrByPlan).map(([plan, data]) => ({
                name: plan.charAt(0).toUpperCase() + plan.slice(1),
                mrr: data.mrr,
                subscribers: data.count,
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}
              />
              <Bar 
                dataKey="mrr" 
                fill="#4A67FF"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[4],
            marginTop: theme.spacing[6],
            paddingTop: theme.spacing[6],
            borderTop: '1px solid #E2E8F0',
          }}>
            {Object.entries(mrr.mrrByPlan).map(([plan, data]) => (
              <div key={plan} style={{
                padding: theme.spacing[4],
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                  marginBottom: '8px',
                }}>
                  {plan}
                </p>
                <p style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  {formatCurrency(data.mrr)}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#64748B',
                  margin: 0,
                }}>
                  {data.count} subscribers
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      )}
      
      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open: boolean) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorDialog({ open: false, message: '' })}>
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

