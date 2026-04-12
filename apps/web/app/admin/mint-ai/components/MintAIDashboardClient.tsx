'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@mintenance/shared';

interface ShadowStats {
  total: number;
  avgAgreement: number;
  avgSafetyRecall: number;
  parseSuccessRate: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  byCategory: Array<{
    category: string;
    count: number;
    avgAgreement: number;
    avgSafetyRecall: number;
  }>;
  recent: Array<{
    category: string;
    agreement: number;
    safetyRecall: number;
    parseSuccess: boolean;
    latencyMs: number;
    createdAt: string;
  }>;
}

interface BufferStats {
  total: number;
  unused: number;
  humanVerified: number;
  avgPriority: number;
  avgSurprise: number;
  byQuality: { high: number; medium: number; low: number; uncertain: number };
  byCategory: Array<{ category: string; count: number }>;
  trainingThreshold: number;
  readyForTraining: boolean;
}

interface TrainingJob {
  id: string;
  status: string;
  modelVersion: string;
  baseModel: string;
  samplesCount: number;
  trainLoss: number | null;
  evalLoss: number | null;
  durationSeconds: number | null;
  framework: string;
  triggeredBy: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

interface TrainingStats {
  totalJobs: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  jobs: TrainingJob[];
}

interface CalibrationCategory {
  category: string;
  totalPredictions: number;
  accuracy: number;
  safetyRecall: number;
  emaAccuracy: number;
  emaSafetyRecall: number;
  lastUpdated: string;
}

interface CalibrationStats {
  totalCategories: number;
  categories: CalibrationCategory[];
  avgAccuracy: number;
  avgSafetyRecall: number;
}

interface AssessmentStats {
  total: number;
  byCanonicalType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byValidation: Array<{ status: string; count: number }>;
  avgConfidence: number;
}

interface RoutingStats {
  total: number;
  byDecision: Array<{ decision: string; count: number }>;
  avgStudentAccuracy: number;
  avgSafetyRecall: number;
}

interface DashboardData {
  shadow: ShadowStats;
  buffer: BufferStats;
  training: TrainingStats;
  calibration: CalibrationStats;
  assessments: AssessmentStats;
  routing: RoutingStats;
  timestamp: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  early: '#10B981',
  developing: '#F59E0B',
  significant: '#F97316',
  dangerous: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#10B981',
  running: '#3B82F6',
  pending: '#F59E0B',
  failed: '#EF4444',
  cancelled: '#6B7280',
};

function MetricCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className='bg-white rounded-2xl p-5 border border-gray-100'>
      <p className='text-[10px] text-[#717c82] font-bold tracking-[0.05em] uppercase'>
        {title}
      </p>
      <p
        className='text-3xl font-bold mt-1'
        style={{ color: color ?? '#2a3439' }}
      >
        {value}
      </p>
      {subtitle && <p className='text-xs text-[#717c82] mt-1'>{subtitle}</p>}
    </div>
  );
}

function ProgressBar({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className='space-y-1'>
      <div className='flex justify-between text-xs'>
        <span className='text-[#566166] font-medium'>{label}</span>
        <span className='text-[#2a3439] font-bold'>
          {value} / {max}
        </span>
      </div>
      <div className='h-2.5 bg-gray-100 rounded-full overflow-hidden'>
        <div
          className='h-full rounded-full transition-all duration-500'
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6B7280';
  return (
    <span
      className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold'
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span
        className='w-1.5 h-1.5 rounded-full'
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}

export function MintAIDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mint-ai/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch Mint AI stats', err, { service: 'admin' });
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto'>
        <div className='animate-pulse space-y-6'>
          <div className='h-12 bg-gray-200 rounded-xl w-64' />
          <div className='grid grid-cols-4 gap-6'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='h-28 bg-gray-200 rounded-2xl' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto flex items-center justify-center'>
        <div className='text-center space-y-3'>
          <p className='text-lg text-[#566166]'>
            {error ?? 'No data available'}
          </p>
          <button
            onClick={fetchData}
            className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl text-sm font-medium'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { shadow, buffer, training, calibration, assessments, routing } = data;

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Header */}
      <div className='flex justify-between items-end'>
        <div>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            Mint AI Pipeline
          </h2>
          <p className='text-[#566166] text-lg mt-2'>
            Qwen 7B distillation, shadow comparisons, training buffer,
            calibration
          </p>
        </div>
        <button
          onClick={fetchData}
          className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-medium text-sm hover:brightness-110 transition-all shadow-lg shadow-[#565e74]/20'
        >
          Refresh
        </button>
      </div>

      {/* Top Metrics */}
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
        <MetricCard
          title='Shadow Comparisons'
          value={shadow.total}
          subtitle='Student vs Teacher'
        />
        <MetricCard
          title='Training Buffer'
          value={buffer.unused}
          subtitle={`/ ${buffer.trainingThreshold} for auto-train`}
          color={buffer.readyForTraining ? '#10B981' : '#F59E0B'}
        />
        <MetricCard
          title='Training Jobs'
          value={training.completed}
          subtitle={`${training.failed} failed, ${training.running} running`}
        />
        <MetricCard
          title='Calibration Categories'
          value={calibration.totalCategories}
          subtitle={`Avg accuracy: ${(calibration.avgAccuracy * 100).toFixed(0)}%`}
        />
        <MetricCard
          title='Routing Decisions'
          value={routing.total}
          subtitle={`Student acc: ${(routing.avgStudentAccuracy * 100).toFixed(0)}%`}
        />
        <MetricCard
          title='Assessments'
          value={assessments.total}
          subtitle={`Avg conf: ${assessments.avgConfidence.toFixed(0)}%`}
        />
      </div>

      {/* Training Buffer Progress */}
      <div className='bg-white rounded-2xl p-6 border border-gray-100'>
        <h3 className='text-lg font-bold text-[#2a3439] mb-4'>
          Training Buffer Progress
        </h3>
        <ProgressBar
          value={buffer.unused}
          max={buffer.trainingThreshold}
          label='Unused examples (auto-triggers at threshold)'
          color={buffer.readyForTraining ? '#10B981' : '#3B82F6'}
        />
        <div className='grid grid-cols-4 gap-4 mt-4'>
          <div className='text-center'>
            <p className='text-2xl font-bold text-[#2a3439]'>{buffer.total}</p>
            <p className='text-xs text-[#717c82]'>Total</p>
          </div>
          <div className='text-center'>
            <p className='text-2xl font-bold text-[#2a3439]'>
              {buffer.humanVerified}
            </p>
            <p className='text-xs text-[#717c82]'>Human Verified</p>
          </div>
          <div className='text-center'>
            <p className='text-2xl font-bold text-[#2a3439]'>
              {buffer.avgSurprise.toFixed(2)}
            </p>
            <p className='text-xs text-[#717c82]'>Avg Surprise</p>
          </div>
          <div className='text-center'>
            <p className='text-2xl font-bold text-[#2a3439]'>
              {buffer.avgPriority.toFixed(2)}
            </p>
            <p className='text-xs text-[#717c82]'>Avg Priority</p>
          </div>
        </div>
        {buffer.byQuality.high +
          buffer.byQuality.medium +
          buffer.byQuality.low +
          buffer.byQuality.uncertain >
          0 && (
          <div className='flex gap-2 mt-4'>
            {Object.entries(buffer.byQuality).map(
              ([quality, count]) =>
                count > 0 && (
                  <span
                    key={quality}
                    className='px-3 py-1 rounded-full text-xs font-medium'
                    style={{
                      backgroundColor:
                        quality === 'high'
                          ? '#D1FAE5'
                          : quality === 'medium'
                            ? '#FEF3C7'
                            : quality === 'low'
                              ? '#FFEDD5'
                              : '#F3F4F6',
                      color:
                        quality === 'high'
                          ? '#065F46'
                          : quality === 'medium'
                            ? '#92400E'
                            : quality === 'low'
                              ? '#9A3412'
                              : '#6B7280',
                    }}
                  >
                    {quality}: {count}
                  </span>
                )
            )}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className='grid grid-cols-12 gap-6'>
        {/* Shadow Comparisons */}
        <div className='col-span-12 lg:col-span-8 bg-white rounded-2xl p-6 border border-gray-100'>
          <h3 className='text-lg font-bold text-[#2a3439] mb-4'>
            Shadow Comparisons by Category
          </h3>
          {shadow.byCategory.length === 0 ? (
            <p className='text-[#717c82] text-sm py-8 text-center'>
              No shadow comparisons yet. They will appear after the first
              assessment runs through the deployed pipeline.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-100'>
                    <th className='text-left py-2 text-[#717c82] font-medium'>
                      Category
                    </th>
                    <th className='text-right py-2 text-[#717c82] font-medium'>
                      Count
                    </th>
                    <th className='text-right py-2 text-[#717c82] font-medium'>
                      Agreement
                    </th>
                    <th className='text-right py-2 text-[#717c82] font-medium'>
                      Safety Recall
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shadow.byCategory.map((cat) => (
                    <tr key={cat.category} className='border-b border-gray-50'>
                      <td className='py-2 font-medium text-[#2a3439]'>
                        {cat.category.replace(/_/g, ' ')}
                      </td>
                      <td className='py-2 text-right text-[#566166]'>
                        {cat.count}
                      </td>
                      <td className='py-2 text-right'>
                        <span
                          className='font-semibold'
                          style={{
                            color:
                              cat.avgAgreement >= 0.8
                                ? '#10B981'
                                : cat.avgAgreement >= 0.5
                                  ? '#F59E0B'
                                  : '#EF4444',
                          }}
                        >
                          {(cat.avgAgreement * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className='py-2 text-right'>
                        <span
                          className='font-semibold'
                          style={{
                            color:
                              cat.avgSafetyRecall >= 0.95
                                ? '#10B981'
                                : cat.avgSafetyRecall >= 0.8
                                  ? '#F59E0B'
                                  : '#EF4444',
                          }}
                        >
                          {(cat.avgSafetyRecall * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student Calibration */}
        <div className='col-span-12 lg:col-span-4 bg-white rounded-2xl p-6 border border-gray-100'>
          <h3 className='text-lg font-bold text-[#2a3439] mb-4'>
            Student Calibration
          </h3>
          {calibration.categories.length === 0 ? (
            <p className='text-[#717c82] text-sm py-8 text-center'>
              No calibration data yet.
            </p>
          ) : (
            <div className='space-y-3'>
              {calibration.categories.slice(0, 12).map((cat) => (
                <div
                  key={cat.category}
                  className='flex justify-between items-center'
                >
                  <span className='text-xs text-[#566166] truncate max-w-[120px]'>
                    {cat.category.replace(/_/g, ' ')}
                  </span>
                  <div className='flex gap-2'>
                    <span
                      className='text-xs font-semibold px-2 py-0.5 rounded-full'
                      style={{
                        backgroundColor:
                          cat.accuracy >= 0.9 ? '#D1FAE5' : '#FEF3C7',
                        color: cat.accuracy >= 0.9 ? '#065F46' : '#92400E',
                      }}
                    >
                      {(cat.accuracy * 100).toFixed(0)}%
                    </span>
                    <span className='text-xs text-[#717c82]'>
                      {cat.totalPredictions}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Training Jobs */}
      <div className='bg-white rounded-2xl p-6 border border-gray-100'>
        <h3 className='text-lg font-bold text-[#2a3439] mb-4'>Training Jobs</h3>
        {training.jobs.length === 0 ? (
          <p className='text-[#717c82] text-sm py-8 text-center'>
            No training jobs yet.
          </p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100'>
                  <th className='text-left py-2 text-[#717c82] font-medium'>
                    Status
                  </th>
                  <th className='text-left py-2 text-[#717c82] font-medium'>
                    Model
                  </th>
                  <th className='text-right py-2 text-[#717c82] font-medium'>
                    Samples
                  </th>
                  <th className='text-right py-2 text-[#717c82] font-medium'>
                    Train Loss
                  </th>
                  <th className='text-right py-2 text-[#717c82] font-medium'>
                    Eval Loss
                  </th>
                  <th className='text-right py-2 text-[#717c82] font-medium'>
                    Duration
                  </th>
                  <th className='text-left py-2 text-[#717c82] font-medium'>
                    Framework
                  </th>
                  <th className='text-left py-2 text-[#717c82] font-medium'>
                    Trigger
                  </th>
                  <th className='text-left py-2 text-[#717c82] font-medium'>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {training.jobs.map((job) => (
                  <tr key={job.id} className='border-b border-gray-50'>
                    <td className='py-2'>
                      <StatusBadge status={job.status} />
                    </td>
                    <td className='py-2 text-[#566166] text-xs'>
                      {job.baseModel ?? 'qwen2.5-vl-3b'}
                    </td>
                    <td className='py-2 text-right text-[#2a3439] font-medium'>
                      {job.samplesCount}
                    </td>
                    <td className='py-2 text-right text-[#2a3439]'>
                      {job.trainLoss?.toFixed(4) ?? '\u2014'}
                    </td>
                    <td className='py-2 text-right text-[#2a3439]'>
                      {job.evalLoss?.toFixed(4) ?? '\u2014'}
                    </td>
                    <td className='py-2 text-right text-[#566166]'>
                      {job.durationSeconds
                        ? `${Math.round(job.durationSeconds / 60)}m`
                        : '\u2014'}
                    </td>
                    <td className='py-2'>
                      <span className='px-2 py-0.5 bg-gray-100 rounded text-xs'>
                        {job.framework}
                      </span>
                    </td>
                    <td className='py-2 text-xs text-[#566166]'>
                      {job.triggeredBy}
                    </td>
                    <td className='py-2 text-xs text-[#717c82]'>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom row: Canonical Types + Severity + Routing */}
      <div className='grid grid-cols-12 gap-6'>
        {/* Canonical Damage Types */}
        <div className='col-span-12 lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100'>
          <h3 className='text-lg font-bold text-[#2a3439] mb-4'>
            Canonical Damage Types
          </h3>
          <div className='space-y-2'>
            {assessments.byCanonicalType.slice(0, 15).map((item) => {
              const pct =
                assessments.total > 0
                  ? (item.count / assessments.total) * 100
                  : 0;
              return (
                <div key={item.type} className='flex items-center gap-3'>
                  <span className='text-xs text-[#566166] w-28 truncate'>
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-[#565e74] rounded-full'
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className='text-xs font-semibold text-[#2a3439] w-10 text-right'>
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className='col-span-12 lg:col-span-3 bg-white rounded-2xl p-6 border border-gray-100'>
          <h3 className='text-lg font-bold text-[#2a3439] mb-4'>Severity</h3>
          <div className='space-y-3'>
            {assessments.bySeverity.map((item) => (
              <div
                key={item.severity}
                className='flex items-center justify-between'
              >
                <div className='flex items-center gap-2'>
                  <span
                    className='w-3 h-3 rounded-full'
                    style={{
                      backgroundColor:
                        SEVERITY_COLORS[item.severity] ?? '#6B7280',
                    }}
                  />
                  <span className='text-sm text-[#566166] capitalize'>
                    {item.severity}
                  </span>
                </div>
                <span className='text-sm font-bold text-[#2a3439]'>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Routing Decisions */}
        <div className='col-span-12 lg:col-span-4 bg-white rounded-2xl p-6 border border-gray-100'>
          <h3 className='text-lg font-bold text-[#2a3439] mb-4'>VLM Routing</h3>
          <div className='space-y-3'>
            {routing.byDecision.map((item) => (
              <div
                key={item.decision}
                className='flex items-center justify-between'
              >
                <span className='text-sm text-[#566166]'>
                  {item.decision.replace(/_/g, ' ')}
                </span>
                <span className='text-sm font-bold text-[#2a3439]'>
                  {item.count}
                </span>
              </div>
            ))}
            <div className='pt-3 border-t border-gray-100 space-y-1'>
              <div className='flex justify-between text-xs'>
                <span className='text-[#717c82]'>Avg Student Accuracy</span>
                <span
                  className='font-semibold'
                  style={{
                    color:
                      routing.avgStudentAccuracy >= 0.9 ? '#10B981' : '#F59E0B',
                  }}
                >
                  {(routing.avgStudentAccuracy * 100).toFixed(0)}%
                </span>
              </div>
              <div className='flex justify-between text-xs'>
                <span className='text-[#717c82]'>Avg Safety Recall</span>
                <span
                  className='font-semibold'
                  style={{
                    color:
                      routing.avgSafetyRecall >= 0.95 ? '#10B981' : '#EF4444',
                  }}
                >
                  {(routing.avgSafetyRecall * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer timestamp */}
      <p className='text-xs text-[#a9b4b9] text-right'>
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
