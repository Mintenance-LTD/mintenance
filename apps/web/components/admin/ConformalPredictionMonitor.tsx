/**
 * Conformal Prediction Monitoring Dashboard
 * Displays real-time metrics about conformal prediction usage in routing decisions
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoIcon, TrendingUpIcon, ActivityIcon } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface ConformalMetrics {
  totalWithConformal: number;
  totalWithoutConformal: number;
  calibrationCoverage: number;
  avgIntervalSize: number;
  uniqueStrata: number;
  avgInferenceTimeWith: number;
  avgInferenceTimeWithout: number;
}

interface StratumPerformance {
  stratum: string;
  propertyAgeCategory: string;
  totalDecisions: number;
  avgIntervalSize: number;
  internalRate: number;
  hybridRate: number;
  gpt4Rate: number;
  avgInferenceTime: number;
}

interface IntervalDistribution {
  intervalSize: number;
  count: number;
  internalCount: number;
  hybridCount: number;
  gpt4Count: number;
}

export const ConformalPredictionMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<ConformalMetrics | null>(null);
  const [stratumPerformance, setStratumPerformance] = useState<StratumPerformance[]>([]);
  const [intervalDistribution, setIntervalDistribution] = useState<IntervalDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchMetrics();
    fetchStratumPerformance();
    fetchIntervalDistribution();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('calculate_conformal_effectiveness', {
        p_start_date: getStartDate(timeRange),
        p_end_date: new Date().toISOString(),
      });

      if (error) throw error;

      const metricsMap: unknown = {};
      data.forEach((row: unknown) => {
        metricsMap[row.metric_name] = row.metric_value;
      });

      setMetrics({
        totalWithConformal: metricsMap.total_with_conformal || 0,
        totalWithoutConformal: metricsMap.total_without_conformal || 0,
        calibrationCoverage: metricsMap.calibration_coverage_pct || 0,
        avgIntervalSize: metricsMap.avg_interval_size || 0,
        uniqueStrata: metricsMap.unique_strata_used || 0,
        avgInferenceTimeWith: metricsMap.avg_inference_time_with_conformal_ms || 0,
        avgInferenceTimeWithout: metricsMap.avg_inference_time_without_conformal_ms || 0,
      });
    } catch (err) {
      logger.error('Error fetching metrics:', err', [object Object], { service: 'ui' });
      setError('Failed to load conformal prediction metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchStratumPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('mv_stratum_routing_performance')
        .select('*')
        .order('total_decisions', { ascending: false })
        .limit(10);

      if (error) throw error;

      setStratumPerformance(
        data.map((row) => ({
          stratum: row.conformal_stratum,
          propertyAgeCategory: row.property_age_category,
          totalDecisions: row.total_decisions,
          avgIntervalSize: row.avg_interval_size,
          internalRate: row.internal_rate * 100,
          hybridRate: row.hybrid_rate * 100,
          gpt4Rate: row.gpt4_rate * 100,
          avgInferenceTime: row.avg_inference_time,
        }))
      );
    } catch (err) {
      logger.error('Error fetching stratum performance:', err', [object Object], { service: 'ui' });
    }
  };

  const fetchIntervalDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('v_conformal_routing_analytics')
        .select('conformal_interval_size, route_selected, decision_count')
        .gte('created_at', getStartDate(timeRange))
        .not('conformal_interval_size', 'is', null);

      if (error) throw error;

      const grouped: Record<number, IntervalDistribution> = {};

      data.forEach((row) => {
        const size = row.conformal_interval_size;
        if (!grouped[size]) {
          grouped[size] = {
            intervalSize: size,
            count: 0,
            internalCount: 0,
            hybridCount: 0,
            gpt4Count: 0,
          };
        }

        grouped[size].count += row.decision_count;

        switch (row.route_selected) {
          case 'internal':
            grouped[size].internalCount += row.decision_count;
            break;
          case 'hybrid':
            grouped[size].hybridCount += row.decision_count;
            break;
          case 'gpt4_vision':
            grouped[size].gpt4Count += row.decision_count;
            break;
        }
      });

      setIntervalDistribution(Object.values(grouped).sort((a, b) => a.intervalSize - b.intervalSize));
    } catch (err) {
      logger.error('Error fetching interval distribution:', err', [object Object], { service: 'ui' });
    }
  };

  const getStartDate = (range: '7d' | '30d' | '90d'): string => {
    const date = new Date();
    switch (range) {
      case '7d':
        date.setDate(date.getDate() - 7);
        break;
      case '30d':
        date.setDate(date.getDate() - 30);
        break;
      case '90d':
        date.setDate(date.getDate() - 90);
        break;
    }
    return date.toISOString();
  };

  const getIntervalColor = (size: number): string => {
    switch (size) {
      case 1:
        return '#10b981'; // Green for certain
      case 2:
        return '#f59e0b'; // Amber for moderate
      default:
        return '#ef4444'; // Red for high uncertainty
    }
  };

  const getCoverageStatus = (coverage: number): { color: string; label: string } => {
    if (coverage >= 80) return { color: 'bg-green-500', label: 'Excellent' };
    if (coverage >= 60) return { color: 'bg-yellow-500', label: 'Good' };
    if (coverage >= 40) return { color: 'bg-orange-500', label: 'Fair' };
    return { color: 'bg-red-500', label: 'Poor' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertDescription>No conformal prediction data available</AlertDescription>
      </Alert>
    );
  }

  const coverageStatus = getCoverageStatus(metrics.calibrationCoverage);
  const timeSavings = metrics.avgInferenceTimeWithout - metrics.avgInferenceTimeWith;
  const timeSavingsPercent = metrics.avgInferenceTimeWithout > 0
    ? (timeSavings / metrics.avgInferenceTimeWithout) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Conformal Prediction Monitor</h2>
          <p className="text-muted-foreground">
            Calibrated uncertainty quantification for routing decisions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded ${timeRange === '7d' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded ${timeRange === '30d' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-1 rounded ${timeRange === '90d' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calibration Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.calibrationCoverage.toFixed(1)}%</span>
              <Badge className={coverageStatus.color}>{coverageStatus.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalWithConformal} of {metrics.totalWithConformal + metrics.totalWithoutConformal} assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Interval Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.avgIntervalSize.toFixed(2)}</span>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lower is better (1 = certain)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{timeSavings.toFixed(0)}ms</span>
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {timeSavingsPercent.toFixed(1)}% faster with conformal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Strata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.uniqueStrata}</span>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique calibration groups
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distribution">
        <TabsList>
          <TabsTrigger value="distribution">Interval Distribution</TabsTrigger>
          <TabsTrigger value="routing">Routing by Certainty</TabsTrigger>
          <TabsTrigger value="strata">Stratum Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Prediction Interval Distribution</CardTitle>
              <CardDescription>
                Distribution of prediction interval sizes and their routing decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={intervalDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="intervalSize"
                    label={{ value: 'Interval Size', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="internalCount" name="Internal" fill="#10b981" stackId="a" />
                  <Bar dataKey="hybridCount" name="Hybrid" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="gpt4Count" name="GPT-4" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle>Routing Decisions by Certainty Level</CardTitle>
              <CardDescription>
                How prediction certainty affects routing decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'Certain (Size 1)',
                        value: intervalDistribution.find(d => d.intervalSize === 1)?.count || 0,
                        color: '#10b981',
                      },
                      {
                        name: 'Moderate (Size 2)',
                        value: intervalDistribution.find(d => d.intervalSize === 2)?.count || 0,
                        color: '#f59e0b',
                      },
                      {
                        name: 'Uncertain (Size 3+)',
                        value: intervalDistribution
                          .filter(d => d.intervalSize >= 3)
                          .reduce((sum, d) => sum + d.count, 0),
                        color: '#ef4444',
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {intervalDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getIntervalColor(entry.intervalSize)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strata">
          <Card>
            <CardHeader>
              <CardTitle>Stratum Performance</CardTitle>
              <CardDescription>
                Performance metrics by property age and damage type stratification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Stratum</th>
                      <th className="text-right p-2">Decisions</th>
                      <th className="text-right p-2">Avg Interval</th>
                      <th className="text-right p-2">Internal %</th>
                      <th className="text-right p-2">Hybrid %</th>
                      <th className="text-right p-2">GPT-4 %</th>
                      <th className="text-right p-2">Avg Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stratumPerformance.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{row.stratum}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.propertyAgeCategory}
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2">{row.totalDecisions}</td>
                        <td className="text-right p-2">
                          <Badge variant={row.avgIntervalSize <= 1.5 ? 'success' : 'warning'}>
                            {row.avgIntervalSize.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="text-right p-2 text-green-600">
                          {row.internalRate.toFixed(1)}%
                        </td>
                        <td className="text-right p-2 text-amber-600">
                          {row.hybridRate.toFixed(1)}%
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {row.gpt4Rate.toFixed(1)}%
                        </td>
                        <td className="text-right p-2">{row.avgInferenceTime.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Conformal Prediction Benefits:</strong>
          <ul className="list-disc list-inside mt-2">
            <li>Mathematically guaranteed coverage at specified confidence level (90%)</li>
            <li>Reduced false positives through calibrated uncertainty</li>
            <li>Stratified by property age (Victorian, post-war, modern) for better accuracy</li>
            <li>Automatic fallback to broader strata when insufficient calibration data</li>
            <li>Small sample correction (SSBC) for reliable intervals with limited data</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};