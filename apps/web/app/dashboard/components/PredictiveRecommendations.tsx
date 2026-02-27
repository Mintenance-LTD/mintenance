'use client';

import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = React.useCallback((type: MaintenanceRecommendation['type']): string => {
    switch (type) {
      case 'maintenance_schedule': return 'calendar';
      case 'seasonal': return 'clock';
      case 'cost_saving': return 'currencyDollar';
      case 'preventive': return 'shield';
      default: return 'info';
    }
  }, []);

  const getPriorityColor = (priority: MaintenanceRecommendation['priority']) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return theme.colors.textSecondary;
    }
  };

  const highCount = recommendations.filter(r => r.priority === 'high').length;

  // Compact collapsed header — always rendered
  const header = (
    <button
      onClick={() => setIsExpanded(prev => !prev)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
      }}
      aria-expanded={isExpanded}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: theme.borderRadius.md,
          backgroundColor: theme.colors.backgroundSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.primary,
          flexShrink: 0,
        }}>
          <Icon name="lightBulb" size={18} />
        </div>
        <div>
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Recommendations
          </span>
          {!loading && recommendations.length > 0 && (
            <span style={{
              marginLeft: theme.spacing[2],
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              borderRadius: '10px',
              backgroundColor: highCount > 0 ? '#EF4444' : theme.colors.primary,
              color: 'white',
              fontSize: '11px',
              fontWeight: theme.typography.fontWeight.bold,
            }}>
              {recommendations.length}
            </span>
          )}
        </div>
      </div>
      <div style={{
        color: theme.colors.textSecondary,
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
        flexShrink: 0,
      }}>
        <Icon name="chevronDown" size={16} />
      </div>
    </button>
  );

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      }}>
        {header}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null; // No clutter when nothing to show
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      border: `1px solid ${theme.colors.border}`,
      overflow: 'hidden',
    }}>
      {/* Collapsed header — always visible */}
      <div style={{ padding: `${theme.spacing[3]} ${theme.spacing[4]}` }}>
        {header}
      </div>

      {/* Expandable body */}
      {isExpanded && (
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}>
          {recommendations.slice(0, 5).map((rec) => {
            const iconName = getTypeIcon(rec.type);
            return (
              <div
                key={rec.id}
                style={{
                  padding: theme.spacing[3],
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
                  width: '36px',
                  height: '36px',
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: getPriorityColor(rec.priority) + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getPriorityColor(rec.priority),
                  flexShrink: 0,
                }}>
                  <Icon name={iconName} size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[1],
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {rec.title}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: getPriorityColor(rec.priority),
                      flexShrink: 0,
                    }} />
                  </div>

                  <p style={{
                    margin: 0,
                    marginBottom: theme.spacing[2],
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    lineHeight: 1.5,
                  }}>
                    {rec.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                    flexWrap: 'wrap',
                  }}>
                    {rec.potentialSavings && (
                      <span style={{
                        fontSize: '11px',
                        color: '#10B981',
                        fontWeight: theme.typography.fontWeight.semibold,
                      }}>
                        Save up to {formatMoney(rec.potentialSavings)}
                      </span>
                    )}
                    {rec.estimatedCost && (
                      <span style={{
                        fontSize: '11px',
                        color: theme.colors.textSecondary,
                      }}>
                        Est. {formatMoney(rec.estimatedCost)}
                      </span>
                    )}
                  </div>
                </div>

                {rec.actionUrl && (
                  <Link
                    href={rec.actionUrl}
                    style={{
                      alignSelf: 'center',
                      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                      backgroundColor: theme.colors.primary,
                      color: 'white',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >
                    View
                  </Link>
                )}
              </div>
            );
          })}

          {recommendations.length > 5 && (
            <Link
              href="/recommendations"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.primary,
                textDecoration: 'none',
                fontWeight: theme.typography.fontWeight.medium,
                paddingTop: theme.spacing[2],
                borderTop: `1px solid ${theme.colors.border}`,
              }}
            >
              View all {recommendations.length} recommendations →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
