/**
 * Auto Scaler Module
 *
 * Handles automatic scaling operations including scale up, down, out, and in.
 * Manages scaling triggers, cooldown periods, and predictive scaling.
 */

import { logger } from '../../utils/logger';
import { ScalingAction, ScalingPolicy, ScalingMetrics } from './ScalingPolicies';
import { ScalingPrediction, PredictiveScalingModel, HistoricalMetric } from './MetricsCollector';

export interface ServiceInstance {
  id: string;
  type: 'api' | 'database' | 'cache' | 'storage' | 'ml_worker' | 'notification';
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping' | 'maintenance';
  region: string;
  zone: string;
  endpoint: string;
  capacity: number;
  currentLoad: number;
  healthScore: number;
  lastHealthCheck: number;
  metadata: Record<string, any>;
}

export class AutoScaler {
  private serviceInstances: Map<string, ServiceInstance> = new Map();
  private cooldownTimers: Map<string, number> = new Map();

  async evaluateScalingPolicies(
    policies: Map<string, ScalingPolicy>,
    currentMetrics: ScalingMetrics,
    evaluateTriggers: (triggers: any[], metrics: ScalingMetrics) => boolean
  ): Promise<void> {
    for (const [policyId, policy] of Array.from(policies)) {
      if (!policy.enabled) continue;

      try {
        // Check if policy is in cooldown
        const lastExecution = this.cooldownTimers.get(policyId) || 0;
        const cooldownExpired = Date.now() - lastExecution > policy.cooldownPeriod * 1000;

        if (!cooldownExpired) {
          continue;
        }

        const shouldTrigger = evaluateTriggers(policy.triggers, currentMetrics);

        if (shouldTrigger) {
          await this.executeScalingActions(policy.actions, policyId);
          this.cooldownTimers.set(policyId, Date.now());
          logger.info(`Scaling policy triggered: ${policy.name}`, { policyId, currentMetrics });
        }
      } catch (error) {
        logger.error(`Error evaluating scaling policy ${policyId}:`, error);
      }
    }
  }

  async executeScalingActions(actions: ScalingAction[], policyId: string): Promise<void> {
    const sortedActions = actions.sort((a, b) => a.priority - b.priority);

    for (const action of sortedActions) {
      try {
        switch (action.type) {
          case 'scale_up':
            await this.scaleUp(action.parameters);
            break;
          case 'scale_down':
            await this.scaleDown(action.parameters);
            break;
          case 'scale_out':
            await this.scaleOut(action.parameters);
            break;
          case 'scale_in':
            await this.scaleIn(action.parameters);
            break;
          case 'failover':
            await this.performFailover(action.parameters);
            break;
          case 'alert':
            await this.sendAlert(action.parameters, policyId);
            break;
        }
      } catch (error) {
        logger.error(`Error executing scaling action ${action.type}:`, error);
      }
    }
  }

  async scaleUp(parameters: any): Promise<void> {
    // Increase resources for existing instances
    logger.info('Scaling up resources', parameters);

    for (const [instanceId, instance] of Array.from(this.serviceInstances)) {
      if (instance.status === 'healthy') {
        instance.capacity = Math.min(instance.capacity * 1.5, 100);
        logger.info(`Scaled up instance ${instanceId} capacity to ${instance.capacity}`);
      }
    }
  }

  async scaleDown(parameters: any): Promise<void> {
    // Decrease resources for existing instances
    logger.info('Scaling down resources', parameters);

    for (const [instanceId, instance] of Array.from(this.serviceInstances)) {
      if (instance.status === 'healthy') {
        instance.capacity = Math.max(instance.capacity * 0.8, 10);
        logger.info(`Scaled down instance ${instanceId} capacity to ${instance.capacity}`);
      }
    }
  }

  async scaleOut(parameters: any): Promise<void> {
    // Add more instances
    const { increment = 1, maxInstances = 10 } = parameters;
    const currentInstances = this.serviceInstances.size;

    if (currentInstances >= maxInstances) {
      logger.warn('Maximum instances reached, cannot scale out further');
      return;
    }

    const instancesToAdd = Math.min(increment, maxInstances - currentInstances);

    for (let i = 0; i < instancesToAdd; i++) {
      const instanceId = `instance-${Date.now()}-${i}`;
      const newInstance: ServiceInstance = {
        id: instanceId,
        type: 'api',
        status: 'starting',
        region: 'us-east-1',
        zone: 'a',
        endpoint: `https://api-${instanceId}.mintenance.com`,
        capacity: 50,
        currentLoad: 0,
        healthScore: 100,
        lastHealthCheck: Date.now(),
        metadata: { createdBy: 'auto-scaling' }
      };

      this.serviceInstances.set(instanceId, newInstance);

      // Simulate instance startup
      setTimeout(() => {
        newInstance.status = 'healthy';
        logger.info(`New instance ${instanceId} is now healthy and serving traffic`);
      }, 30000); // 30 seconds startup time
    }

    logger.info(`Scaled out: added ${instancesToAdd} new instances`);
  }

  async scaleIn(parameters: any): Promise<void> {
    // Remove instances
    const { decrement = 1, minInstances = 2 } = parameters;
    const currentInstances = this.serviceInstances.size;

    if (currentInstances <= minInstances) {
      logger.warn('Minimum instances reached, cannot scale in further');
      return;
    }

    const instancesToRemove = Math.min(decrement, currentInstances - minInstances);
    const sortedInstances = Array.from(this.serviceInstances.entries())
      .sort(([, a], [, b]) => a.currentLoad - b.currentLoad);

    for (let i = 0; i < instancesToRemove; i++) {
      const [instanceId, instance] = sortedInstances[i];

      instance.status = 'stopping';

      // Graceful shutdown simulation
      setTimeout(() => {
        this.serviceInstances.delete(instanceId);
        logger.info(`Instance ${instanceId} gracefully removed`);
      }, 60000); // 1 minute graceful shutdown
    }

    logger.info(`Scaled in: removing ${instancesToRemove} instances`);
  }

  async performFailover(parameters: any): Promise<void> {
    const { sourceRegion, targetRegion } = parameters;

    logger.warn(`Performing failover from ${sourceRegion} to ${targetRegion}`);

    // Update load balancer to route traffic to healthy region
    // Promote read replicas to primary
    // Update DNS records
    // Notify stakeholders

    await this.sendAlert({
      severity: 'high',
      message: `Automatic failover executed from ${sourceRegion} to ${targetRegion}`,
      recipients: ['ops-team']
    }, 'failover-policy');
  }

  private async sendAlert(parameters: any, policyId: string): Promise<void> {
    const { severity = 'medium', message, recipients = [] } = parameters;

    logger.warn(`Infrastructure alert (${severity}): ${message}`, { policyId, recipients });

    // In a real implementation, this would send notifications via:
    // - Email
    // - Slack
    // - PagerDuty
    // - SMS
    // - Webhooks
  }

  async executePredictiveScaling(
    predictions: ScalingPrediction[],
    instances: Map<string, ServiceInstance>
  ): Promise<void> {
    // Look at predictions for the next 2 hours
    const nearTermPredictions = predictions.slice(0, 2);

    for (const prediction of nearTermPredictions) {
      if (prediction.confidence < 0.7) continue; // Only act on high-confidence predictions

      const currentCapacity = Array.from(instances.values())
        .reduce((total, instance) => total + instance.capacity, 0);

      const recommendedCapacity = prediction.recommendedCapacity;
      const capacityDifference = recommendedCapacity - currentCapacity;

      if (Math.abs(capacityDifference) > currentCapacity * 0.2) { // 20% difference threshold
        if (capacityDifference > 0) {
          await this.scaleOut({ increment: Math.ceil(capacityDifference / 50) });
          logger.info('Predictive scaling: scaled out', { prediction, capacityDifference });
        } else {
          await this.scaleIn({ decrement: Math.ceil(Math.abs(capacityDifference) / 50) });
          logger.info('Predictive scaling: scaled in', { prediction, capacityDifference });
        }
      }
    }
  }

  async updatePredictiveModels(
    models: Map<string, PredictiveScalingModel>,
    metricsHistory: HistoricalMetric[],
    generatePredictions: (model: PredictiveScalingModel, data: HistoricalMetric[]) => Promise<ScalingPrediction[]>
  ): Promise<void> {
    if (metricsHistory.length < 100) return; // Need sufficient data

    for (const [modelId, model] of Array.from(models)) {
      try {
        const trainingData = metricsHistory.slice(-1000); // Last 1000 data points
        const predictions = await generatePredictions(model, trainingData);

        model.predictions = predictions;
        model.lastTrained = Date.now();

        // Execute predictive scaling if needed
        await this.executePredictiveScaling(predictions, this.serviceInstances);

      } catch (error) {
        logger.error(`Error updating predictive model ${modelId}:`, error);
      }
    }
  }

  async executeBatchScaling(requests: { serviceType: string; targetCapacity: number }[]): Promise<void> {
    logger.info('Executing batch scaling operations', requests);

    for (const request of requests) {
      try {
        const instances = Array.from(this.serviceInstances.values())
          .filter(instance => instance.type === request.serviceType);

        const currentCapacity = instances.reduce((total, instance) => total + instance.capacity, 0);
        const capacityDifference = request.targetCapacity - currentCapacity;

        if (capacityDifference > 0) {
          await this.scaleOut({ increment: Math.ceil(capacityDifference / 50) });
        } else if (capacityDifference < 0) {
          await this.scaleIn({ decrement: Math.ceil(Math.abs(capacityDifference) / 50) });
        }
      } catch (error) {
        logger.error(`Batch scaling failed for ${request.serviceType}:`, error);
      }
    }
  }

  getServiceInstances(): Map<string, ServiceInstance> {
    return this.serviceInstances;
  }

  setServiceInstances(instances: Map<string, ServiceInstance>): void {
    this.serviceInstances = instances;
  }
}
