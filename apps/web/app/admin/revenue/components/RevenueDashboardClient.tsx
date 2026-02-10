'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RevenueKPICards } from './RevenueKPICards';
import { RevenueBreakdownChart } from './RevenueBreakdownChart';
import { RevenueTrendsChart } from './RevenueTrendsChart';
import { RevenueMRRChart } from './RevenueMRRChart';
import type { RevenueMetrics, MRRMetrics, RevenueTrend, ConversionRateData } from './RevenueTypes';
import { logger } from '@mintenance/shared';

interface RevenueDashboardClientProps {
  revenueMetrics: RevenueMetrics | null;
  mrr: MRRMetrics | null;
  conversionRate: ConversionRateData;
  arpc: number;
  trends: RevenueTrend[];
}

export function RevenueDashboardClient({
  revenueMetrics: initialRevenueMetrics,
  mrr: initialMrr,
  conversionRate: initialConversionRate,
  arpc: initialArpc,
  trends: initialTrends,
}: RevenueDashboardClientProps) {
  const [revenueMetrics, setRevenueMetrics] = useState(initialRevenueMetrics);
  const [mrr, setMrr] = useState(initialMrr);
  const [conversionRate, setConversionRate] = useState(initialConversionRate);
  const [arpc, setArpc] = useState(initialArpc);
  const [trends, setTrends] = useState(initialTrends);
  const [loading, setLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      const response = await fetch(`/api/admin/revenue?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch revenue data');
      const data = await response.json();
      setRevenueMetrics(data.revenueMetrics);
      setMrr(data.mrr);
      setConversionRate(data.conversionRate);
      setArpc(data.arpc);
      setTrends(data.trends);
    } catch (error) {
      logger.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    const interval = setInterval(() => fetchRevenueData(), 30000);
    return () => clearInterval(interval);
  }, [fetchRevenueData]);

  const handleDateRangeChange = (preset: '7d' | '30d' | '90d' | 'custom') => {
    if (preset === 'custom') return;
    const end = new Date();
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    setDateRange({ start: new Date(Date.now() - days * 24 * 60 * 60 * 1000), end });
  };

  useEffect(() => { fetchRevenueData(); }, [dateRange]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({ format, startDate: dateRange.start.toISOString(), endDate: dateRange.end.toISOString() });
      const response = await fetch(`/api/admin/revenue/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export revenue data');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting revenue:', error);
      setErrorDialog({ open: true, message: 'Failed to export revenue data' });
    }
  };

  return (
    <div className="p-8 md:p-10 max-w[1440px] mx-auto bg-slate-50 min-h-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[8] }}>
        <h1 style={{ fontSize: theme.typography.fontSize['3xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, margin: 0 }}>
          Revenue Analytics
        </h1>
        <div style={{ display: 'flex', gap: theme.spacing[2] }}>
          <Button variant="secondary" onClick={() => handleExport('csv')} style={{ fontSize: theme.typography.fontSize.sm }}>
            <Icon name="download" size={16} /> Export CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')} style={{ fontSize: theme.typography.fontSize.sm }}>
            <Icon name="download" size={16} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <AdminCard padding="sm" className="mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4], flexWrap: 'wrap' }}>
          <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textPrimary }}>
            Date Range:
          </label>
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            {(['7d', '30d', '90d'] as const).map((preset) => (
              <Button key={preset} variant="secondary" onClick={() => handleDateRangeChange(preset)} style={{ fontSize: theme.typography.fontSize.sm }}>
                {preset}
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginLeft: 'auto' }}>
            <input type="date" value={dateRange.start.toISOString().split('T')[0]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))} style={{ padding: `${theme.spacing[2]} ${theme.spacing[3]}`, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, fontSize: theme.typography.fontSize.sm }} />
            <span style={{ color: theme.colors.textSecondary }}>to</span>
            <input type="date" value={dateRange.end.toISOString().split('T')[0]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))} style={{ padding: `${theme.spacing[2]} ${theme.spacing[3]}`, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, fontSize: theme.typography.fontSize.sm }} />
          </div>
          {loading && <Icon name="loader" size={20} className="animate-spin" />}
        </div>
      </AdminCard>

      <RevenueKPICards revenueMetrics={revenueMetrics} mrr={mrr} conversionRate={conversionRate} arpc={arpc} />
      {revenueMetrics && <RevenueBreakdownChart revenueMetrics={revenueMetrics} />}
      {trends && trends.length > 0 && <RevenueTrendsChart trends={trends} />}
      {mrr && Object.keys(mrr.mrrByPlan).length > 0 && <RevenueMRRChart mrr={mrr} />}

      <AlertDialog open={errorDialog.open} onOpenChange={(open: boolean) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorDialog({ open: false, message: '' })}>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
