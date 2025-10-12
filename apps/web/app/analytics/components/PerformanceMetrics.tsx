'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface PerformanceMetricsProps {
  avgRating: number;
  completionRate: number;
  totalJobs: number;
  activeJobs: number;
}

export function PerformanceMetrics({
  avgRating,
  completionRate,
  totalJobs,
  activeJobs,
}: PerformanceMetricsProps) {
  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[8],
      border: `1px solid ${theme.colors.border}`,
    }}>
      <h3 style={{
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing[6],
      }}>
        Performance Overview
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: theme.spacing[6],
      }}>
        {/* Average Rating */}
        <div>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[3],
          }}>
            Average Rating
          </p>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            margin: '0 auto',
          }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={theme.colors.backgroundSecondary}
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth="10"
                strokeDasharray={`${(avgRating / 5) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
              }}>
                {avgRating.toFixed(1)}
              </p>
              <p style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                / 5.0
              </p>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[3],
          }}>
            Completion Rate
          </p>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            margin: '0 auto',
          }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={theme.colors.backgroundSecondary}
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={theme.colors.success}
                strokeWidth="10"
                strokeDasharray={`${(completionRate / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
              }}>
                {completionRate.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Active Jobs */}
        <div>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[3],
          }}>
            Active Jobs
          </p>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: '50%',
            border: `10px solid ${theme.colors.warning}`,
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
              }}>
                {activeJobs}
              </p>
              <p style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                of {totalJobs}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

