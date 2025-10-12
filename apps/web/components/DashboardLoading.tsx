'use client';

import React from 'react';
import { Layout } from './ui/Layout';
import { SkeletonCard, SkeletonList, SkeletonText, SkeletonButton } from './ui/SkeletonLoader';
import { Breadcrumbs } from './ui/Breadcrumbs';
import { theme } from '@/lib/theme';

export const DashboardLoading: React.FC = () => {
  return (
    <Layout
      title="Dashboard"
      subtitle="Loading..."
      navigation={[
        { label: 'Overview', href: '/dashboard', active: true },
        { label: 'Jobs', href: '/jobs' },
        { label: 'Contractors', href: '/contractors' },
        { label: 'Messages', href: '/messages', badge: 3 },
        { label: 'Payments', href: '/payments' },
        { label: 'Analytics', href: '/analytics' },
      ]}
    >
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', current: true }
        ]}
        style={{ marginBottom: theme.spacing[6] }}
      />

      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: theme.spacing[6],
        marginBottom: theme.spacing[8],
      }}>
        {/* Welcome Card Skeleton */}
        <SkeletonCard style={{ minHeight: '200px' }} />
        
        {/* Quick Actions Card Skeleton */}
        <SkeletonCard style={{ minHeight: '200px' }} />
        
        {/* Recent Activity Card Skeleton */}
        <SkeletonCard style={{ minHeight: '200px' }} />
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            style={{
              padding: theme.spacing[4],
              backgroundColor: 'white',
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.base,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <SkeletonText lines={2} />
            <SkeletonButton width={60} style={{ marginTop: theme.spacing[2] }} />
          </div>
        ))}
      </div>

      {/* Recent Jobs Skeleton */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.base,
        border: `1px solid ${theme.colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: theme.spacing[4],
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <SkeletonText lines={1} />
        </div>
        <SkeletonList count={5} />
      </div>
    </Layout>
  );
};
