'use client';

import React, { useEffect, useState } from 'react';
import { usePerformanceMonitor, useApiPerformance } from '@/hooks/usePerformanceMonitor';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { theme } from '@/lib/theme';

export const PerformanceDashboard: React.FC = () => {
  const { metrics, getPerformanceScore, reportMetrics } = usePerformanceMonitor({
    enableWebVitals: true,
    enableCustomMetrics: true,
    enableResourceTiming: true,
    reportInterval: 10000,
  });

  const { apiMetrics, getApiPerformanceReport } = useApiPerformance();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show performance dashboard in development
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  const score = getPerformanceScore();
  const apiReport = getApiPerformanceReport();

  const getScoreColor = (score: number) => {
    if (score >= 90) return theme.colors.success;
    if (score >= 70) return theme.colors.warning;
    return theme.colors.error;
  };

  const formatMetric = (value: number | null, unit: string = 'ms') => {
    if (value === null) return 'N/A';
    return `${value.toFixed(2)}${unit}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: theme.spacing[4],
        right: theme.spacing[4],
        zIndex: 1000,
        maxWidth: '300px',
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.lg,
        border: `1px solid ${theme.colors.border}`,
        padding: theme.spacing[4],
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
      }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          margin: 0,
        }}>
          Performance Monitor
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          style={{ padding: theme.spacing[1] }}
        >
          ×
        </Button>
      </div>

      {/* Overall Score */}
      <Card variant="elevated" style={{ marginBottom: theme.spacing[3] }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: theme.typography.fontWeight.bold,
            color: getScoreColor(score.overall),
            marginBottom: theme.spacing[1],
          }}>
            {score.overall}
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            Overall Score
          </div>
        </div>
      </Card>

      {/* Web Vitals */}
      <div style={{ marginBottom: theme.spacing[3] }}>
        <h4 style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[2],
          color: theme.colors.textPrimary,
        }}>
          Web Vitals
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>FCP</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.fcp)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>LCP</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.lcp)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>FID</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.fid)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>CLS</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.cls, '')}</span>
          </div>
        </div>
      </div>

      {/* Navigation Timing */}
      <div style={{ marginBottom: theme.spacing[3] }}>
        <h4 style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[2],
          color: theme.colors.textPrimary,
        }}>
          Navigation
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>TTFB</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.ttfb)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>DOM Ready</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.domContentLoaded)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>Load Complete</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{formatMetric(metrics.loadComplete)}</span>
          </div>
        </div>
      </div>

      {/* API Performance */}
      <div style={{ marginBottom: theme.spacing[3] }}>
        <h4 style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[2],
          color: theme.colors.textPrimary,
        }}>
          API Calls
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>Total</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{apiReport.totalCalls}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>Avg Duration</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{apiReport.averageDuration}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>Success Rate</span>
            <span style={{ fontSize: theme.typography.fontSize.xs }}>{apiReport.successRate}%</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: theme.spacing[2] }}>
        <Button
          variant="outline"
          size="sm"
          onClick={reportMetrics}
          style={{ flex: 1 }}
        >
          Report
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          style={{ flex: 1 }}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};
