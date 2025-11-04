'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils/currency';

interface KpiCardProps {
  title: string;
  stats: Array<{
    label: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
  }>;
  actionLabel?: string;
  actionHref?: string;
}

function KpiCard({ title, stats, actionLabel, actionHref }: KpiCardProps) {
  return (
    <div style={{
      backgroundColor: theme.colors.white,
      borderRadius: '20px',
      padding: `${theme.spacing[8]} ${theme.spacing[6]}`,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      transition: 'box-shadow 0.2s ease',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[6],
      }}>
        <h2 style={{
          margin: 0,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          {title}
        </h2>
        {actionLabel && actionHref && (
          <span className="kpi-card-action-link">
            <Link
              href={actionHref}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                textDecoration: 'none',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
            >
              {actionLabel}
              <Icon name="chevronRight" size={16} color={theme.colors.primary} />
            </Link>
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: theme.spacing[6],
      }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
            minWidth: 0,
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
              lineHeight: '1.4',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}>
              {stat.label}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: theme.spacing[2],
              flexWrap: 'wrap',
            }}>
              <div style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: '1.2',
              }}>
                {stat.value}
              </div>
              {stat.change && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: `4px 10px`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: '11px',
                  fontWeight: theme.typography.fontWeight.semibold,
                  backgroundColor: 
                    stat.changeType === 'positive' ? '#D1FAE5' :
                    stat.changeType === 'negative' ? '#FEE2E2' :
                    '#F3F4F6',
                  color:
                    stat.changeType === 'positive' ? '#065F46' :
                    stat.changeType === 'negative' ? '#991B1B' :
                    theme.colors.textSecondary,
                }}>
                  {stat.change}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          .kpi-card-action-link:hover a {
            opacity: 0.7;
            transform: translateX(2px);
          }
        `
      }} />
    </div>
  );
}

interface KpiCardsProps {
  jobsData: {
    averageSize: number;
    totalRevenue: number;
    completedJobs: number;
    scheduledJobs: number;
  };
  bidsData: {
    activeBids: number;
    pendingReview: number;
    acceptedBids: number;
    averageBid: number;
  };
  propertiesData: {
    activeProperties: number;
    pendingProperties: number;
    activeSubscriptions: number;
    overdueSubscriptions: number;
  };
}

export function KpiCards({ jobsData, bidsData, propertiesData }: KpiCardsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: theme.spacing[6],
    }}>
      <KpiCard
        title="Jobs"
        actionLabel="See All"
        actionHref="/jobs"
        stats={[
          { label: 'Average Job Size', value: formatMoney(jobsData.averageSize, 'GBP'), change: '+10%', changeType: 'positive' },
          { label: 'Total Revenue', value: formatMoney(jobsData.totalRevenue, 'GBP'), change: '+54%', changeType: 'positive' },
          { label: 'Completed Jobs', value: jobsData.completedJobs, change: '+39%', changeType: 'positive' },
          { label: 'Scheduled Jobs', value: jobsData.scheduledJobs, change: '+5%', changeType: 'positive' },
        ]}
      />

      <KpiCard
        title="Bids Received"
        actionLabel="See All"
        actionHref="/jobs"
        stats={[
          { label: 'Active Bids', value: bidsData.activeBids, change: '+15%', changeType: 'positive' },
          { label: 'Pending Review', value: bidsData.pendingReview, change: '+25%', changeType: 'positive' },
          { label: 'Accepted', value: bidsData.acceptedBids, change: '+54%', changeType: 'positive' },
          { label: 'Average Bid', value: formatMoney(bidsData.averageBid, 'GBP'), change: '+5%', changeType: 'positive' },
        ]}
      />

      <KpiCard
        title="Properties & Subscriptions"
        stats={[
          { label: 'Active Properties', value: propertiesData.activeProperties, change: '+6%', changeType: 'positive' },
          { label: 'Pending Properties', value: propertiesData.pendingProperties, change: '-5%', changeType: 'negative' },
          { label: 'Active Subscriptions', value: propertiesData.activeSubscriptions, change: '-8%', changeType: 'negative' },
          { label: 'Overdue Subscriptions', value: propertiesData.overdueSubscriptions, change: '+5%', changeType: 'positive' },
        ]}
      />
    </div>
  );
}

