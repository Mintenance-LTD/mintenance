import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
// import { Button } from '@/components/ui/Button';
import type { MonthlyTrend } from '@/lib/services/ContractorAnalyticsService';

interface PerformanceTrendsProps {
  jobTrends: MonthlyTrend[];
  earningsTrends: MonthlyTrend[];
  ratingTrends: MonthlyTrend[];
}

type TrendType = 'jobs' | 'earnings' | 'ratings';

export const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({
  jobTrends,
  earningsTrends,
  ratingTrends
}) => {
  const [selectedTrend, setSelectedTrend] = useState<TrendType>('jobs');

  const getCurrentTrends = () => {
    switch (selectedTrend) {
      case 'jobs': return jobTrends;
      case 'earnings': return earningsTrends;
      case 'ratings': return ratingTrends;
      default: return jobTrends;
    }
  };

  const formatValue = (value: number, type: TrendType) => {
    switch (type) {
      case 'jobs': return value.toString();
      case 'earnings': return `$${value.toFixed(0)}`;
      case 'ratings': return value.toFixed(1);
      default: return value.toString();
    }
  };

  const getChartColor = (type: TrendType) => {
    switch (type) {
      case 'jobs': return theme.colors.primary;
      case 'earnings': return theme.colors.success;
      case 'ratings': return theme.colors.warning;
      default: return theme.colors.primary;
    }
  };

  const getChartIcon = (type: TrendType) => {
    switch (type) {
      case 'jobs': return '📋';
      case 'earnings': return '💰';
      case 'ratings': return '⭐';
      default: return '📊';
    }
  };

  const trends = getCurrentTrends();
  const maxValue = Math.max(...trends.map(t => t.value));
  const minValue = Math.min(...trends.map(t => t.value));
  const valueRange = maxValue - minValue;

  const trendOptions = [
    { type: 'jobs' as TrendType, label: 'Jobs', icon: '📋', color: theme.colors.primary },
    { type: 'earnings' as TrendType, label: 'Earnings', icon: '💰', color: theme.colors.success },
    { type: 'ratings' as TrendType, label: 'Ratings', icon: '⭐', color: theme.colors.warning }
  ];

  // Calculate overall trend
  const calculateOverallTrend = (trends: MonthlyTrend[]) => {
    if (trends.length < 2) return 0;

    const recentTrends = trends.slice(-3); // Last 3 months
    const avgChange = recentTrends.reduce((sum, trend) => sum + trend.change, 0) / recentTrends.length;
    return avgChange;
  };

  const overallTrend = calculateOverallTrend(trends);
  const getTrendDirection = (change: number) => {
    if (change > 5) return { icon: '📈', text: 'Strong Growth', color: theme.colors.success };
    if (change > 0) return { icon: '↗️', text: 'Growing', color: theme.colors.success };
    if (change < -5) return { icon: '📉', text: 'Declining', color: theme.colors.error };
    if (change < 0) return { icon: '↘️', text: 'Decreasing', color: theme.colors.error };
    return { icon: '➖', text: 'Stable', color: theme.colors.textSecondary };
  };

  const trendDirection = getTrendDirection(overallTrend);

  return (
    <Card style={{ padding: theme.spacing.xl }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl
      }}>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: theme.spacing.xs
          }}>
            📊 Performance Trends
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            12-month performance overview
          </p>
        </div>

        {/* Trend Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          backgroundColor: `${trendDirection.color}15`,
          border: `1px solid ${trendDirection.color}30`
        }}>
          <span style={{ fontSize: theme.typography.fontSize.md }}>
            {trendDirection.icon}
          </span>
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: trendDirection.color
          }}>
            {trendDirection.text}
          </span>
        </div>
      </div>

      {/* Trend Type Selector */}
      <div style={{
        display: 'flex',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xl,
        padding: theme.spacing.xs,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md
      }}>
        {trendOptions.map(option => (
          <button
            key={option.type}
            onClick={() => setSelectedTrend(option.type)}
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.sm,
              border: 'none',
              backgroundColor: selectedTrend === option.type
                ? option.color
                : 'transparent',
              color: selectedTrend === option.type
                ? theme.colors.white
                : theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs
            }}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div style={{
        height: '300px',
        position: 'relative',
        padding: `${theme.spacing.md} 0`
      }}>
        {/* Y-axis labels */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary
        }}>
          <div>{formatValue(maxValue, selectedTrend)}</div>
          <div>{formatValue(maxValue * 0.75, selectedTrend)}</div>
          <div>{formatValue(maxValue * 0.5, selectedTrend)}</div>
          <div>{formatValue(maxValue * 0.25, selectedTrend)}</div>
          <div>{formatValue(0, selectedTrend)}</div>
        </div>

        {/* Chart */}
        <div style={{
          marginLeft: '70px',
          height: '100%',
          position: 'relative',
          borderLeft: `1px solid ${theme.colors.border}`,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <div
              key={percent}
              style={{
                position: 'absolute',
                top: `${100 - percent}%`,
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: percent === 0 ? 'transparent' : `${theme.colors.border}50`
              }}
            />
          ))}

          {/* Data points and line */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
          >
            {/* Line path */}
            <path
              d={trends.map((trend, index) => {
                const x = (index / (trends.length - 1)) * 100;
                const y = valueRange > 0 ? (1 - (trend.value - minValue) / valueRange) * 100 : 50;
                return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
              }).join(' ')}
              fill="none"
              stroke={getChartColor(selectedTrend)}
              strokeWidth="3"
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />

            {/* Data points */}
            {trends.map((trend, index) => {
              const x = (index / (trends.length - 1)) * 100;
              const y = valueRange > 0 ? (1 - (trend.value - minValue) / valueRange) * 100 : 50;

              return (
                <g key={index}>
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="6"
                    fill={getChartColor(selectedTrend)}
                    stroke={theme.colors.white}
                    strokeWidth="2"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  />
                  {/* Tooltip on hover */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="12"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.setAttribute('title', `${trend.month} ${trend.year}: ${formatValue(trend.value, selectedTrend)}`);
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary
          }}>
            {trends.map((trend, index) => (
              <div key={index} style={{
                transform: 'translateX(-50%)',
                textAlign: 'center'
              }}>
                {trend.month}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Summary */}
      <div style={{
        marginTop: theme.spacing.xl,
        padding: theme.spacing.md,
        backgroundColor: `${getChartColor(selectedTrend)}10`,
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${getChartColor(selectedTrend)}20`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: theme.spacing.md
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.lg,
              color: getChartColor(selectedTrend)
            }}>
              {getChartIcon(selectedTrend)}
            </span>
            <div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.bold,
                color: getChartColor(selectedTrend),
                textTransform: 'capitalize'
              }}>
                {selectedTrend} Trend Analysis
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary
              }}>
                Last 12 months performance
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: theme.spacing.lg,
            fontSize: theme.typography.fontSize.sm,
            color: getChartColor(selectedTrend)
          }}>
            <div>
              <strong>Current:</strong> {formatValue(trends[trends.length - 1]?.value || 0, selectedTrend)}
            </div>
            <div>
              <strong>Peak:</strong> {formatValue(maxValue, selectedTrend)}
            </div>
            <div>
              <strong>Growth:</strong> {overallTrend > 0 ? '+' : ''}{overallTrend.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};