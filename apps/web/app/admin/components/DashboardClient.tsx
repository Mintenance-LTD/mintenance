'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import Link from 'next/link';
import styles from '../admin.module.css';

interface DashboardMetrics {
  totalUsers: number;
  totalContractors: number;
  totalJobs: number;
  activeSubscriptions: number;
  mrr: number;
  pendingVerifications: number;
}

export function DashboardClient({ initialMetrics }: { initialMetrics: DashboardMetrics }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Real-time polling (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
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
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[8] }}>
        <div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            Admin Dashboard
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            Manage platform operations, revenue, and user activity
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          {loading && <Icon name="loader" size={20} className="animate-spin" />}
          <span style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textTertiary,
          }}>
            Last updated: {lastUpdated.toLocaleTimeString('en-GB')}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="users" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Total Users
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {metrics.totalUsers.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="briefcase" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Contractors
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {metrics.totalContractors.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="fileText" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Total Jobs
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {metrics.totalJobs.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="creditCard" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Active Subscriptions
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {metrics.activeSubscriptions.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="currencyPound" size={24} color={theme.colors.success} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Monthly Recurring Revenue
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.success,
          }}>
            £{metrics.mrr.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="clock" size={24} color="#F59E0B" />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Pending Verifications
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: '#F59E0B',
          }}>
            {metrics.pendingVerifications.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Admin Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: theme.spacing[4],
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
    </div>
  );
}

