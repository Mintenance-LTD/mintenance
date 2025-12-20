/**
 * Scaling Policies Module
 *
 * Defines and manages auto-scaling policies, triggers, and actions.
 * Handles policy evaluation and execution logic.
 */

import { logger } from '../../utils/logger';

export interface ScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  networkThroughput: number;
  requestsPerSecond: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  queueLength: number;
  timestamp: number;
}

export interface ScalingPolicy {
  id: string;
  name: string;
  triggers: ScalingTrigger[];
  actions: ScalingAction[];
  cooldownPeriod: number;
  enabled: boolean;
  priority: number;
}

export interface ScalingTrigger {
  metric: keyof ScalingMetrics;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds to sustain before triggering
}

export interface ScalingAction {
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in' | 'failover' | 'alert';
  parameters: Record<string, any>;
  priority: number;
}

export interface HealthCheck {
  service: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number[];
  timeout: number;
  interval: number;
  retries: number;
  enabled: boolean;
}

export interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash' | 'geographic';
  healthChecks: HealthCheck[];
  stickySession: boolean;
  compressionEnabled: boolean;
  rateLimiting: RateLimitConfig;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstCapacity: number;
  windowSize: number;
  bypassRules: string[];
}

export class ScalingPolicyManager {
  private policies: Map<string, ScalingPolicy> = new Map();

  constructor() {
    this.createDefaultPolicies();
  }

  private createDefaultPolicies(): void {
    // High CPU utilization scaling policy
    const highCpuPolicy: ScalingPolicy = {
      id: 'high-cpu-scale-out',
      name: 'High CPU Utilization Scale Out',
      triggers: [{
        metric: 'cpuUtilization',
        operator: 'gt',
        threshold: 80,
        duration: 300 // 5 minutes
      }],
      actions: [{
        type: 'scale_out',
        parameters: { increment: 2, maxInstances: 20 },
        priority: 1
      }],
      cooldownPeriod: 600, // 10 minutes
      enabled: true,
      priority: 1
    };

    // High response time scaling policy
    const highLatencyPolicy: ScalingPolicy = {
      id: 'high-latency-scale-out',
      name: 'High Response Time Scale Out',
      triggers: [{
        metric: 'responseTime',
        operator: 'gt',
        threshold: 2000, // 2 seconds
        duration: 180 // 3 minutes
      }],
      actions: [{
        type: 'scale_out',
        parameters: { increment: 1, maxInstances: 15 },
        priority: 2
      }],
      cooldownPeriod: 300,
      enabled: true,
      priority: 2
    };

    // Low utilization scale-in policy
    const lowUtilizationPolicy: ScalingPolicy = {
      id: 'low-utilization-scale-in',
      name: 'Low Utilization Scale In',
      triggers: [
        {
          metric: 'cpuUtilization',
          operator: 'lt',
          threshold: 20,
          duration: 1200 // 20 minutes
        },
        {
          metric: 'memoryUtilization',
          operator: 'lt',
          threshold: 30,
          duration: 1200
        }
      ],
      actions: [{
        type: 'scale_in',
        parameters: { decrement: 1, minInstances: 2 },
        priority: 3
      }],
      cooldownPeriod: 900, // 15 minutes
      enabled: true,
      priority: 3
    };

    this.policies.set(highCpuPolicy.id, highCpuPolicy);
    this.policies.set(highLatencyPolicy.id, highLatencyPolicy);
    this.policies.set(lowUtilizationPolicy.id, lowUtilizationPolicy);
  }

  evaluateTriggers(triggers: ScalingTrigger[], metrics: ScalingMetrics): boolean {
    return triggers.every(trigger => {
      const value = metrics[trigger.metric];

      switch (trigger.operator) {
        case 'gt': return value > trigger.threshold;
        case 'lt': return value < trigger.threshold;
        case 'eq': return value === trigger.threshold;
        case 'gte': return value >= trigger.threshold;
        case 'lte': return value <= trigger.threshold;
        default: return false;
      }
    });
  }

  getPolicies(): Map<string, ScalingPolicy> {
    return this.policies;
  }

  addPolicy(policy: ScalingPolicy): void {
    this.policies.set(policy.id, policy);
    logger.info(`Added scaling policy: ${policy.name}`, { policyId: policy.id });
  }

  removePolicy(policyId: string): boolean {
    const removed = this.policies.delete(policyId);
    if (removed) {
      logger.info(`Removed scaling policy: ${policyId}`);
    }
    return removed;
  }

  getPolicy(policyId: string): ScalingPolicy | undefined {
    return this.policies.get(policyId);
  }

  updatePolicy(policyId: string, updates: Partial<ScalingPolicy>): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    Object.assign(policy, updates);
    logger.info(`Updated scaling policy: ${policyId}`, updates);
    return true;
  }

  enablePolicy(policyId: string): boolean {
    return this.updatePolicy(policyId, { enabled: true });
  }

  disablePolicy(policyId: string): boolean {
    return this.updatePolicy(policyId, { enabled: false });
  }

  getDefaultLoadBalancerConfig(): LoadBalancerConfig {
    return {
      algorithm: 'least_connections',
      healthChecks: [],
      stickySession: false,
      compressionEnabled: true,
      rateLimiting: {
        requestsPerSecond: 1000,
        burstCapacity: 2000,
        windowSize: 60,
        bypassRules: ['admin', 'health-check']
      }
    };
  }
}
