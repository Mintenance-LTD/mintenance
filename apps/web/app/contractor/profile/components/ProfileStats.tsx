'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/Button';

interface MetricsProps {
  profileCompletion: number;
  averageRating: number;
  totalReviews: number;
  jobsCompleted: number;
  winRate?: number;
}

interface ProfileStatsProps {
  metrics: MetricsProps;
  skills: Array<{ skill_name: string }>;
  onManageSkills?: () => void;
}

// Extract Performance Snapshot as a separate component
export function PerformanceSnapshot({ metrics }: { metrics: MetricsProps }) {
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
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
      <div className="mb-6 pb-4 border-b border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
          Performance Snapshot
        </h3>
        <p className="text-sm font-medium text-gray-500">
          Key metrics across your Mintenance activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricCards.map((metric, index) => {
          const gradients = [
            'from-secondary-50 to-secondary-100',
            'from-primary-50 to-primary-100',
            'from-amber-50 to-amber-100',
          ];

          return (
            <div
              key={metric.label}
              className="group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-secondary overflow-hidden"
            >
              {/* Gradient bar - appears on hover, always visible on large screens */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              {/* Background Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

              <div className="relative z-10 flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {metric.label}
                </span>
                <div className="text-4xl font-bold text-gray-900 tracking-tight">
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
                <span className="text-xs font-medium text-gray-500 leading-relaxed break-words">
                  {metric.helper}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProfileStats({ metrics, skills, onManageSkills }: ProfileStatsProps) {
  return (
    <div className="flex flex-col gap-8">
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
            <h3 className="text-xl font-[560] text-gray-900 m-0 tracking-normal">
              Services & Skills
            </h3>
            <p className="text-xs font-[460] text-gray-600 m-0">
              Showcase what you do best to attract the right jobs.
            </p>
          </div>

          {onManageSkills && (
            <Button
              type="button"
              onClick={onManageSkills}
              variant="primary"
              size="sm"
            >
              Update Skills
            </Button>
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
