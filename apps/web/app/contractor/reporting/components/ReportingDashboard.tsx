'use client';

import React, { useState, useMemo } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DateRangePicker, DateRange } from '@/components/ui/DateRangePicker';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { AdvancedFilters, FilterValues } from '@/components/ui/AdvancedFilters';
import { exportToCSV, ExportData, formatDateForExport, formatCurrencyForExport } from '@/lib/utils/exportUtils';

interface ReportingDashboardProps {
  analytics: {
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    totalRevenue: number;
    totalClients: number;
    activeClients: number;
    averageJobValue: number;
    customerSatisfaction: number;
    customerSatisfactionChange?: number;
    jobsByCategory: Array<{ category: string; count: number; revenue: number }>;
    revenueByMonth: Array<{ month: string; revenue: number; jobs: number }>;
    topClients: Array<{ name: string; totalSpent: number; jobsCount: number }>;
  };
}

const PERIODS = ['Week', 'Month', 'Quarter', 'Year'] as const;

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
  color?: string;
}

function MetricCard({ title, value, change, changeType, icon, color }: MetricCardProps) {
  const bgColor = color || theme.colors.primary;
  
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${bgColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon as any} size={24} color={bgColor} />
        </div>
        {change && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              borderRadius: '8px',
              backgroundColor:
                changeType === 'positive'
                  ? `${theme.colors.success}15`
                  : changeType === 'negative'
                    ? `${theme.colors.error}15`
                    : `${theme.colors.textSecondary}15`,
            }}
          >
            <Icon
              name={changeType === 'positive' ? 'arrowUp' : changeType === 'negative' ? 'arrowDown' : 'minus'}
              size={12}
              color={
                changeType === 'positive'
                  ? theme.colors.success
                  : changeType === 'negative'
                    ? theme.colors.error
                    : theme.colors.textSecondary
              }
            />
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color:
                  changeType === 'positive'
                    ? theme.colors.success
                    : changeType === 'negative'
                      ? theme.colors.error
                      : theme.colors.textSecondary,
              }}
            >
              {change}
            </span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-[460] text-gray-600 mb-1 m-0">
          {title}
        </p>
        <h3 className="text-xl font-[640] text-gray-900 m-0">
          {value}
        </h3>
      </div>
    </Card>
  );
}

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string;
}

function DonutChart({ data, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const createSlice = (percent: number, color: string, offset: number) => {
    const angle = (percent / 100) * 360;
    const startAngle = (offset / 100) * 360 - 90;
    const endAngle = startAngle + angle;
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const startX = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
    const startY = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
    const endX = 50 + 40 * Math.cos((Math.PI * endAngle) / 180);
    const endY = 50 + 40 * Math.sin((Math.PI * endAngle) / 180);
    
    return `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4], alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const slice = createSlice(percent, item.color, cumulativePercent);
            cumulativePercent += percent;
            return <path key={index} d={slice} fill={item.color} />;
          })}
          <circle cx="50" cy="50" r="28" fill={theme.colors.surface} />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold }}>
            {centerValue}
          </div>
          <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
            {centerLabel}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], width: '100%' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: item.color }} />
              <span style={{ fontSize: theme.typography.fontSize.sm }}>{item.label}</span>
            </div>
            <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold }}>
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  title: string;
}

function BarChart({ data, title }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => typeof d.value === 'number' && !isNaN(d.value) ? d.value : 0), 0);
  const safeMaxValue = maxValue > 0 ? maxValue : 1; // Prevent division by zero

  return (
    <Card>
      <h3 className="text-lg font-[560] text-gray-900 mb-6 m-0 tracking-normal">
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        {data.map((item, index) => {
          const safeValue = typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0;
          const widthPercent = (safeValue / safeMaxValue) * 100;
          const safeWidth = isFinite(widthPercent) && !isNaN(widthPercent) ? widthPercent : 0;
          
          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {item.label}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold }}>
                  £{safeValue.toLocaleString('en-GB')}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: theme.colors.background,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${safeWidth}%`,
                    height: '100%',
                    backgroundColor: theme.colors.primary,
                    borderRadius: '4px',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface LineChartProps {
  data: Array<{ month: string; revenue: number; jobs: number }>;
}

function LineChart({ data }: LineChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[6] }}>
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          >
            Revenue Trend
          </h3>
        </div>
        <div style={{ padding: theme.spacing[8], textAlign: 'center', color: theme.colors.textSecondary }}>
          No revenue data available
        </div>
      </Card>
    );
  }

  const maxRevenue = Math.max(...data.map(d => {
    const rev = typeof d?.revenue === 'number' && !isNaN(d.revenue) ? d.revenue : 0;
    return rev;
  }), 0);
  const safeMaxRevenue = maxRevenue > 0 ? maxRevenue : 1; // Prevent division by zero
  const safeDivisor = data.length > 1 ? data.length - 1 : 1; // Prevent division by zero for x calculation
  
  const points = data.map((item, index) => {
    // Calculate x position - ensure it's a valid number
    const x = (index / safeDivisor) * 100;
    const safeX = (typeof x === 'number' && isFinite(x) && !isNaN(x)) ? x : 0;
    
    // Calculate y position - ensure it's a valid number
    const revenue = (typeof item?.revenue === 'number' && !isNaN(item.revenue)) ? item.revenue : 0;
    const y = 100 - (revenue / safeMaxRevenue) * 80;
    const safeY = (typeof y === 'number' && isFinite(y) && !isNaN(y)) ? y : 100;
    
    // Ensure both values are valid numbers before joining
    const finalX = Number.isFinite(safeX) ? safeX : 0;
    const finalY = Number.isFinite(safeY) ? safeY : 100;
    
    return `${finalX},${finalY}`;
  }).join(' ');

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[6] }}>
        <h3 className="text-lg font-[560] text-gray-900 mb-6 m-0 tracking-normal">
          Revenue Trend
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <div style={{ width: '12px', height: '2px', backgroundColor: theme.colors.primary }} />
          <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Revenue</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: '200px', width: '100%' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <polyline
            points={points}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth="2"
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          {data.map((item, index) => {
            // Calculate x position - ensure it's a valid number
            const x = (index / safeDivisor) * 100;
            const safeX = (typeof x === 'number' && isFinite(x) && !isNaN(x)) ? x : 0;
            
            // Calculate y position - ensure it's a valid number
            const revenue = (typeof item?.revenue === 'number' && !isNaN(item.revenue)) ? item.revenue : 0;
            const y = 100 - (revenue / safeMaxRevenue) * 80;
            const safeY = (typeof y === 'number' && isFinite(y) && !isNaN(y)) ? y : 100;
            
            // Final validation - ensure we never pass NaN
            const finalX = Number.isFinite(safeX) ? safeX : 0;
            const finalY = Number.isFinite(safeY) ? safeY : 100;
            
            // Convert to strings for SVG attributes, ensuring they're valid numbers
            return (
              <circle
                key={index}
                cx={String(finalX)}
                cy={String(finalY)}
                r="3"
                fill={theme.colors.primary}
                style={{ vectorEffect: 'non-scaling-stroke' }}
              />
            );
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: theme.spacing[4] }}>
        {data.map((item, index) => (
          <span key={index} style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
            {item.month}
          </span>
        ))}
      </div>
    </Card>
  );
}

export function ReportingDashboard({ analytics }: ReportingDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof PERIODS)[number]>('Month');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const completionRate = analytics.totalJobs > 0 
    ? ((analytics.completedJobs / analytics.totalJobs) * 100).toFixed(1)
    : '0';

  const categoryData = analytics.jobsByCategory.map((cat, index) => ({
    label: cat.category,
    value: cat.count,
    color: [theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.info, theme.colors.error][index % 5],
  }));

  // Prepare export data
  const exportData: ExportData = useMemo(() => ({
    title: 'Business Analytics Report',
    metadata: {
      'Report Date': formatDateForExport(new Date()),
      'Period': selectedPeriod,
      'Total Jobs': analytics.totalJobs.toString(),
      'Completed Jobs': analytics.completedJobs.toString(),
      'Total Revenue': formatCurrencyForExport(analytics.totalRevenue),
    },
    headers: ['Category', 'Jobs Count', 'Revenue'],
    rows: analytics.jobsByCategory.map(cat => [
      cat.category,
      cat.count,
      formatCurrencyForExport(cat.revenue),
    ]),
  }), [analytics, selectedPeriod]);

  // Advanced filters configuration
  const filterOptions = useMemo(() => [
    {
      id: 'status',
      label: 'Job Status',
      type: 'multiselect' as const,
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'pending', label: 'Pending' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      id: 'category',
      label: 'Category',
      type: 'select' as const,
      options: analytics.jobsByCategory.map(cat => ({
        value: cat.category,
        label: cat.category,
      })),
    },
    {
      id: 'revenueRange',
      label: 'Revenue Range',
      type: 'range' as const,
      min: 0,
      max: 10000,
    },
  ], [analytics.jobsByCategory]);

  return (
    <div id="export-content" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }} className="avoid-break">
      {/* Header - Modern Design */}
      <header className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-[640] text-gray-900 mb-2 tracking-tight">
            Business Analytics
          </h1>
          <p className="text-base font-[460] text-gray-600 m-0">
            Track performance, trends, and growth metrics
          </p>
          <div className="print-only text-xs text-gray-600 mt-2">
            Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center', flexWrap: 'wrap' }} className="screen-only">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Select date range"
          />
          <AdvancedFilters
            filters={filterOptions}
            values={filterValues}
            onChange={setFilterValues}
          />
          <div className="flex gap-2 items-center bg-gray-50 rounded-xl p-1 border border-gray-200 hide-mobile">
            {PERIODS.map((period) => {
              const isActive = selectedPeriod === period;
              return (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  variant={isActive ? 'primary' : 'ghost'}
                  size="sm"
                  className="capitalize"
                >
                  {period}
                </Button>
              );
            })}
          </div>
          <ExportMenu
            data={exportData}
            filename="business-analytics-report"
            exportElementId="export-content"
            formats={['csv', 'json', 'pdf']}
            onExport={(format) => console.log(`Exported as ${format}`)}
          />
        </div>
      </header>

      {/* Key Metrics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: theme.spacing[4] }} className="kpi-grid avoid-break">
        <MetricCard
          title="Total Revenue"
          value={`£${analytics.totalRevenue.toLocaleString('en-GB')}`}
          change="+18.2%"
          changeType="positive"
          icon="currencyPound"
          color={theme.colors.success}
        />
        <MetricCard
          title="Completed Jobs"
          value={analytics.completedJobs.toString()}
          change="+12.5%"
          changeType="positive"
          icon="checkCircle"
          color={theme.colors.primary}
        />
        <MetricCard
          title="Active Clients"
          value={analytics.activeClients.toString()}
          change="+8.3%"
          changeType="positive"
          icon="users"
          color={theme.colors.info}
        />
        <MetricCard
          title="Avg Job Value"
          value={`£${analytics.averageJobValue.toFixed(0)}`}
          change="+5.1%"
          changeType="positive"
          icon="briefcase"
          color={theme.colors.warning}
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          change="+3.2%"
          changeType="positive"
          icon="chart"
          color={theme.colors.success}
        />
        <MetricCard
          title="Customer Satisfaction"
          value={`${analytics.customerSatisfaction.toFixed(1)}/5.0`}
          change={analytics.customerSatisfactionChange !== undefined && analytics.customerSatisfactionChange !== 0
            ? `${analytics.customerSatisfactionChange >= 0 ? '+' : ''}${analytics.customerSatisfactionChange.toFixed(1)}`
            : undefined}
          changeType={analytics.customerSatisfactionChange !== undefined
            ? analytics.customerSatisfactionChange >= 0 ? 'positive' : 'negative'
            : 'neutral'}
          icon="star"
          color={theme.colors.warning}
        />
      </section>

      {/* Revenue Trend */}
      <LineChart data={analytics.revenueByMonth} />

      {/* Jobs by Category and Top Clients */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: theme.spacing[6] }}>
        <Card>
          <h3
            style={{
              margin: 0,
              marginBottom: theme.spacing[6],
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          >
            Jobs by Category
          </h3>
          <DonutChart
            data={categoryData}
            centerLabel="Total Jobs"
            centerValue={analytics.totalJobs.toString()}
          />
        </Card>

        <BarChart
          title="Top Clients by Revenue"
          data={analytics.topClients.map(client => ({
            label: client.name,
            value: client.totalSpent,
          }))}
        />
      </div>

      {/* Performance Summary */}
      <Card>
        <h3 className="text-lg font-[560] text-gray-900 mb-6 m-0 tracking-normal">
          Performance Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing[6] }}>
          <div>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing[2] }}>
              {analytics.totalJobs}
            </div>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Total Jobs
            </div>
            <div style={{ marginTop: theme.spacing[2], fontSize: theme.typography.fontSize.xs, color: theme.colors.success }}>
              {analytics.activeJobs} active
            </div>
          </div>
          <div>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing[2] }}>
              {analytics.totalClients}
            </div>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Total Clients
            </div>
            <div style={{ marginTop: theme.spacing[2], fontSize: theme.typography.fontSize.xs, color: theme.colors.success }}>
              {analytics.activeClients} active
            </div>
          </div>
          <div>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing[2] }}>
              £{analytics.averageJobValue.toFixed(0)}
            </div>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Average Job Value
            </div>
            <div style={{ marginTop: theme.spacing[2], fontSize: theme.typography.fontSize.xs, color: theme.colors.primary }}>
              Per completed job
            </div>
          </div>
          <div>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing[2] }}>
              {completionRate}%
            </div>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Job Completion Rate
            </div>
            <div style={{ marginTop: theme.spacing[2], fontSize: theme.typography.fontSize.xs, color: theme.colors.success }}>
              Above industry avg
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

