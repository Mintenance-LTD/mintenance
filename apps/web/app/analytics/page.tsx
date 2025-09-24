'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { ContractorAnalyticsService } from '@/lib/services/ContractorAnalyticsService';
import { AnalyticsOverview, PerformanceTrends, PerformanceInsights } from '@/components/analytics';
import { theme } from '@/lib/theme';
import type { ContractorAnalytics, PerformanceInsight } from '@/lib/services/ContractorAnalyticsService';

export default function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [analytics, setAnalytics] = useState<ContractorAnalytics | null>(null);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'insights'>('overview');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        setCurrentUser(user);

        // Check if user is a contractor
        if (user.role !== 'contractor') {
          throw new Error('Analytics are only available for contractors');
        }

        // Load analytics data
        const [analyticsData, insightsData] = await Promise.all([
          ContractorAnalyticsService.getContractorAnalytics(user.id),
          ContractorAnalyticsService.getPerformanceInsights(user.id)
        ]);

        setAnalytics(analyticsData);
        setInsights(insightsData);

      } catch (error) {
        console.error('Failed to load analytics:', error);
        setError(error instanceof Error ? error.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const tabOptions = [
    { key: 'overview' as const, label: 'Overview', icon: '📊', description: 'Key performance metrics' },
    { key: 'trends' as const, label: 'Trends', icon: '📈', description: '12-month performance trends' },
    { key: 'insights' as const, label: 'Insights', icon: '🧠', description: 'AI-powered recommendations' }
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background
      }}>
        <div style={{
          textAlign: 'center',
          color: theme.colors.textSecondary
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            marginBottom: theme.spacing.md
          }}>
            📊
          </div>
          <div>Loading analytics data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px',
          padding: theme.spacing.xl
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            marginBottom: theme.spacing.md,
            color: theme.colors.error
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.error,
            marginBottom: theme.spacing.sm
          }}>
            Unable to Load Analytics
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.md
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.primary}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.background
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: theme.spacing.xl
      }}>
        {/* Header */}
        <div style={{
          marginBottom: theme.spacing.xl,
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.sm
          }}>
            📊 Contractor Analytics
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            Track your performance, understand your growth, and discover new opportunities
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary
            }}>
              {analytics.totalJobs}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Total Jobs
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success
            }}>
              ${analytics.totalEarnings.toFixed(0)}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Total Earnings
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.warning
            }}>
              {analytics.averageRating.toFixed(1)} ⭐
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Average Rating
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.info
            }}>
              Top {(100 - analytics.industryRankPercentile).toFixed(0)}%
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Industry Rank
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: theme.spacing.xl
        }}>
          <div style={{
            display: 'flex',
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing.xs,
            gap: theme.spacing.xs
          }}>
            {tabOptions.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.md,
                  border: 'none',
                  backgroundColor: activeTab === tab.key
                    ? theme.colors.primary
                    : 'transparent',
                  color: activeTab === tab.key
                    ? theme.colors.white
                    : theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  minWidth: '120px'
                }}
              >
                <div style={{
                  fontSize: theme.typography.fontSize.lg
                }}>
                  {tab.icon}
                </div>
                <div>{tab.label}</div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  opacity: 0.8
                }}>
                  {tab.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{
          marginBottom: theme.spacing.xl
        }}>
          {activeTab === 'overview' && (
            <AnalyticsOverview
              analytics={analytics}
              loading={false}
            />
          )}

          {activeTab === 'trends' && (
            <PerformanceTrends
              jobTrends={analytics.monthlyJobTrends}
              earningsTrends={analytics.earningsTrends}
              ratingTrends={analytics.ratingTrends}
            />
          )}

          {activeTab === 'insights' && (
            <PerformanceInsights
              insights={insights}
              loading={false}
            />
          )}
        </div>

        {/* Skills Performance Section */}
        <div style={{
          marginTop: theme.spacing.xl,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.lg,
            textAlign: 'center'
          }}>
            🛠️ Top Skills Performance
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: theme.spacing.lg
          }}>
            {analytics.topSkills.slice(0, 5).map((skill, index) => (
              <div
                key={skill.skillName}
                style={{
                  padding: theme.spacing.lg,
                  backgroundColor: `${theme.colors.info}05`,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.info}20`,
                  textAlign: 'center'
                }}
              >
                <h3 style={{
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  margin: `0 0 ${theme.spacing.sm} 0`,
                  textTransform: 'capitalize'
                }}>
                  {skill.skillName}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: theme.spacing.sm,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary
                }}>
                  <div>
                    <strong>{skill.jobCount}</strong> jobs
                  </div>
                  <div>
                    <strong>{skill.averageRating.toFixed(1)}</strong> rating
                  </div>
                  <div>
                    <strong>${skill.averageEarnings.toFixed(0)}</strong> avg
                  </div>
                  <div>
                    <span style={{
                      color: skill.demandLevel === 'high' ? theme.colors.success :
                             skill.demandLevel === 'medium' ? theme.colors.warning : theme.colors.error,
                      textTransform: 'capitalize'
                    }}>
                      <strong>{skill.demandLevel}</strong> demand
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div style={{
          marginTop: theme.spacing.xl,
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            backgroundColor: `${theme.colors.primary}10`,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.primary}20`
          }}>
            <a
              href="/jobs"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              📋 Browse New Jobs
            </a>
            <a
              href="/search"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.primary}`,
                color: theme.colors.primary,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              🔍 Find Clients
            </a>
            <a
              href="/video-calls"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.primary}`,
                color: theme.colors.primary,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              📹 Schedule Consultation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}