'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { AlertCircle, TrendingDown, TrendingUp, Activity, RefreshCw, Bell, Settings, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface DriftMetrics {
  timestamp: string;
  driftScore: number;
  driftType: string;
  affectedFeatures: string[];
}

interface PerformanceMetrics {
  timestamp: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

interface ModelVersion {
  version: string;
  deployedAt: string;
  status: 'active' | 'shadow' | 'canary' | 'inactive';
  rolloutPercentage: number;
  metrics: PerformanceMetrics;
}

interface RetrainingJob {
  id: string;
  status: 'pending' | 'training' | 'validation' | 'testing' | 'deployed' | 'failed';
  progress: number;
  trigger: string;
  startedAt: string;
  estimatedCompletion?: string;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export function ModelMonitoringDashboard() {
  const [driftMetrics, setDriftMetrics] = useState<DriftMetrics[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentModel, setCurrentModel] = useState<ModelVersion | null>(null);
  const [candidateModels, setCandidateModels] = useState<ModelVersion[]>([]);
  const [retrainingJob, setRetrainingJob] = useState<RetrainingJob | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [isAutoRetrainEnabled, setIsAutoRetrainEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, refreshInterval);

    // Set up real-time subscriptions
    const driftSubscription = supabase
      .channel('drift-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'model_performance_snapshots'
      }, handleDriftUpdate)
      .subscribe();

    const alertSubscription = supabase
      .channel('alert-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'drift_notifications'
      }, handleAlertUpdate)
      .subscribe();

    return () => {
      clearInterval(interval);
      driftSubscription.unsubscribe();
      alertSubscription.unsubscribe();
    };
  }, [refreshInterval]);

  const fetchDashboardData = async () => {
    try {
      // Fetch drift metrics
      const { data: driftData } = await supabase
        .from('model_performance_snapshots')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (driftData) {
        setDriftMetrics(driftData.map((d: any) => ({
          timestamp: d.timestamp,
          driftScore: d.metrics?.driftScore || 0,
          driftType: d.metrics?.driftType || 'none',
          affectedFeatures: d.metrics?.affectedFeatures || []
        })));

        setPerformanceMetrics(driftData.map((d: any) => ({
          timestamp: d.timestamp,
          accuracy: d.metrics?.accuracy || 0,
          precision: d.metrics?.precision || 0,
          recall: d.metrics?.recall || 0,
          f1Score: d.metrics?.f1Score || 0
        })));
      }

      // Fetch current model info
      const { data: configData } = await supabase
        .from('system_config')
        .select('*')
        .in('key', ['current_model_version', 'canary_deployment', 'shadow_deployment']);

      if (configData) {
        const currentVersion = configData.find(c => c.key === 'current_model_version')?.value?.version;
        const canaryInfo = configData.find(c => c.key === 'canary_deployment')?.value;
        const shadowInfo = configData.find(c => c.key === 'shadow_deployment')?.value;

        setCurrentModel({
          version: currentVersion || 'unknown',
          deployedAt: new Date().toISOString(),
          status: 'active',
          rolloutPercentage: 100,
          metrics: performanceMetrics[0] || {
            timestamp: new Date().toISOString(),
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0
          }
        });

        const candidates: ModelVersion[] = [];
        if (canaryInfo?.enabled) {
          candidates.push({
            version: canaryInfo.newVersion,
            deployedAt: canaryInfo.startedAt,
            status: 'canary',
            rolloutPercentage: canaryInfo.percentage,
            metrics: performanceMetrics[0] || {
              timestamp: new Date().toISOString(),
              accuracy: 0,
              precision: 0,
              recall: 0,
              f1Score: 0
            }
          });
        }

        if (shadowInfo?.enabled) {
          candidates.push({
            version: shadowInfo.shadowVersion,
            deployedAt: shadowInfo.startedAt,
            status: 'shadow',
            rolloutPercentage: 0,
            metrics: performanceMetrics[0] || {
              timestamp: new Date().toISOString(),
              accuracy: 0,
              precision: 0,
              recall: 0,
              f1Score: 0
            }
          });
        }

        setCandidateModels(candidates);
      }

      // Fetch correction count
      const { count } = await supabase
        .from('user_corrections')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      setCorrectionCount(count || 0);

      // Fetch recent alerts
      const { data: alertData } = await supabase
        .from('drift_notifications')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (alertData) {
        setAlerts(alertData.map((a: any) => ({
          id: a.id,
          severity: a.severity,
          type: a.alerts?.type || 'drift_detected',
          message: a.alerts?.message || 'Alert',
          timestamp: a.timestamp,
          acknowledged: false
        })));
      }

      // Check for active retraining job
      const { data: jobData } = await supabase
        .from('model_retraining_jobs')
        .select('*')
        .in('status', ['pending', 'training', 'validation', 'testing'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (jobData) {
        setRetrainingJob({
          id: jobData.id,
          status: jobData.status,
          progress: calculateProgress(jobData.status),
          trigger: jobData.trigger,
          startedAt: jobData.started_at,
          estimatedCompletion: estimateCompletion(jobData.started_at, jobData.status)
        });
      } else {
        setRetrainingJob(null);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleDriftUpdate = (payload: any) => {
    fetchDashboardData();
  };

  const handleAlertUpdate = (payload: any) => {
    const newAlert: Alert = {
      id: payload.new.id,
      severity: payload.new.severity,
      type: payload.new.alerts?.type || 'drift_detected',
      message: payload.new.alerts?.message || 'New alert',
      timestamp: payload.new.timestamp,
      acknowledged: false
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
  };

  const calculateProgress = (status: string): number => {
    const statusProgress: Record<string, number> = {
      'pending': 10,
      'data_preparation': 20,
      'training': 50,
      'validation': 70,
      'testing': 90,
      'deployment_ready': 95,
      'deployed': 100
    };
    return statusProgress[status] || 0;
  };

  const estimateCompletion = (startedAt: string, status: string): string => {
    const start = new Date(startedAt);
    const now = new Date();
    const elapsed = now.getTime() - start.getTime();
    const progress = calculateProgress(status);

    if (progress === 0) return 'Unknown';

    const estimatedTotal = elapsed / (progress / 100);
    const remaining = estimatedTotal - elapsed;
    const completionTime = new Date(now.getTime() + remaining);

    return completionTime.toLocaleTimeString();
  };

  const triggerManualRetrain = async () => {
    try {
      const response = await fetch('/api/building-surveyor/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' })
      });

      if (response.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to trigger manual retrain:', error);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const exportMetrics = () => {
    const data = {
      driftMetrics,
      performanceMetrics,
      alerts,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-metrics-${new Date().toISOString()}.json`;
    a.click();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'canary': return 'bg-blue-500';
      case 'shadow': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Prepare chart data
  const driftChartData = driftMetrics.slice(0, 20).reverse().map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    driftScore: m.driftScore * 100
  }));

  const performanceChartData = performanceMetrics.slice(0, 20).reverse().map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    accuracy: m.accuracy * 100,
    precision: m.precision * 100,
    recall: m.recall * 100,
    f1Score: m.f1Score * 100
  }));

  const radarData = currentModel ? [
    {
      metric: 'Accuracy',
      value: currentModel.metrics.accuracy * 100
    },
    {
      metric: 'Precision',
      value: currentModel.metrics.precision * 100
    },
    {
      metric: 'Recall',
      value: currentModel.metrics.recall * 100
    },
    {
      metric: 'F1 Score',
      value: currentModel.metrics.f1Score * 100
    }
  ] : [];

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Model Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time AI model performance and drift detection</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportMetrics}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <Alert className="border-orange-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Active Alerts</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              {alerts.filter(a => !a.acknowledged).map(alert => (
                <div key={alert.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Retraining Status */}
      {retrainingJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Model Retraining in Progress
            </CardTitle>
            <CardDescription>
              Trigger: {retrainingJob.trigger} | Started: {new Date(retrainingJob.startedAt).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status: {retrainingJob.status}</span>
                <span>ETA: {retrainingJob.estimatedCompletion}</span>
              </div>
              <Progress value={retrainingJob.progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Drift Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driftMetrics[0]?.driftScore ? (driftMetrics[0].driftScore * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {driftMetrics[0]?.driftScore > 0.2 ? (
                <span className="text-orange-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Above threshold
                </span>
              ) : (
                <span className="text-green-500 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Normal
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentModel ? (currentModel.metrics.accuracy * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {performanceMetrics.length > 1 && (
                performanceMetrics[0].accuracy > performanceMetrics[1].accuracy ? (
                  <span className="text-green-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Improving
                  </span>
                ) : (
                  <span className="text-orange-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Declining
                  </span>
                )
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Corrections (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{correctionCount}</div>
            <p className="text-xs text-muted-foreground">
              {correctionCount >= 50 ? (
                <span className="text-orange-500">Ready for retraining</span>
              ) : (
                <span>{50 - correctionCount} more needed</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Auto-Retrain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isAutoRetrainEnabled ? 'text-green-500' : 'text-gray-500'}`}>
                {isAutoRetrainEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerManualRetrain}
                disabled={retrainingJob !== null}
              >
                Manual Trigger
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Versions */}
      <Card>
        <CardHeader>
          <CardTitle>Model Versions</CardTitle>
          <CardDescription>Current and candidate models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentModel && (
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(currentModel.status)}>
                    {currentModel.status}
                  </Badge>
                  <span className="font-mono text-sm">{currentModel.version}</span>
                  <span className="text-sm text-gray-500">
                    Deployed: {new Date(currentModel.deployedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">Rollout: {currentModel.rolloutPercentage}%</span>
                  <span className="text-sm">Accuracy: {(currentModel.metrics.accuracy * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
            {candidateModels.map(model => (
              <div key={model.version} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(model.status)}>
                    {model.status}
                  </Badge>
                  <span className="font-mono text-sm">{model.version}</span>
                  <span className="text-sm text-gray-500">
                    Started: {new Date(model.deployedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">Rollout: {model.rolloutPercentage}%</span>
                  <span className="text-sm">Accuracy: {(model.metrics.accuracy * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="drift" className="w-full">
        <TabsList>
          <TabsTrigger value="drift">Drift Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="comparison">Model Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="drift">
          <Card>
            <CardHeader>
              <CardTitle>Drift Score Over Time</CardTitle>
              <CardDescription>Distribution drift detection (threshold: 20%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={driftChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="driftScore"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Line
                    type="monotone"
                    dataKey={() => 20}
                    stroke="#ff0000"
                    strokeDasharray="5 5"
                    name="Threshold"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
              <CardDescription>Accuracy, Precision, Recall, and F1 Score</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="Accuracy" />
                  <Line type="monotone" dataKey="precision" stroke="#82ca9d" name="Precision" />
                  <Line type="monotone" dataKey="recall" stroke="#ffc658" name="Recall" />
                  <Line type="monotone" dataKey="f1Score" stroke="#ff7c7c" name="F1 Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Current Model Performance</CardTitle>
              <CardDescription>Radar chart of key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Current Model"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}