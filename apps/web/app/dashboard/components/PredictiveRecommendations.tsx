'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { MaintenanceRecommendation } from '@/lib/services/RecommendationsService';
import { formatMoney } from '@/lib/utils/currency';

interface PredictiveRecommendationsProps {
  recommendations: MaintenanceRecommendation[];
  loading?: boolean;
}

export function PredictiveRecommendations({ recommendations, loading }: PredictiveRecommendationsProps) {
  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        padding: theme.spacing[6],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}>
            <Icon name="lightBulb" size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Predictive Recommendations
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Loading suggestions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        padding: theme.spacing[6],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}>
            <Icon name="lightBulb" size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Predictive Recommendations
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              No recommendations available yet
            </p>
          </div>
        </div>
        <p style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          margin: 0,
        }}>
          Start posting jobs to receive personalised maintenance suggestions.
        </p>
      </div>
    );
  }

  const getTypeIcon = (type: MaintenanceRecommendation['type']) => {
    switch (type) {
      case 'maintenance_schedule':
        return 'calendar';
      case 'seasonal':
        return 'clock';
      case 'cost_saving':
        return 'currencyDollar';
      case 'preventive':
        return 'shield';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority: MaintenanceRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      border: `1px solid ${theme.colors.border}`,
      padding: theme.spacing[6],
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}>
            <Icon name="lightBulb" size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Predictive Recommendations
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Personalised suggestions for your home
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
      }}>
        {recommendations.slice(0, 5).map((rec) => (
          <div
            key={rec.id}
            style={{
              padding: theme.spacing[4],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.border}`,
              display: 'flex',
              gap: theme.spacing[3],
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
              e.currentTarget.style.borderColor = theme.colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.md,
              backgroundColor: getPriorityColor(rec.priority) + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getPriorityColor(rec.priority),
              flexShrink: 0,
            }}>
              <Icon name={getTypeIcon(rec.type)} size={20} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                marginBottom: theme.spacing[1],
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  {rec.title}
                </h3>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getPriorityColor(rec.priority),
                }} />
              </div>

              <p style={{
                margin: 0,
                marginBottom: theme.spacing[2],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
              }}>
                {rec.description}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[4],
                flexWrap: 'wrap',
              }}>
                {rec.suggestedDate && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}>
                    <Icon name="calendar" size={14} />
                    <span>
                      {rec.suggestedDate.toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {rec.potentialSavings && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    fontSize: theme.typography.fontSize.xs,
                    color: '#10B981',
                    fontWeight: theme.typography.fontWeight.semibold,
                  }}>
                    <Icon name="currencyDollar" size={14} />
                    <span>Save up to {formatMoney(rec.potentialSavings)}</span>
                  </div>
                )}

                {rec.estimatedCost && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}>
                    <Icon name="currencyDollar" size={14} />
                    <span>Est. {formatMoney(rec.estimatedCost)}</span>
                  </div>
                )}
              </div>
            </div>

            {rec.actionUrl && (
              <Link
                href={rec.actionUrl}
                style={{
                  alignSelf: 'flex-start',
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>View</span>
                <Icon name="arrowRight" size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {recommendations.length > 5 && (
        <div style={{
          marginTop: theme.spacing[4],
          paddingTop: theme.spacing[4],
          borderTop: `1px solid ${theme.colors.border}`,
          textAlign: 'center',
        }}>
          <Link
            href="/recommendations"
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.primary,
              textDecoration: 'none',
              fontWeight: theme.typography.fontWeight.medium,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            View all {recommendations.length} recommendations
          </Link>
        </div>
      )}
    </div>
  );
}

