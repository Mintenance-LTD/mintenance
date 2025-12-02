'use client';

/**
 * Admin Dashboard for Hybrid Inference System
 *
 * Displays:
 * - Route distribution (pie chart)
 * - Average confidence by route
 * - Inference time comparison
 * - Agreement scores in hybrid mode
 * - Model performance over time
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface RoutingStats {
  totalAssessments: number;
  routeDistribution: {
    internal: number;
    gpt4_vision: number;
    hybrid: number;
  };
  averageConfidence: {
    internal: number;
    gpt4_vision: number;
    hybrid: number;
  };
  averageInferenceTime: {
    internal: number;
    gpt4_vision: number;
    hybrid: number;
  };
  agreementScores: number[];
}

interface ModelInfo {
  version: string;
  accuracy: number;
  sampleCount: number;
  trainingDate: string;
  isReady: boolean;
}

export function HybridInferenceStatsClient() {
  const [stats, setStats] = useState<RoutingStats | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // In production, this would call an API route
      // For now, this is a placeholder showing the structure
      const response = await fetch(`/api/admin/hybrid-inference/stats?range=${timeRange}`);

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data.stats);
      setModelInfo(data.modelInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!stats || !modelInfo) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        No data available. Hybrid inference may not be enabled yet.
      </div>
    );
  }

  const totalRoutes = Object.values(stats.routeDistribution).reduce((a, b) => a + b, 0);
  const routePercentages = {
    internal: totalRoutes > 0 ? (stats.routeDistribution.internal / totalRoutes) * 100 : 0,
    gpt4_vision: totalRoutes > 0 ? (stats.routeDistribution.gpt4_vision / totalRoutes) * 100 : 0,
    hybrid: totalRoutes > 0 ? (stats.routeDistribution.hybrid / totalRoutes) * 100 : 0,
  };

  const avgAgreement = stats.agreementScores.length > 0
    ? stats.agreementScores.reduce((a, b) => a + b, 0) / stats.agreementScores.length
    : 0;

  // Calculate cost savings (assuming $0.05 for GPT-4, $0.001 for internal)
  const gpt4Cost = stats.routeDistribution.gpt4_vision * 0.05;
  const internalCost = stats.routeDistribution.internal * 0.001;
  const hybridCost = stats.routeDistribution.hybrid * 0.051; // Both models
  const totalCost = gpt4Cost + internalCost + hybridCost;
  const baselineCost = stats.totalAssessments * 0.05; // All GPT-4
  const savings = baselineCost > 0 ? ((baselineCost - totalCost) / baselineCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Hybrid Inference System</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded ${
              timeRange === '7d' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded ${
              timeRange === '30d' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-4 py-2 rounded ${
              timeRange === '90d' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Model Status */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Model Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-2xl font-bold">
                {modelInfo.isReady ? (
                  <span className="text-green-600">Ready</span>
                ) : (
                  <span className="text-yellow-600">Training</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Version</div>
              <div className="text-2xl font-bold">{modelInfo.version}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="text-2xl font-bold">{(modelInfo.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Training Samples</div>
              <div className="text-2xl font-bold">{modelInfo.sampleCount.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Route Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.routeDistribution.internal}
                </div>
                <div className="text-sm text-muted-foreground">Internal</div>
                <div className="text-xs text-muted-foreground">
                  {routePercentages.internal.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.routeDistribution.gpt4_vision}
                </div>
                <div className="text-sm text-muted-foreground">GPT-4 Vision</div>
                <div className="text-xs text-muted-foreground">
                  {routePercentages.gpt4_vision.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {stats.routeDistribution.hybrid}
                </div>
                <div className="text-sm text-muted-foreground">Hybrid</div>
                <div className="text-xs text-muted-foreground">
                  {routePercentages.hybrid.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Visual bar */}
            <div className="w-full h-8 flex rounded overflow-hidden">
              <div
                className="bg-blue-500"
                style={{ width: `${routePercentages.internal}%` }}
              />
              <div
                className="bg-purple-500"
                style={{ width: `${routePercentages.gpt4_vision}%` }}
              />
              <div
                className="bg-orange-500"
                style={{ width: `${routePercentages.hybrid}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Average Confidence */}
        <Card>
          <CardHeader>
            <CardTitle>Average Confidence by Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Internal</span>
                <span className="font-bold">
                  {stats.averageConfidence.internal.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>GPT-4 Vision</span>
                <span className="font-bold">
                  {stats.averageConfidence.gpt4_vision.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hybrid</span>
                <span className="font-bold">
                  {stats.averageConfidence.hybrid.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Inference Time */}
        <Card>
          <CardHeader>
            <CardTitle>Average Inference Time (ms)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Internal</span>
                <span className="font-bold">
                  {stats.averageInferenceTime.internal.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>GPT-4 Vision</span>
                <span className="font-bold">
                  {stats.averageInferenceTime.gpt4_vision.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hybrid</span>
                <span className="font-bold">
                  {stats.averageInferenceTime.hybrid.toFixed(0)}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Savings */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current Cost</div>
              <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Baseline (All GPT-4)</div>
              <div className="text-2xl font-bold">${baselineCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Savings</div>
              <div className="text-2xl font-bold text-green-600">
                ${(baselineCost - totalCost).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Savings %</div>
              <div className="text-2xl font-bold text-green-600">{savings.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement Score */}
      {stats.agreementScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hybrid Mode Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Average agreement between Internal and GPT-4 in hybrid mode
                </span>
                <span className="text-3xl font-bold">{avgAgreement.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${avgAgreement}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.agreementScores.length} hybrid assessments analyzed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-5xl font-bold">{stats.totalAssessments.toLocaleString()}</div>
            <div className="text-muted-foreground mt-2">Total Assessments</div>
            <div className="text-sm text-muted-foreground mt-1">in the last {timeRange}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
