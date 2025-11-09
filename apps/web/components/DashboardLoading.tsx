'use client';

import React from 'react';
import { UnifiedSidebar } from './layouts/UnifiedSidebar';
import { SkeletonCard, SkeletonList, SkeletonText } from './ui/SkeletonLoader';
import { theme } from '@/lib/theme';

export const DashboardLoading: React.FC = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Unified Sidebar - matches actual dashboard */}
      <UnifiedSidebar 
        userRole="homeowner"
        userInfo={{
          name: undefined,
          email: undefined,
          avatar: undefined,
        }}
      />

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header Skeleton */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${theme.spacing[6]} ${theme.spacing[8]}`,
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <div>
            <div style={{
              width: '200px',
              height: '32px',
              backgroundColor: theme.colors.backgroundTertiary,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing[1],
            }} />
            <div style={{
              width: '150px',
              height: '16px',
              backgroundColor: theme.colors.backgroundTertiary,
              borderRadius: theme.borderRadius.md,
            }} />
          </div>
          <div style={{ display: 'flex', gap: theme.spacing[3] }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.backgroundTertiary,
            }} />
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.backgroundTertiary,
            }} />
          </div>
        </div>

        {/* Page Content */}
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: theme.spacing[6], width: '100%' }}>
          {/* KPI Cards Skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[6],
          }}>
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                style={{
                  padding: theme.spacing[4],
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: theme.spacing[6],
          }}>
            {/* Left Column Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
              <SkeletonCard style={{ minHeight: '300px' }} />
              <SkeletonCard style={{ minHeight: '200px' }} />
            </div>

            {/* Right Column Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
              <SkeletonCard style={{ minHeight: '250px' }} />
              <SkeletonCard style={{ minHeight: '200px' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
