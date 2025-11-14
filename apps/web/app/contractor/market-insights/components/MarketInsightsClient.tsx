'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import type {
  MarketInsights,
  PricingTrend,
  DemandForecast,
  MarketAnalysis,
  SeasonalTrend,
} from '@/lib/services/MarketInsightsService';

interface MarketInsightsClientProps {
  insights: MarketInsights;
  contractorId: string;
}

export function MarketInsightsClient({ insights }: MarketInsightsClientProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}
        >
          Market Insights
        </h1>
        <p
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}
        >
          Pricing trends, demand forecasting, and market analysis to help you make informed decisions
        </p>
      </div>

      {/* Market Analysis Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], paddingLeft: theme.spacing[4] }}>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Market Average Rate
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              £{insights.marketAnalysis.averageMarketRate.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textTertiary,
              }}
            >
              vs Your Average: £{insights.marketAnalysis.yourAverageRate.toLocaleString()}
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], paddingLeft: theme.spacing[4] }}>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Market Position
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color:
                  insights.marketAnalysis.marketPosition === 'above_average'
                    ? theme.colors.success
                    : insights.marketAnalysis.marketPosition === 'below_average'
                      ? theme.colors.warning
                      : theme.colors.textPrimary,
                textTransform: 'capitalize',
              }}
            >
              {insights.marketAnalysis.marketPosition.replace('_', ' ')}
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textTertiary,
              }}
            >
              {insights.marketAnalysis.competitorCount} competitors in market
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], paddingLeft: theme.spacing[4] }}>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Suggested Rate
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary,
              }}
            >
              £{insights.marketAnalysis.pricingRecommendation.suggestedRate.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textTertiary,
              }}
            >
              Based on market analysis
            </div>
          </div>
        </Card>
      </div>

      {/* Pricing Trends Chart */}
      <Card padding="lg">
        <h2
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
            paddingLeft: theme.spacing[4],
          }}
        >
          Pricing Trends (Last 12 Months)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={insights.pricingTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
            <XAxis
              dataKey="month"
              stroke={theme.colors.textSecondary}
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke={theme.colors.textSecondary}
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip
              formatter={(value: number) => [`£${value.toLocaleString()}`, 'Average Price']}
              contentStyle={{
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="averagePrice"
              stroke={theme.colors.primary}
              strokeWidth={2}
              name="Average Price"
              dot={{ fill: theme.colors.primary, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="medianPrice"
              stroke={theme.colors.secondary}
              strokeWidth={2}
              name="Median Price"
              dot={{ fill: theme.colors.secondary, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Demand Forecast Chart */}
      <Card padding="lg">
        <h2
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
            paddingLeft: theme.spacing[4],
          }}
        >
          Demand Forecast (Next 6 Months)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={insights.demandForecast}>
            <defs>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.colors.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={theme.colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
            <XAxis
              dataKey="month"
              stroke={theme.colors.textSecondary}
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke={theme.colors.textSecondary}
              fontSize={12}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'predictedDemand') return [`${value}%`, 'Predicted Demand'];
                if (name === 'confidence') return [`${value}%`, 'Confidence'];
                return [value, name];
              }}
              contentStyle={{
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="predictedDemand"
              stroke={theme.colors.primary}
              fillOpacity={1}
              fill="url(#demandGradient)"
              name="Predicted Demand"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Seasonal Trends */}
      <Card padding="lg">
        <h2
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
            paddingLeft: theme.spacing[4],
          }}
        >
          Seasonal Trends
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={insights.seasonalTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
            <XAxis
              dataKey="month"
              stroke={theme.colors.textSecondary}
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke={theme.colors.textSecondary}
              fontSize={12}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'demandScore') return [`${value}%`, 'Demand Score'];
                return [value, name];
              }}
              contentStyle={{
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
              }}
            />
            <Legend />
            <Bar
              dataKey="demandScore"
              fill={theme.colors.secondary}
              name="Demand Score"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Service Type Insights */}
      {insights.serviceTypeInsights.length > 0 && (
        <Card padding="lg">
          <h2
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
              paddingLeft: theme.spacing[4],
            }}
          >
            Service Type Insights
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: theme.spacing[4],
            }}
          >
            {insights.serviceTypeInsights.map((insight, index) => (
              <div
                key={index}
                style={{
                  padding: theme.spacing[4],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing[2],
                  }}
                >
                  {insight.serviceType}
                </div>
                <div
                  style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.primary,
                    marginBottom: theme.spacing[1],
                  }}
                >
                  £{insight.averagePrice.toLocaleString()}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    marginBottom: theme.spacing[1],
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor:
                        insight.demandLevel === 'high'
                          ? theme.colors.success
                          : insight.demandLevel === 'medium'
                            ? theme.colors.warning
                            : theme.colors.textTertiary,
                    }}
                  />
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      textTransform: 'capitalize',
                    }}
                  >
                    {insight.demandLevel} demand
                  </span>
                </div>
                <div
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color:
                      insight.growthRate > 0 ? theme.colors.success : theme.colors.textTertiary,
                  }}
                >
                  {insight.growthRate > 0 ? '+' : ''}
                  {insight.growthRate.toFixed(1)}% growth
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pricing Recommendation */}
      <Card padding="lg">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing[4],
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.primary + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="lightBulb" size={24} color={theme.colors.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}
            >
              Pricing Recommendation
            </h3>
            <p
              style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
                lineHeight: 1.6,
                marginBottom: theme.spacing[3],
              }}
            >
              {insights.marketAnalysis.pricingRecommendation.reasoning}
            </p>
            <div
              style={{
                padding: theme.spacing[3],
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}
              >
                Suggested Rate
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.primary,
                }}
              >
                £{insights.marketAnalysis.pricingRecommendation.suggestedRate.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

