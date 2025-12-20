'use client';

import { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';
import {
  getPerformanceData,
  storePerformanceData,
  getPerformanceHistory,
  type PerformanceData,
  type PerformanceMetric,
} from '@/lib/performance-monitor';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function PerformancePage() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'violations'>('all');

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const data = await getPerformanceData();
      setPerformanceData(data);
      storePerformanceData(data);
    } catch (error) {
      logger.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'critical'
      ? 'text-red-700 bg-red-100 border-red-300'
      : 'text-yellow-700 bg-yellow-100 border-yellow-300';
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredMetrics =
    filter === 'violations'
      ? performanceData?.metrics.filter(m => m.rating !== 'good')
      : performanceData?.metrics;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load performance data</p>
          <Button
            onClick={loadPerformanceData}
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Performance Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor Core Web Vitals and custom performance metrics
          </p>
        </div>

        {/* Health Score Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 group relative overflow-hidden">
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Performance Health Score
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Based on {performanceData.metrics.length} metrics
              </p>
            </div>
            <div className="text-center">
              <div
                className={`text-5xl font-bold ${getHealthScoreColor(
                  performanceData.healthScore
                )}`}
              >
                {performanceData.healthScore}
              </div>
              <div className="text-sm text-gray-500 mt-1">out of 100</div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Good</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {
                      performanceData.metrics.filter(m => m.rating === 'good')
                        .length
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600">
                    Needs Improvement
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {
                      performanceData.metrics.filter(
                        m => m.rating === 'needs-improvement'
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">Poor</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {
                      performanceData.metrics.filter(m => m.rating === 'poor')
                        .length
                    }
                  </span>
                </div>
              </div>

              <Button
                onClick={loadPerformanceData}
                variant="primary"
                size="sm"
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
          >
            All Metrics
          </Button>
          <Button
            onClick={() => setFilter('violations')}
            variant={filter === 'violations' ? 'primary' : 'outline'}
            size="sm"
          >
            Violations Only ({performanceData.violations.length})
          </Button>
        </div>

        {/* Violations Alert */}
        {performanceData.violations.length > 0 && (
          <Alert className="mb-6 border-yellow-400 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              <strong>{performanceData.violations.length}</strong> performance
              budget violation(s) detected.
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {filteredMetrics?.map((metric, index) => (
            <div
              key={`${metric.name}-${index}`}
              className={`bg-white rounded-lg shadow p-6 border-2 ${getMetricColor(
                metric.rating
              )} group relative overflow-hidden`}
            >
              {/* Gradient bar - appears on hover, always visible on large screens */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{metric.name}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getMetricColor(
                    metric.rating
                  )}`}
                >
                  {metric.rating.replace('-', ' ')}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {metric.value}
                <span className="text-lg text-gray-500 ml-1">
                  {metric.name === 'CLS' ? '' : 'ms'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(metric.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        {/* Budget Violations */}
        {performanceData.violations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8 group relative overflow-hidden">
            {/* Gradient bar - appears on hover, always visible on large screens */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Budget Violations
            </h2>
            <div className="space-y-3">
              {performanceData.violations.map((violation, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${getSeverityColor(
                    violation.severity
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{violation.metric}</span>
                      <span className="ml-2 text-sm">
                        {violation.value}ms exceeds {violation.threshold}ms
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded font-medium text-sm ${
                        violation.severity === 'critical'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {violation.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Budgets Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden group relative">
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Performance Budgets
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warning
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceData.budgets.map((budget, index) => {
                  const metric = performanceData.metrics.find(
                    m => m.name === budget.metric
                  );
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {budget.metric}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {budget.warning}
                        {budget.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {budget.error}
                        {budget.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {metric ? (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getMetricColor(
                              metric.rating
                            )}`}
                          >
                            {metric.value}
                            {budget.unit} - {metric.rating}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Not measured
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Performance data is collected using the Performance Observer API and
            Web Vitals library.
          </p>
          <p className="mt-1">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
