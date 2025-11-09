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
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%)`,
          borderRadius: theme.borderRadius['2xl'],
          padding: theme.spacing[8],
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          boxShadow: theme.shadows.xl,
          marginBottom: theme.spacing[8],
        }}
      >
        {/* Decorative Elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '256px',
            height: '256px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '50%',
            filter: 'blur(64px)',
            transform: 'translate(33%, -50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '256px',
            height: '256px',
            background: 'rgba(245, 158, 11, 0.05)',
            borderRadius: '50%',
            filter: 'blur(64px)',
            transform: 'translate(-33%, 50%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: theme.spacing[6],
            }}
          >
            {/* Greeting Section */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                className="text-heading-md font-[640] text-white mb-3 tracking-tighter"
                style={{
                  fontSize: '40px',
                  fontWeight: 640,
                  color: theme.colors.white,
                  marginBottom: theme.spacing[3],
                  letterSpacing: '-0.02em',
                }}
              >
                {greeting}, Admin
              </h2>
              <h1
                style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.white,
                  marginBottom: subtitle ? theme.spacing[2] : 0,
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: 460,
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Quick Stats - Modern Pills */}
            {quickStats && quickStats.length > 0 && (
              <div style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap' }}>
                {quickStats.map((stat, index) => (
                  <div
                    key={index}
                    style={{
                      padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: theme.borderRadius.xl,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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
                        color={theme.colors.white}
                      />
                    )}
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: 560,
                        color: theme.colors.white,
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

