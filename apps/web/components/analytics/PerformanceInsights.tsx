import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PerformanceInsight } from '@/lib/services/ContractorAnalyticsService';

interface PerformanceInsightsProps {
  insights: PerformanceInsight[];
  loading?: boolean;
}

export const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({
  insights,
  loading = false
}) => {
  const [selectedInsight, setSelectedInsight] = useState<PerformanceInsight | null>(null);
  const [filterType, setFilterType] = useState<'all' | PerformanceInsight['type']>('all');

  if (loading) {
    return (
      <Card style={{ padding: theme.spacing.xl }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: theme.colors.textSecondary
        }}>
          Analyzing performance insights...
        </div>
      </Card>
    );
  }

  const getInsightIcon = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'strength': return '💪';
      case 'opportunity': return '🎯';
      case 'warning': return '⚠️';
      case 'recommendation': return '💡';
      default: return '📊';
    }
  };

  const getInsightColor = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'strength': return theme.colors.success;
      case 'opportunity': return theme.colors.info;
      case 'warning': return theme.colors.error;
      case 'recommendation': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const getImpactColor = (impact: PerformanceInsight['impact']) => {
    switch (impact) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.info;
      default: return theme.colors.textSecondary;
    }
  };

  const getImpactIcon = (impact: PerformanceInsight['impact']) => {
    switch (impact) {
      case 'high': return '🔥';
      case 'medium': return '📈';
      case 'low': return '📊';
      default: return '📋';
    }
  };

  const filteredInsights = filterType === 'all'
    ? insights
    : insights.filter(insight => insight.type === filterType);

  const insightCounts = {
    strength: insights.filter(i => i.type === 'strength').length,
    opportunity: insights.filter(i => i.type === 'opportunity').length,
    warning: insights.filter(i => i.type === 'warning').length,
    recommendation: insights.filter(i => i.type === 'recommendation').length,
  };

  const filterOptions = [
    { type: 'all' as const, label: 'All Insights', count: insights.length, color: theme.colors.primary },
    { type: 'strength' as const, label: 'Strengths', count: insightCounts.strength, color: theme.colors.success },
    { type: 'opportunity' as const, label: 'Opportunities', count: insightCounts.opportunity, color: theme.colors.info },
    { type: 'warning' as const, label: 'Warnings', count: insightCounts.warning, color: theme.colors.error },
    { type: 'recommendation' as const, label: 'Recommendations', count: insightCounts.recommendation, color: theme.colors.warning },
  ];

  return (
    <div>
      <Card style={{ padding: theme.spacing.xl }}>
        {/* Header */}
        <div style={{
          marginBottom: theme.spacing.xl,
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.sm
          }}>
            🧠 Performance Insights
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            AI-powered analysis of your performance and growth opportunities
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing.xs,
          marginBottom: theme.spacing.xl,
          justifyContent: 'center'
        }}>
          {filterOptions.map(option => (
            <button
              key={option.type}
              onClick={() => setFilterType(option.type)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.full,
                border: `2px solid ${option.color}`,
                backgroundColor: filterType === option.type
                  ? option.color
                  : 'transparent',
                color: filterType === option.type
                  ? theme.colors.white
                  : option.color,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}
            >
              {getInsightIcon(option.type === 'all' ? 'strength' : option.type)}
              {option.label}
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                opacity: 0.8,
                backgroundColor: filterType === option.type
                  ? 'rgba(255,255,255,0.2)'
                  : `${option.color}20`,
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {option.count}
              </span>
            </button>
          ))}
        </div>

        {/* Insights List */}
        {filteredInsights.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing.xl,
            color: theme.colors.textSecondary
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              marginBottom: theme.spacing.sm
            }}>
              🎯
            </div>
            <div>
              {filterType === 'all'
                ? 'No insights available at the moment'
                : `No ${filterType} insights found`
              }
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: theme.spacing.lg
          }}>
            {filteredInsights.map((insight, index) => (
              <Card
                key={index}
                style={{
                  padding: theme.spacing.lg,
                  border: `2px solid ${getInsightColor(insight.type)}20`,
                  backgroundColor: `${getInsightColor(insight.type)}05`,
                  cursor: insight.actionable ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => insight.actionable && setSelectedInsight(insight)}
              >
                {/* Background Pattern */}
                <div style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  fontSize: '4rem',
                  opacity: 0.1,
                  color: getInsightColor(insight.type),
                  pointerEvents: 'none'
                }}>
                  {getInsightIcon(insight.type)}
                </div>

                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.md
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    flex: 1
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSize.lg,
                      color: getInsightColor(insight.type)
                    }}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <h3 style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: getInsightColor(insight.type),
                      margin: 0,
                      lineHeight: 1.3
                    }}>
                      {insight.title}
                    </h3>
                  </div>

                  {/* Impact Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `2px ${theme.spacing.xs}`,
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: `${getImpactColor(insight.impact)}20`,
                    color: getImpactColor(insight.impact),
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                    textTransform: 'capitalize'
                  }}>
                    {getImpactIcon(insight.impact)}
                    {insight.impact}
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.text,
                  lineHeight: 1.5,
                  margin: `0 0 ${theme.spacing.md} 0`
                }}>
                  {insight.description}
                </p>

                {/* Actions */}
                {insight.actionable && insight.recommendedActions && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary
                    }}>
                      💡 {insight.recommendedActions.length} recommended action{insight.recommendedActions.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: getInsightColor(insight.type),
                      fontWeight: theme.typography.fontWeight.medium
                    }}>
                      Click for details →
                    </div>
                  </div>
                )}

                {!insight.actionable && (
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    fontStyle: 'italic',
                    textAlign: 'center'
                  }}>
                    Keep up the great work! 🎉
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Detailed Insight Modal */}
      {selectedInsight && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.lg
        }}>
          <Card style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: theme.spacing.xl
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: theme.spacing.xl
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm
              }}>
                <div style={{
                  fontSize: theme.typography.fontSize.xl,
                  color: getInsightColor(selectedInsight.type)
                }}>
                  {getInsightIcon(selectedInsight.type)}
                </div>
                <div>
                  <h2 style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: getInsightColor(selectedInsight.type),
                    margin: 0,
                    marginBottom: theme.spacing.xs
                  }}>
                    {selectedInsight.title}
                  </h2>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    fontSize: theme.typography.fontSize.xs,
                    color: getImpactColor(selectedInsight.impact)
                  }}>
                    {getImpactIcon(selectedInsight.impact)}
                    {selectedInsight.impact.toUpperCase()} IMPACT
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInsight(null)}
                style={{ fontSize: theme.typography.fontSize.lg }}
              >
                ✕
              </Button>
            </div>

            {/* Description */}
            <div style={{
              padding: theme.spacing.lg,
              backgroundColor: `${getInsightColor(selectedInsight.type)}10`,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg
            }}>
              <p style={{
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
                lineHeight: 1.6,
                margin: 0
              }}>
                {selectedInsight.description}
              </p>
            </div>

            {/* Recommended Actions */}
            {selectedInsight.recommendedActions && selectedInsight.recommendedActions.length > 0 && (
              <div style={{ marginBottom: theme.spacing.lg }}>
                <h3 style={{
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  marginBottom: theme.spacing.md,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm
                }}>
                  💡 Recommended Actions
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.sm
                }}>
                  {selectedInsight.recommendedActions.map((action, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: theme.spacing.sm,
                        padding: theme.spacing.md,
                        backgroundColor: theme.colors.backgroundSecondary,
                        borderRadius: theme.borderRadius.md,
                        borderLeft: `4px solid ${getInsightColor(selectedInsight.type)}`
                      }}
                    >
                      <div style={{
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: getInsightColor(selectedInsight.type),
                        color: theme.colors.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.bold,
                        marginTop: '2px'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.text,
                        lineHeight: 1.5
                      }}>
                        {action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: theme.spacing.lg,
              borderTop: `1px solid ${theme.colors.border}`
            }}>
              <Button
                variant="primary"
                onClick={() => setSelectedInsight(null)}
                style={{
                  backgroundColor: getInsightColor(selectedInsight.type),
                  borderColor: getInsightColor(selectedInsight.type)
                }}
              >
                Got It! 👍
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};