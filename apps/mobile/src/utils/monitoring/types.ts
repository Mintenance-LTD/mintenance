import type { PerformanceMetrics } from '../performanceMonitor';

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthStatus>;
  interval: number;
  timeout: number;
  critical: boolean;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, unknown>;
  responseTime?: number;
  timestamp: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: Map<string, HealthStatus>;
  lastUpdated: number;
  status?: 'healthy' | 'degraded' | 'critical';
  uptime?: number;
  timestamp?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: PerformanceMetrics, health: SystemHealth) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number;
  channels: AlertChannel[];
}

export type AlertChannel = 'console' | 'sentry' | 'webhook' | 'email' | 'push';

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  details?: Record<string, unknown>;
}

export interface MetricThreshold {
  metric: keyof PerformanceMetrics;
  warning: number;
  critical: number;
  comparison: 'greater' | 'less' | 'equal';
}
