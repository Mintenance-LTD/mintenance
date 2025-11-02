'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { formatMoney } from '@/lib/utils/currency';

interface JobAnalysisResult {
  suggestedCategory: string;
  suggestedBudget: {
    min: number;
    max: number;
    recommended: number;
  };
  suggestedTimeline: {
    minDays: number;
    maxDays: number;
    urgency: 'low' | 'medium' | 'high';
  };
  confidence: number;
  reasoning: string[];
  detectedKeywords: string[];
}

interface SmartJobAnalysisProps {
  title: string;
  description: string;
  location?: string;
  onCategorySelect: (category: string) => void;
  onBudgetSelect: (budget: number) => void;
  onUrgencySelect: (urgency: 'low' | 'medium' | 'high') => void;
}

export function SmartJobAnalysis({
  title,
  description,
  location,
  onCategorySelect,
  onBudgetSelect,
  onUrgencySelect,
}: SmartJobAnalysisProps) {
  const [analysis, setAnalysis] = useState<JobAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced analysis
  useEffect(() => {
    if (!title && !description) {
      setAnalysis(null);
      setShowSuggestions(false);
      return;
    }

    // Only analyze if we have at least 20 characters
    if ((title + description).length < 20) {
      setAnalysis(null);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/jobs/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            location,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error analyzing job:', error);
      } finally {
        setLoading(false);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [title, description, location]);

  if (!showSuggestions || !analysis) {
    return null;
  }

  const categoryNames: Record<string, string> = {
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    hvac: 'HVAC',
    roofing: 'Roofing',
    painting: 'Painting & Decorating',
    carpentry: 'Carpentry',
    gardening: 'Gardening',
    cleaning: 'Cleaning',
    flooring: 'Flooring',
    heating: 'Heating & Gas',
    handyman: 'Handyman',
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return '#10B981'; // Green
    if (confidence >= 50) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.backgroundSecondary,
      border: `2px solid ${getConfidenceColor(analysis.confidence)}40`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginTop: theme.spacing[4],
      marginBottom: theme.spacing[4],
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        marginBottom: theme.spacing[3],
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: theme.borderRadius.lg,
          backgroundColor: theme.colors.primary + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.primary,
        }}>
          <Icon name="lightBulb" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Smart Job Analysis
          </h3>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}>
            AI suggestions based on your description
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[1],
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getConfidenceColor(analysis.confidence),
          }} />
          <span style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            fontWeight: theme.typography.fontWeight.semibold,
          }}>
            {analysis.confidence}% confidence
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{
          padding: theme.spacing[4],
          textAlign: 'center',
          color: theme.colors.textSecondary,
        }}>
          Analyzing job description...
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}>
          {/* Category Suggestion */}
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing[2],
            }}>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Suggested Category
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  {categoryNames[analysis.suggestedCategory] || analysis.suggestedCategory}
                </div>
              </div>
              <button
                onClick={() => onCategorySelect(analysis.suggestedCategory)}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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
                Apply
              </button>
            </div>
          </div>

          {/* Budget Suggestion */}
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing[2],
            }}>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Suggested Budget
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  {formatMoney(analysis.suggestedBudget.recommended)}
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing[1],
                }}>
                  Range: {formatMoney(analysis.suggestedBudget.min)} - {formatMoney(analysis.suggestedBudget.max)}
                </div>
              </div>
              <button
                onClick={() => onBudgetSelect(analysis.suggestedBudget.recommended)}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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
                Apply
              </button>
            </div>
          </div>

          {/* Timeline Suggestion */}
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Estimated Timeline
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <div style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                  }}>
                    {analysis.suggestedTimeline.minDays === analysis.suggestedTimeline.maxDays
                      ? `${analysis.suggestedTimeline.minDays} day${analysis.suggestedTimeline.minDays > 1 ? 's' : ''}`
                      : `${analysis.suggestedTimeline.minDays}-${analysis.suggestedTimeline.maxDays} days`}
                  </div>
                  <span style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                    backgroundColor: getUrgencyColor(analysis.suggestedTimeline.urgency) + '15',
                    color: getUrgencyColor(analysis.suggestedTimeline.urgency),
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    textTransform: 'capitalize',
                  }}>
                    {analysis.suggestedTimeline.urgency}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onUrgencySelect(analysis.suggestedTimeline.urgency)}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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
                Apply
              </button>
            </div>
          </div>

          {/* Reasoning */}
          {analysis.reasoning.length > 0 && (
            <div style={{
              padding: theme.spacing[3],
              backgroundColor: theme.colors.backgroundTertiary,
              borderRadius: theme.borderRadius.md,
              borderLeft: `3px solid ${theme.colors.primary}`,
            }}>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[2],
              }}>
                Analysis Insights:
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: theme.spacing[4],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: 1.6,
              }}>
                {analysis.reasoning.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

