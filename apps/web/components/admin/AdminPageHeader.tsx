'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface QuickStat {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
}

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  quickStats?: QuickStat[];
  variant?: 'default' | 'gradient';
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  quickStats,
  variant = 'default',
}: AdminPageHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  if (variant === 'gradient') {
    return (
      <div
        className="relative overflow-hidden rounded-[16px] p-8 md:p-10 border border-white/10 shadow-[0_8px_24px_rgba(15,23,42,0.25)] mb-10"
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E293B 100%)',
        }}
      >
        {/* Decorative Elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '320px',
            height: '320px',
            background: 'rgba(30, 41, 59, 0.2)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            transform: 'translate(25%, -30%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '280px',
            height: '280px',
            background: 'rgba(15, 23, 42, 0.15)',
            borderRadius: '50%',
            filter: 'blur(70px)',
            transform: 'translate(-25%, 30%)',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-6">
            {/* Greeting Section */}
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight leading-tight">
                {greeting}, Admin
              </h2>
              <h1 className="text-xl md:text-2xl font-bold text-white/95 mb-3">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Quick Stats - Modern Pills */}
            {quickStats && quickStats.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {quickStats.map((stat, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center gap-2 transition-all duration-200 hover:bg-white/20"
                  >
                    {stat.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stat.color }}
                      />
                    )}
                    {stat.icon && (
                      <Icon
                        name={stat.icon}
                        size={16}
                        color="#FFFFFF"
                      />
                    )}
                    <span className="text-sm font-semibold text-white">
                      {stat.value} {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div style={{ marginBottom: theme.spacing[8] }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: theme.spacing[4],
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1
            className="text-heading-md font-[640] text-gray-900 mb-3 tracking-tighter"
            style={{
              fontSize: '40px',
              fontWeight: 640,
              color: theme.colors.textPrimary,
              marginBottom: subtitle ? theme.spacing[3] : 0,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: 460,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        {quickStats && quickStats.length > 0 && (
          <div style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap' }}>
            {quickStats.map((stat, index) => (
              <div
                key={index}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {stat.color && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: stat.color,
                    }}
                  />
                )}
                {stat.icon && (
                  <Icon
                    name={stat.icon}
                    size={16}
                    color={stat.color || theme.colors.textSecondary}
                  />
                )}
                <span
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: 560,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {stat.value} {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

