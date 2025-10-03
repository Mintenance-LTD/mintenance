/**
 * Infrastructure Scaling Service - Main Entry Point
 *
 * Comprehensive high availability and auto-scaling system for the Mintenance platform.
 * Provides enterprise-grade infrastructure management with:
 *
 * Core Features:
 * - Auto-scaling based on real-time metrics and demand prediction
 * - Load balancing with intelligent traffic distribution
 * - Circuit breaker patterns for fault tolerance
 * - Health monitoring and automatic failover
 * - Database scaling and read replica management
 * - CDN optimization and edge caching
 * - Real-time performance monitoring and alerting
 * - Disaster recovery and backup orchestration
 * - Resource optimization and cost management
 * - Multi-region deployment orchestration
 *
 * Advanced Capabilities:
 * - Predictive scaling based on historical patterns and ML
 * - Intelligent caching strategies with automatic invalidation
 * - Service mesh integration for microservices architecture
 * - Container orchestration with Kubernetes-style management
 * - Database sharding and horizontal scaling automation
 * - Real-time traffic analysis and routing optimization
 */

import { logger } from '../../utils/logger';
import { ErrorManager } from '../../utils/ErrorManager';
import { ScalingPolicyManager, ScalingMetrics, ScalingPolicy, LoadBalancerConfig } from './ScalingPolicies';
import { MetricsCollector, PredictiveScalingModel, ScalingPrediction } from './MetricsCollector';
import { AutoScaler, ServiceInstance } from './AutoScaler';
import {
  ResourceOrchestrator,
  ServiceMeshConfig,
  ContainerOrchestration,
  ResourceOptimization,
  DatabaseCluster,
  CacheStrategy,
  DisasterRecoveryPlan
} from './ResourceOrchestrator';

export class InfrastructureScalingService {
  private policyManager: ScalingPolicyManager;
  private metricsCollector: MetricsCollector;
  private autoScaler: AutoScaler;
  private resourceOrchestrator: ResourceOrchestrator;
  private loadBalancerConfig: LoadBalancerConfig;
  private predictiveModels: Map<string, PredictiveScalingModel> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.policyManager = new ScalingPolicyManager();
    this.metricsCollector = new MetricsCollector();
    this.autoScaler = new AutoScaler();
    this.resourceOrchestrator = new ResourceOrchestrator();
    this.loadBalancerConfig = this.policyManager.getDefaultLoadBalancerConfig();
    this.startMonitoring();
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.metricsCollector.collectMetrics();
        await this.autoScaler.evaluateScalingPolicies(
          this.policyManager.getPolicies(),
          metrics,
          this.policyManager.evaluateTriggers.bind(this.policyManager)
        );
        await this.resourceOrchestrator.performHealthChecks(this.autoScaler.getServiceInstances());
        await this.autoScaler.updatePredictiveModels(
          this.predictiveModels,
          this.metricsCollector.getMetricsHistory(),
          this.metricsCollector.generatePredictions.bind(this.metricsCollector)
        );
        await this.resourceOrchestrator.optimizeResources(
          this.autoScaler.getServiceInstances(),
          this.metricsCollector.getCacheHitRatio.bind(this.metricsCollector),
          this.metricsCollector.getCompressionRatio.bind(this.metricsCollector)
        );
      } catch (error) {
        logger.error('Infrastructure monitoring error:', error);
        ErrorManager.handleError(error as Error);
      }
    }, 30000); // Monitor every 30 seconds

    logger.info('Infrastructure scaling monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Infrastructure scaling monitoring stopped');
  }

  async collectMetrics(): Promise<ScalingMetrics> {
    return this.metricsCollector.collectMetrics();
  }

  async evaluateScalingPolicies(): Promise<void> {
    const currentMetrics = await this.metricsCollector.collectMetrics();
    await this.autoScaler.evaluateScalingPolicies(
      this.policyManager.getPolicies(),
      currentMetrics,
      this.policyManager.evaluateTriggers.bind(this.policyManager)
    );
  }

  async performHealthChecks(): Promise<void> {
    await this.resourceOrchestrator.performHealthChecks(this.autoScaler.getServiceInstances());
  }

  async updatePredictiveModels(): Promise<void> {
    await this.autoScaler.updatePredictiveModels(
      this.predictiveModels,
      this.metricsCollector.getMetricsHistory(),
      this.metricsCollector.generatePredictions.bind(this.metricsCollector)
    );
  }

  async optimizeResources(): Promise<ResourceOptimization> {
    return this.resourceOrchestrator.optimizeResources(
      this.autoScaler.getServiceInstances(),
      this.metricsCollector.getCacheHitRatio.bind(this.metricsCollector),
      this.metricsCollector.getCompressionRatio.bind(this.metricsCollector)
    );
  }

  async configureServiceMesh(config: ServiceMeshConfig): Promise<void> {
    await this.resourceOrchestrator.configureServiceMesh(config, this.autoScaler.getServiceInstances());
  }

  async setupContainerOrchestration(config: ContainerOrchestration): Promise<void> {
    await this.resourceOrchestrator.setupContainerOrchestration(config);
  }

  async executeBatchScaling(requests: { serviceType: string; targetCapacity: number }[]): Promise<void> {
    await this.autoScaler.executeBatchScaling(requests);
  }

  async getInfrastructureStatus(): Promise<{
    instances: ServiceInstance[];
    scalingPolicies: ScalingPolicy[];
    currentMetrics: ScalingMetrics;
    predictions: ScalingPrediction[];
    healthStatus: string;
  }> {
    const currentMetrics = await this.metricsCollector.collectMetrics();
    const allInstances = Array.from(this.autoScaler.getServiceInstances().values());
    const allPolicies = Array.from(this.policyManager.getPolicies().values());

    const healthyInstances = allInstances.filter(i => i.status === 'healthy').length;
    const totalInstances = allInstances.length;
    const healthStatus = totalInstances === 0 ? 'unknown' :
      (healthyInstances / totalInstances > 0.8 ? 'healthy' :
       healthyInstances / totalInstances > 0.5 ? 'degraded' : 'unhealthy');

    // Get predictions from the first available model
    const predictions = Array.from(this.predictiveModels.values())[0]?.predictions || [];

    return {
      instances: allInstances,
      scalingPolicies: allPolicies,
      currentMetrics,
      predictions: predictions.slice(0, 6), // Next 6 hours
      healthStatus
    };
  }

  async cleanup(): Promise<void> {
    await this.stopMonitoring();

    // Cleanup predictive models
    this.predictiveModels.clear();

    // Clear metrics history
    this.metricsCollector.clearHistory();

    logger.info('Infrastructure scaling service cleaned up');
  }

  // Getter methods for external access
  getScalingPolicies(): Map<string, ScalingPolicy> {
    return this.policyManager.getPolicies();
  }

  getServiceInstances(): Map<string, ServiceInstance> {
    return this.autoScaler.getServiceInstances();
  }

  getDatabaseClusters(): Map<string, DatabaseCluster> {
    return this.resourceOrchestrator.getDatabaseClusters();
  }

  getCacheStrategies(): Map<string, CacheStrategy> {
    return this.resourceOrchestrator.getCacheStrategies();
  }

  getLoadBalancerConfig(): LoadBalancerConfig {
    return this.loadBalancerConfig;
  }

  getDisasterRecoveryPlan(): DisasterRecoveryPlan {
    return this.resourceOrchestrator.getDisasterRecoveryPlan();
  }

  getPredictiveModels(): Map<string, PredictiveScalingModel> {
    return this.predictiveModels;
  }

  getMetricsHistory() {
    return this.metricsCollector.getMetricsHistory();
  }
}

export const infrastructureScalingService = new InfrastructureScalingService();

// Re-export types for convenience
export * from './ScalingPolicies';
export * from './MetricsCollector';
export * from './AutoScaler';
export * from './ResourceOrchestrator';
