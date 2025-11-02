import React from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import type { ContractorAnalytics } from '@/lib/services/ContractorAnalyticsService';

interface AnalyticsOverviewProps {
  analytics: ContractorAnalytics;
  loading?: boolean;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  analytics,
  loading = false
}) => {
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing.lg
      }}>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} style={{
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            <div style={{
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textSecondary
            }}>
              Loading...
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return theme.colors.success;
    if (change < 0) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➖';
  };

  const earningsChange = analytics.lastMonthEarnings > 0
    ? ((analytics.thisMonthEarnings - analytics.lastMonthEarnings) / analytics.lastMonthEarnings) * 100
    : analytics.thisMonthEarnings > 0 ? 100 : 0;

  const metricCards = [
    {
      title: 'Total Jobs',
      value: analytics.totalJobs.toString(),
      subtitle: `${analytics.completedJobs} completed, ${analytics.activeJobs} active`,
      icon: '📋',
      color: theme.colors.primary,
      trend: null
    },
    {
      title: 'Completion Rate',
      value: formatPercentage(analytics.completionRate),
      subtitle: `${analytics.completedJobs} of ${analytics.totalJobs} jobs`,
      icon: '✅',
      color: analytics.completionRate >= 90 ? theme.colors.success :
             analytics.completionRate >= 70 ? theme.colors.warning : theme.colors.error,
      trend: null
    },
    {
      title: 'This Month Earnings',
      value: formatCurrency(analytics.thisMonthEarnings),
      subtitle: `vs ${formatCurrency(analytics.lastMonthEarnings)} last month`,
      icon: '💰',
      color: theme.colors.success,
      trend: {
        value: earningsChange,
        icon: getChangeIcon(earningsChange)
      }
    },
    {
      title: 'Average Rating',
      value: analytics.averageRating.toFixed(1),
      subtitle: `Based on ${analytics.totalReviews} reviews`,
      icon: '⭐',
      color: analytics.averageRating >= 4.5 ? theme.colors.success :
             analytics.averageRating >= 4.0 ? theme.colors.warning : theme.colors.error,
      trend: null
    },
    {
      title: 'Total Earnings',
      value: formatCurrency(analytics.totalEarnings),
      subtitle: `Average ${formatCurrency(analytics.averageJobValue)} per job`,
      icon: '🏆',
      color: theme.colors.info,
      trend: null
    },
    {
      title: 'Response Time',
      value: `${analytics.averageResponseTime.toFixed(1)}h`,
      subtitle: analytics.averageResponseTime <= 2 ? 'Excellent' :
                analytics.averageResponseTime <= 6 ? 'Good' : 'Needs Improvement',
      icon: '⚡',
      color: analytics.averageResponseTime <= 2 ? theme.colors.success :
             analytics.averageResponseTime <= 6 ? theme.colors.warning : theme.colors.error,
      trend: null
    },
    {
      title: 'Industry Ranking',
      value: `Top ${(100 - analytics.industryRankPercentile).toFixed(0)}%`,
      subtitle: `Rank ${analytics.marketPositioning.categoryRanking} of ${analytics.marketPositioning.categoryTotal}`,
      icon: '📊',
      color: analytics.industryRankPercentile >= 80 ? theme.colors.success :
             analytics.industryRankPercentile >= 60 ? theme.colors.warning : theme.colors.error,
      trend: null
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(analytics.pendingPayments),
      subtitle: analytics.pendingPayments > 0 ? 'In escrow' : 'All caught up',
      icon: '⏳',
      color: analytics.pendingPayments > 0 ? theme.colors.warning : theme.colors.success,
      trend: null
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: theme.spacing.xl,
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
          marginBottom: theme.spacing.sm
        }}>
          📊 Performance Overview
        </h2>
        <p style={{
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
          margin: 0
        }}>
          Your key performance metrics and insights
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: theme.spacing.lg
      }}>
        {metricCards.map((metric, index) => (
          <Card
            key={index}
            style={{
              padding: theme.spacing.lg,
              border: `1px solid ${metric.color}20`,
              backgroundColor: `${metric.color}05`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Icon */}
            <div style={{
              position: 'absolute',
              top: -10,
              right: -10,
              fontSize: '4rem',
              opacity: 0.1,
              pointerEvents: 'none'
            }}>
              {metric.icon}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.md
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm
              }}>
                <div style={{
                  fontSize: theme.typography.fontSize.xl,
                  color: metric.color
                }}>
                  {metric.icon}
                </div>
                <h3 style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textSecondary,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {metric.title}
                </h3>
              </div>

              {metric.trend && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `2px ${theme.spacing.xs}`,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: `${getChangeColor(metric.trend.value)}20`,
                  color: getChangeColor(metric.trend.value),
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium
                }}>
                  {metric.trend.icon}
                  {formatPercentage(Math.abs(metric.trend.value), 0)}
                </div>
              )}
            </div>

            <div style={{
              marginBottom: theme.spacing.sm
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: metric.color,
                lineHeight: 1.2
              }}>
                {metric.value}
              </div>
            </div>

            <div style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              lineHeight: 1.4
            }}>
              {metric.subtitle}
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Summary */}
      <div style={{
        marginTop: theme.spacing.xl,
        padding: theme.spacing.lg,
        backgroundColor: `${theme.colors.primary}10`,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.primary}20`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md
        }}>
          <span style={{ fontSize: theme.typography.fontSize.lg }}>🎯</span>
          <h3 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary,
            margin: 0
          }}>
            Performance Summary
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing.md,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.primary
        }}>
          <div>
            <strong>Success Rate:</strong> {formatPercentage(analytics.jobSuccessRate)}
          </div>
          <div>
            <strong>Customer Return:</strong> {formatPercentage(analytics.customerReturnRate)}
          </div>
          <div>
            <strong>Market Position:</strong> Top {(100 - analytics.industryRankPercentile).toFixed(0)}%
          </div>
          <div>
            <strong>Growth Trend:</strong> {earningsChange > 0 ? '📈 Growing' : earningsChange < 0 ? '📉 Declining' : '➖ Stable'}
          </div>
        </div>
      </div>
    </div>
  );
};