/**
 * Migration Monitoring Dashboard
 * Real-time tracking of API route migration progress
 */
'use client';
import { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';
import { createBrowserClient } from '@supabase/ssr';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Migration Dashboard | Mintenance Admin',
  description: 'Real-time monitoring of API route migration progress, feature flags, and controller usage statistics.',
};

interface FeatureFlagStat {
  name: string;
  enabled: boolean;
  rollout_percentage: number;
  users_with_new: number;
  users_with_old: number;
  new_controller_calls: number;
  old_controller_calls: number;
  last_used_at: string;
}
interface MigrationStat {
  totalRoutes: number;
  migratedRoutes: number;
  inProgressRoutes: number;
  pendingRoutes: number;
  successRate: number;
  errorRate: number;
}
export default function MigrationDashboard() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagStat[]>([]);
  const [migrationStats, setMigrationStats] = useState<MigrationStat>({
    totalRoutes: 248,
    migratedRoutes: 5,
    inProgressRoutes: 0,
    pendingRoutes: 243,
    successRate: 99.5,
    errorRate: 0.5
  });
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);
  const fetchData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      // Fetch feature flag statistics
      const { data: flagStats, error: flagError } = await supabase
        .from('feature_flag_stats')
        .select('*')
        .order('name');
      if (!flagError && flagStats) {
        setFeatureFlags(flagStats);
      }
      // Fetch controller usage logs for error rate
      const { data: logs, error: logsError } = await supabase
        .from('controller_usage_logs')
        .select('module, is_new_controller, metadata')
        .gte('logged_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('logged_at', { ascending: false })
        .limit(1000);
      if (!logsError && logs) {
        // Calculate success/error rates
        type LogEntry = { is_new_controller: boolean; module: string; metadata?: { error?: unknown } };
        const typedLogs = logs as LogEntry[];
        const newControllerLogs = typedLogs.filter((l) => l.is_new_controller);
        const errorLogs = newControllerLogs.filter((l) =>
          l.metadata?.error || l.module.includes('fallback')
        );
        const errorRate = newControllerLogs.length > 0
          ? (errorLogs.length / newControllerLogs.length) * 100
          : 0;
        setMigrationStats(prev => ({
          ...prev,
          errorRate: parseFloat(errorRate.toFixed(2)),
          successRate: parseFloat((100 - errorRate).toFixed(2))
        }));
      }
      setLoading(false);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };
  const getStatusColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-500';
    if (percentage < 25) return 'bg-yellow-500';
    if (percentage < 50) return 'bg-blue-500';
    if (percentage < 75) return 'bg-indigo-500';
    return 'bg-green-500';
  };
  const getErrorRateColor = (rate: number) => {
    if (rate === 0) return 'text-green-600';
    if (rate < 0.5) return 'text-green-500';
    if (rate < 1) return 'text-yellow-500';
    if (rate < 5) return 'text-orange-500';
    return 'text-red-500';
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading migration dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  const migrationProgress = (migrationStats.migratedRoutes / migrationStats.totalRoutes) * 100;
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Migration Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time monitoring of controller migration progress</p>
        </div>
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Routes</p>
                <p className="text-2xl font-semibold mt-1">{migrationStats.totalRoutes}</p>
              </div>
              <div className="text-blue-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Migrated</p>
                <p className="text-2xl font-semibold mt-1 text-green-600">
                  {migrationStats.migratedRoutes}
                </p>
              </div>
              <div className="text-green-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Success Rate</p>
                <p className={`text-2xl font-semibold mt-1 ${getErrorRateColor(100 - migrationStats.successRate)}`}>
                  {migrationStats.successRate}%
                </p>
              </div>
              <div className="text-indigo-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Error Rate</p>
                <p className={`text-2xl font-semibold mt-1 ${getErrorRateColor(migrationStats.errorRate)}`}>
                  {migrationStats.errorRate}%
                </p>
              </div>
              <div className="text-red-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Overall Migration Progress</h2>
            <span className="text-2xl font-bold text-blue-600">
              {migrationProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${migrationProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{migrationStats.migratedRoutes} migrated</span>
            <span>{migrationStats.pendingRoutes} remaining</span>
          </div>
        </div>
        {/* Feature Flags Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Controller Feature Flags (Last 24 Hours)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Controller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rollout %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users (New/Old)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls (New/Old)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {featureFlags.map((flag) => (
                  <tr key={flag.name}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {flag.name.replace('new-', '').replace('-controller', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        flag.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2 text-sm text-gray-900">
                          {flag.rollout_percentage || 0}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getStatusColor(flag.rollout_percentage || 0)}`}
                            style={{ width: `${flag.rollout_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="text-green-600">{flag.users_with_new || 0}</span>
                      {' / '}
                      <span className="text-gray-600">{flag.users_with_old || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="text-green-600">{flag.new_controller_calls || 0}</span>
                      {' / '}
                      <span className="text-gray-600">{flag.old_controller_calls || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {flag.last_used_at
                        ? new Date(flag.last_used_at).toLocaleString()
                        : 'Never'
                      }
                    </td>
                  </tr>
                ))}
                {featureFlags.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No data available. Feature flags may not be configured in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Auto-refresh control */}
        <div className="mt-8 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-600">
              Auto-refresh interval:
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds</option>
              <option value="60000">1 minute</option>
              <option value="300000">5 minutes</option>
            </select>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}