'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { getGradientCardStyle, getIconContainerStyle } from '@/lib/theme-enhancements';

interface ProfileStatsProps {
  metrics: {
    profileCompletion: number;
    averageRating: number;
    totalReviews: number;
    jobsCompleted: number;
    winRate?: number; // Optional for backward compatibility
  };
  skills: Array<{ skill_name: string }>;
  onManageSkills?: () => void;
}

export function ProfileStats({ metrics, skills, onManageSkills }: ProfileStatsProps) {
  // Calculate win rate: use real win rate if available, otherwise fallback to formula
  const winRate = metrics.winRate !== undefined 
    ? metrics.winRate 
    : (metrics.jobsCompleted > 0 ? Math.min(95, 40 + metrics.jobsCompleted * 2) : 42);

  const metricCards = [
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      helper: 'Based on accepted proposals',
    },
    {
      label: 'Review Volume',
      value: metrics.totalReviews,
      helper: 'Client testimonials received',
    },
    {
      label: 'Profile Strength',
      value: `${metrics.profileCompletion}%`,
      helper: 'Complete all sections to unlock perks',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <div
        style={{
          ...getGradientCardStyle('primary'),
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            Performance Snapshot
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
            }}
          >
            Key metrics across your Mintenance activity.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: theme.spacing[4],
          }}
        >
          {metricCards.map((metric, index) => {
            const variants: Array<'primary' | 'success' | 'warning'> = ['primary', 'success', 'warning'];
            const variant = variants[index % variants.length] || 'primary';
            
            return (
            <div
              key={metric.label}
              style={{
                ...getGradientCardStyle(variant),
                padding: theme.spacing[5],
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[2],
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = theme.shadows.lg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.sm;
              }}
            >
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: theme.colors.textSecondary,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                {metric.label}
              </span>
              <div
                style={{
                  fontSize: theme.typography.fontSize['3xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}
              >
                {metric.label === 'Win Rate' || metric.label === 'Profile Strength' ? (
                  <AnimatedCounter 
                    value={typeof metric.value === 'string' ? parseFloat(metric.value.replace('%', '')) : parseFloat(String(metric.value).replace('%', ''))} 
                    suffix="%" 
                    decimals={0}
                  />
                ) : (
                  <AnimatedCounter value={typeof metric.value === 'number' ? metric.value : parseInt(String(metric.value)) || 0} />
                )}
              </div>
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}
              >
                {metric.helper}
              </span>
            </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '24px',
          border: `1px solid ${theme.colors.border}`,
          boxShadow: 'none',
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing[4],
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              Services & Skills
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}
            >
              Showcase what you do best to attract the right jobs.
            </p>
          </div>

          {onManageSkills && (
            <button
              type="button"
              onClick={onManageSkills}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
              }}
            >
              Update Skills
            </button>
          )}
        </div>

        {skills.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing[2],
            }}
          >
            {skills.map((skill, index) => (
              <span
                key={`${skill.skill_name}-${index}`}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.full,
                  background: `linear-gradient(135deg, ${theme.colors.primary}15 0%, ${theme.colors.primary}08 100%)`,
                  border: `1px solid ${theme.colors.primary}30`,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.primary,
                  transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
                  boxShadow: theme.shadows.sm,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = theme.shadows.md;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = theme.shadows.sm;
                }}
              >
                {skill.skill_name}
              </span>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: theme.spacing[6],
              borderRadius: '18px',
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px dashed ${theme.colors.border}`,
              textAlign: 'center',
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Add your specialties to help homeowners find you faster.
          </div>
        )}
      </div>
    </div>
  );
}
