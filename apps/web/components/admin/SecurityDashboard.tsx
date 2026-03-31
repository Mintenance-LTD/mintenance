'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { SecurityMetricsCards } from './security/SecurityMetricsCards';
import { SecurityCharts } from './security/SecurityCharts';
import { TopOffendingIPs } from './security/TopOffendingIPs';
import { RecentSecurityEvents } from './security/RecentSecurityEvents';
import type { SecurityMetrics } from './security/SecurityMetricsCards';
import type { SecurityEvent } from './security/RecentSecurityEvents';

interface SecurityDashboardProps {
  className?: string;
}

export function SecurityDashboard(props: SecurityDashboardProps) {
  const { className = '' } = props || {};
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [topIPs, setTopIPs] = useState<Array<{ ip: string; count: number }>>(
    []
  );
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>(
    '24h'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [blockDialog, setBlockDialog] = useState<{ ip: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/security-dashboard?timeframe=${timeframe}`
      );
      if (!response.ok) throw new Error('Failed to fetch security data');
      const data = await response.json();
      setMetrics(data.metrics);
      setRecentEvents(data.recent_events || []);
      setTopIPs(data.top_offending_ips || []);
      setWarning(data.warning || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setWarning(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [timeframe]);

  const resolveEvent = async (eventId: string) => {
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/security-dashboard', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ action: 'resolve_event', eventId }),
      });
      if (response.ok) await fetchSecurityData();
    } catch (err) {
      logger.error('Failed to resolve event:', err);
    }
  };

  const confirmBlockIP = async () => {
    if (!blockDialog || !blockReason.trim()) return;
    setBlocking(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/security-dashboard', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({
          action: 'block_ip',
          ipAddress: blockDialog.ip,
          reason: blockReason,
        }),
      });
      if (response.ok) await fetchSecurityData();
    } catch (err) {
      logger.error('Failed to block IP:', err);
    } finally {
      setBlocking(false);
      setBlockDialog(null);
      setBlockReason('');
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-1/4 mb-4' />
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='h-24 bg-gray-200 rounded' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className='p-6'>
          <div className='text-center'>
            <div className='text-red-600 text-xl mb-2'>
              Security Dashboard Error
            </div>
            <p className='text-gray-600 mb-4'>{error}</p>
            <Button onClick={fetchSecurityData} variant='outline'>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: theme.spacing[8],
        maxWidth: '1440px',
        margin: '0 auto',
      }}
      className={className}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[8],
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Security Dashboard
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}
          >
            Monitor security events, threats, and system health
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing[2] }}>
          {(['1h', '24h', '7d', '30d'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'primary' : 'secondary'}
              onClick={() => setTimeframe(tf)}
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Warning Banner */}
      {warning && (
        <Card
          className='mb-6'
          style={{
            padding: theme.spacing[4],
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Icon name='warning' size={20} color='#F59E0B' />
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: '#92400E',
              }}
            >
              {warning}
            </p>
          </div>
        </Card>
      )}

      {metrics && <SecurityMetricsCards metrics={metrics} />}
      {metrics && <SecurityCharts metrics={metrics} />}

      <TopOffendingIPs
        topIPs={topIPs}
        onBlockIP={(ip) => setBlockDialog({ ip })}
      />

      {/* Block IP Confirmation Dialog */}
      {blockDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => !blocking && setBlockDialog(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#1E293B',
              }}
            >
              Block IP {blockDialog.ip}?
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                marginBottom: '12px',
              }}
            >
              This IP will be blocked from accessing the platform. Provide a
              reason for the audit log.
            </p>
            <input
              type='text'
              placeholder='Reason for blocking...'
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant='outline'
                onClick={() => {
                  setBlockDialog(null);
                  setBlockReason('');
                }}
                disabled={blocking}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                onClick={confirmBlockIP}
                disabled={blocking || !blockReason.trim()}
                style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
              >
                {blocking ? 'Blocking...' : 'Block IP'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <RecentSecurityEvents events={recentEvents} onResolve={resolveEvent} />
    </div>
  );
}
