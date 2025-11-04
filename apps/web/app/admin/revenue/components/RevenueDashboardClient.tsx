'use client';

import React from 'react';
import { RevenueMetrics, MRRMetrics, RevenueTrend } from '@/lib/services/revenue/RevenueAnalytics';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';

interface RevenueDashboardClientProps {
  revenueMetrics: RevenueMetrics | null;
  mrr: MRRMetrics | null;
  conversionRate: { conversionRate: number; totalTrials: number; convertedTrials: number };
  arpc: number;
  trends: RevenueTrend[];
}

export function RevenueDashboardClient({
  revenueMetrics,
  mrr,
  conversionRate,
  arpc,
  trends,
}: RevenueDashboardClientProps) {
  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      <h1 style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[8],
      }}>
        Revenue Analytics
      </h1>

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
              Total Revenue (30d)
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
          Revenue Breakdown (30 days)
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

