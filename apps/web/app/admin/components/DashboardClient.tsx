'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import Link from 'next/link';
import styles from '../admin.module.css';
import { AdminCharts } from './AdminCharts';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';

interface ChartDataPoint {
  date: string;
  users?: number;
  jobs?: number;
  cumulative?: number;
}

interface DashboardMetrics {
  totalUsers: number;
  totalContractors: number;
  totalJobs: number;
  activeSubscriptions: number;
  mrr: number;
  pendingVerifications: number;
  charts?: {
    userGrowth: ChartDataPoint[];
    jobGrowth: ChartDataPoint[];
  };
}

export function DashboardClient({ initialMetrics }: { initialMetrics: DashboardMetrics }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Real-time polling (every 30 seconds)
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/dashboard/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics(); // Initial fetch
    const interval = setInterval(fetchMetrics, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
    }}>
      <AdminPageHeader
        title="Admin Dashboard"
        subtitle="Manage platform operations, revenue, and user activity"
        variant="gradient"
        quickStats={[
          {
            label: 'users',
            value: metrics.totalUsers.toLocaleString(),
            icon: 'users',
            color: theme.colors.success,
          },
          {
            label: 'pending',
            value: metrics.pendingVerifications,
            icon: 'clock',
            color: '#F59E0B',
          },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            {loading && <Icon name="loader" size={20} className="animate-spin" color={theme.colors.white} />}
            <span style={{
              fontSize: theme.typography.fontSize.xs,
              color: 'rgba(255, 255, 255, 0.8)',
            }}>
              Updated {lastUpdated.toLocaleTimeString('en-GB')}
            </span>
          </div>
        }
      />

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <AdminMetricCard
          label="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          icon="users"
          iconColor={theme.colors.primary}
          onClick={() => window.location.href = '/admin/users'}
        />
        <AdminMetricCard
          label="Contractors"
          value={metrics.totalContractors.toLocaleString()}
          icon="briefcase"
          iconColor={theme.colors.primary}
        />
        <AdminMetricCard
          label="Total Jobs"
          value={metrics.totalJobs.toLocaleString()}
          icon="fileText"
          iconColor={theme.colors.primary}
        />
        <AdminMetricCard
          label="Active Subscriptions"
          value={metrics.activeSubscriptions.toLocaleString()}
          icon="creditCard"
          iconColor={theme.colors.primary}
        />
        <AdminMetricCard
          label="Monthly Recurring Revenue"
          value={`£${metrics.mrr.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="currencyPound"
          iconColor={theme.colors.success}
          onClick={() => window.location.href = '/admin/revenue'}
        />
        <AdminMetricCard
          label="Pending Verifications"
          value={metrics.pendingVerifications.toLocaleString()}
          icon="clock"
          iconColor="#F59E0B"
          onClick={() => window.location.href = '/admin/users?verified=pending'}
        />
      </div>

      {/* Admin Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <Link
          href="/admin/revenue"
          className={styles.adminCardLink}
        >
          <Card className={styles.adminCard} style={{
            padding: theme.spacing[6],
            cursor: 'pointer',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Icon name="trendingUp" size={32} color={theme.colors.primary} />
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Revenue Analytics
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              View subscription revenue, MRR, conversion rates, and payment tracking
            </p>
          </Card>
        </Link>

        <Link
          href="/admin/users"
          className={styles.adminCardLink}
        >
          <Card className={styles.adminCard} style={{
            padding: theme.spacing[6],
            cursor: 'pointer',
            border: `1px solid ${theme.colors.border}`,
            position: 'relative',
          }}>
            {metrics.pendingVerifications > 0 && (
              <div style={{
                position: 'absolute',
                top: theme.spacing[2],
                right: theme.spacing[2],
                backgroundColor: '#F59E0B',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.bold,
              }}>
                {metrics.pendingVerifications > 9 ? '9+' : metrics.pendingVerifications}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Icon name="users" size={32} color={theme.colors.primary} />
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                User Management
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Manage users, verify contractors{metrics.pendingVerifications > 0 ? ` (${metrics.pendingVerifications} pending)` : ''}
            </p>
          </Card>
        </Link>

        <Link
          href="/admin/security"
          className={styles.adminCardLink}
        >
          <Card className={styles.adminCard} style={{
            padding: theme.spacing[6],
            cursor: 'pointer',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Icon name="shield" size={32} color={theme.colors.primary} />
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Security Dashboard
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Monitor security events, threats, and system health
            </p>
          </Card>
        </Link>
      </div>

      {/* Charts Section */}
      {metrics.charts && (
        <AdminCharts 
          userGrowth={metrics.charts.userGrowth} 
          jobGrowth={metrics.charts.jobGrowth} 
        />
      )}
    </div>
  );
}

