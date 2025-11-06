'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RevenueMetrics, MRRMetrics, RevenueTrend } from '@/lib/services/revenue/RevenueAnalytics';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';

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
      alert('Failed to export revenue data');
    }
  };
  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
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
      <Card style={{ padding: theme.spacing[4], marginBottom: theme.spacing[6] }}>
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
      </Card>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="currencyPound" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
              Total Revenue
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {formatCurrency(revenueMetrics?.totalRevenue || 0)}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="currencyPound" size={24} color={theme.colors.success} />
            <h3 style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
              Monthly Recurring Revenue
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {formatCurrency(mrr?.totalMRR || 0)}
          </p>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing[1],
          }}>
            {mrr?.activeSubscriptions || 0} active subscriptions
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="trendingUp" size={24} color={theme.colors.info} />
            <h3 style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
              Trial Conversion Rate
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {conversionRate.conversionRate.toFixed(1)}%
          </p>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing[1],
          }}>
            {conversionRate.convertedTrials} of {conversionRate.totalTrials} trials converted
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="users" size={24} color={theme.colors.accent} />
            <h3 style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
              Avg Revenue per Contractor
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {formatCurrency(arpc)}
          </p>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card style={{ padding: theme.spacing[6], marginBottom: theme.spacing[8] }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          Revenue Breakdown
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing[4],
        }}>
          <div>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Subscription Revenue
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {formatCurrency(revenueMetrics?.subscriptionRevenue || 0)}
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textTertiary,
              marginTop: theme.spacing[1],
            }}>
              {revenueMetrics?.subscriptionCount || 0} payments
            </p>
          </div>
          <div>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Transaction Fees
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {formatCurrency(revenueMetrics?.transactionFeeRevenue || 0)}
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textTertiary,
              marginTop: theme.spacing[1],
            }}>
              {revenueMetrics?.transactionCount || 0} transactions
            </p>
          </div>
        </div>
      </Card>

      {/* MRR by Plan */}
      {mrr && Object.keys(mrr.mrrByPlan).length > 0 && (
        <Card style={{ padding: theme.spacing[6] }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            MRR by Plan
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[4],
          }}>
            {Object.entries(mrr.mrrByPlan).map(([plan, data]) => (
              <div key={plan}>
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                  textTransform: 'capitalize',
                }}>
                  {plan}
                </p>
                <p style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}>
                  {formatCurrency(data.mrr)}
                </p>
                <p style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textTertiary,
                  marginTop: theme.spacing[1],
                }}>
                  {data.count} subscribers
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
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

