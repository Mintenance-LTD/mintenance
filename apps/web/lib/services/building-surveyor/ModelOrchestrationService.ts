/**
 * Model Orchestration Service
 *
 * Central orchestrator for all model management activities:
 * - Drift monitoring and alerting
 * - Auto-retraining triggers
 * - Incident response
 * - Performance tracking
 * - Model lifecycle management
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DriftMonitorService } from './DriftMonitorService';
import { AlertingService, AlertSeverity, AlertType } from './AlertingService';
import { AutoRetrainingService } from './AutoRetrainingService';
import { IncidentResponseService, IncidentType } from './IncidentResponseService';
import { MonitoringService } from '../monitoring/MonitoringService';

/**
 * Orchestration configuration
 */
interface OrchestrationConfig {
  monitoringInterval: number; // minutes
  metricsWindow: number; // hours
  alertingEnabled: boolean;
  autoRetrainEnabled: boolean;
  incidentResponseEnabled: boolean;
  performanceThresholds: {
    minAccuracy: number;
    maxDrift: number;
    maxResponseTime: number; // ms
    maxErrorRate: number;
  };
}

/**
 * System health status
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  modelVersion: string;
  metrics: {
    accuracy: number;
    driftScore: number;
    responseTime: number;
    errorRate: number;
    correctionCount: number;
  };
  activeIncidents: number;
  retrainingInProgress: boolean;
  lastCheck: Date;
  recommendations: string[];
}

/**
 * Model Orchestration Service
 */
export class ModelOrchestrationService {
  private static config: OrchestrationConfig = {
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL_MINUTES || '5'),
    metricsWindow: parseInt(process.env.METRICS_WINDOW_HOURS || '24'),
    alertingEnabled: process.env.ALERTING_ENABLED !== 'false',
    autoRetrainEnabled: process.env.AUTO_RETRAIN_ENABLED !== 'false',
    incidentResponseEnabled: process.env.INCIDENT_RESPONSE_ENABLED !== 'false',
    performanceThresholds: {
      minAccuracy: parseFloat(process.env.MIN_ACCURACY || '0.85'),
      maxDrift: parseFloat(process.env.MAX_DRIFT || '0.2'),
      maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME || '2000'),
      maxErrorRate: parseFloat(process.env.MAX_ERROR_RATE || '0.05')
    }
  };

  private static monitoringTimer: NodeJS.Timer | null = null;
  private static lastHealthCheck: SystemHealth | null = null;

  /**
   * Start orchestration service
   */
  static async start(): Promise<void> {
    logger.info('Starting Model Orchestration Service', {
      service: 'ModelOrchestrationService',
      config: this.config
    });

    // Initial health check
    await this.performHealthCheck();

    // Start periodic monitoring
    this.monitoringTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.monitoringInterval * 60 * 1000
    );

    // Set up real-time subscriptions
    await this.setupRealtimeSubscriptions();

    logger.info('Model Orchestration Service started successfully', {
      service: 'ModelOrchestrationService'
    });
  }

  /**
   * Stop orchestration service
   */
  static stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    logger.info('Model Orchestration Service stopped', {
      service: 'ModelOrchestrationService'
    });
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<SystemHealth> {
    try {
      logger.debug('Performing system health check', {
        service: 'ModelOrchestrationService'
      });

      // Get current model version
      const modelVersion = await this.getCurrentModelVersion();

      // Collect metrics
      const metrics = await this.collectMetrics();

      // Check drift
      const driftResult = await DriftMonitorService.detectDrift({});

      // Check active incidents
      const activeIncidents = IncidentResponseService.getActiveIncidents();

      // Check retraining status
      const retrainingStatus = AutoRetrainingService.getRetrainingStatus();

      // Determine overall system health
      const health = this.determineSystemHealth(
        metrics,
        driftResult.driftScore,
        activeIncidents.length,
        retrainingStatus.isRetraining
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(health, metrics);

      const systemHealth: SystemHealth = {
        status: health,
        modelVersion,
        metrics: {
          ...metrics,
          driftScore: driftResult.driftScore
        },
        activeIncidents: activeIncidents.length,
        retrainingInProgress: retrainingStatus.isRetraining,
        lastCheck: new Date(),
        recommendations
      };

      this.lastHealthCheck = systemHealth;

      // Take actions based on health status
      await this.handleHealthStatus(systemHealth);

      // Record metrics
      await MonitoringService.record('system_health_check', {
        status: systemHealth.status,
        metrics: systemHealth.metrics,
        activeIncidents: systemHealth.activeIncidents,
        retrainingInProgress: systemHealth.retrainingInProgress
      });

      return systemHealth;
    } catch (error) {
      logger.error('Health check failed', {
        service: 'ModelOrchestrationService',
        error
      });

      // Return degraded health on error
      return {
        status: 'degraded',
        modelVersion: 'unknown',
        metrics: {
          accuracy: 0,
          driftScore: 0,
          responseTime: 0,
          errorRate: 1,
          correctionCount: 0
        },
        activeIncidents: 0,
        retrainingInProgress: false,
        lastCheck: new Date(),
        recommendations: ['System health check failed, manual investigation required']
      };
    }
  }

  /**
   * Collect system metrics
   */
  private static async collectMetrics(): Promise<{
    accuracy: number;
    responseTime: number;
    errorRate: number;
    correctionCount: number;
  }> {
    try {
      const windowStart = new Date(Date.now() - this.config.metricsWindow * 60 * 60 * 1000);

      // Get accuracy from corrections
      const { data: corrections } = await serverSupabase
        .from('user_corrections')
        .select('was_correct')
        .gte('created_at', windowStart.toISOString());

      const accuracy = corrections && corrections.length > 0
        ? corrections.filter(c => c.was_correct).length / corrections.length
        : 1.0;

      // Get response times from predictions log
      const { data: predictions } = await serverSupabase
        .from('model_predictions_log')
        .select('timestamp, created_at')
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      const responseTime = predictions && predictions.length > 0
        ? predictions.reduce((sum, p) => {
            const ts = new Date(p.timestamp).getTime();
            const created = new Date(p.created_at).getTime();
            return sum + (created - ts);
          }, 0) / predictions.length
        : 0;

      // Get error rate
      const { count: totalPredictions } = await serverSupabase
        .from('model_predictions_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', windowStart.toISOString());

      const { count: failedPredictions } = await serverSupabase
        .from('model_predictions_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', windowStart.toISOString())
        .lt('confidence', 0.5);

      const errorRate = totalPredictions && totalPredictions > 0
        ? (failedPredictions || 0) / totalPredictions
        : 0;

      // Get correction count
      const { count: correctionCount } = await serverSupabase
        .from('user_corrections')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        accuracy,
        responseTime,
        errorRate,
        correctionCount: correctionCount || 0
      };
    } catch (error) {
      logger.error('Failed to collect metrics', {
        service: 'ModelOrchestrationService',
        error
      });

      return {
        accuracy: 0,
        responseTime: 0,
        errorRate: 1,
        correctionCount: 0
      };
    }
  }

  /**
   * Determine overall system health
   */
  private static determineSystemHealth(
    metrics: unknown,
    driftScore: number,
    activeIncidents: number,
    retrainingInProgress: boolean
  ): 'healthy' | 'degraded' | 'critical' {
    // Critical if any critical incidents
    if (activeIncidents > 0) {
      return 'critical';
    }

    // Critical if metrics exceed thresholds significantly
    if (
      metrics.accuracy < this.config.performanceThresholds.minAccuracy - 0.1 ||
      driftScore > this.config.performanceThresholds.maxDrift * 2 ||
      metrics.errorRate > this.config.performanceThresholds.maxErrorRate * 2
    ) {
      return 'critical';
    }

    // Degraded if metrics exceed thresholds
    if (
      metrics.accuracy < this.config.performanceThresholds.minAccuracy ||
      driftScore > this.config.performanceThresholds.maxDrift ||
      metrics.responseTime > this.config.performanceThresholds.maxResponseTime ||
      metrics.errorRate > this.config.performanceThresholds.maxErrorRate
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate recommendations based on health
   */
  private static generateRecommendations(
    health: 'healthy' | 'degraded' | 'critical',
    metrics: unknown
  ): string[] {
    const recommendations: string[] = [];

    if (health === 'critical') {
      recommendations.push('Immediate attention required - system in critical state');
      recommendations.push('Consider manual intervention or emergency rollback');
    }

    if (metrics.accuracy < this.config.performanceThresholds.minAccuracy) {
      recommendations.push('Accuracy below threshold - review recent predictions');
      recommendations.push('Consider retraining with updated data');
    }

    if (metrics.driftScore > this.config.performanceThresholds.maxDrift) {
      recommendations.push('Significant drift detected - monitor closely');
      recommendations.push('Review data distribution changes');
    }

    if (metrics.responseTime > this.config.performanceThresholds.maxResponseTime) {
      recommendations.push('Response time degraded - check system resources');
      recommendations.push('Consider model optimization or caching');
    }

    if (metrics.errorRate > this.config.performanceThresholds.maxErrorRate) {
      recommendations.push('High error rate - investigate root cause');
      recommendations.push('Check input data quality and format');
    }

    if (metrics.correctionCount >= 50) {
      recommendations.push('Sufficient corrections available for retraining');
      recommendations.push('Consider triggering model update');
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating normally');
      recommendations.push('Continue monitoring metrics');
    }

    return recommendations;
  }

  /**
   * Handle health status actions
   */
  private static async handleHealthStatus(health: SystemHealth): Promise<void> {
    try {
      // Handle critical status
      if (health.status === 'critical') {
        logger.warn('System in critical state', {
          service: 'ModelOrchestrationService',
          health
        });

        // Check for incidents
        if (this.config.incidentResponseEnabled) {
          const incident = await IncidentResponseService.detectIncident({
            driftScore: health.metrics.driftScore,
            accuracyDrop: this.config.performanceThresholds.minAccuracy - health.metrics.accuracy,
            errorRate: health.metrics.errorRate,
            responseTime: health.metrics.responseTime,
            modelVersion: health.modelVersion
          });

          if (incident) {
            logger.info('Incident detected and response initiated', {
              service: 'ModelOrchestrationService',
              incidentId: incident.id
            });
          }
        }

        // Send critical alert
        if (this.config.alertingEnabled) {
          await AlertingService.sendAlert({
            type: AlertType.SYSTEM_FAILURE,
            severity: AlertSeverity.CRITICAL,
            title: 'System Health Critical',
            message: 'Model performance has degraded to critical levels',
            details: {
              modelVersion: health.modelVersion,
              timestamp: new Date().toISOString(),
              metrics: health.metrics,
              recommendations: health.recommendations
            }
          });
        }
      }

      // Handle degraded status
      else if (health.status === 'degraded') {
        logger.info('System performance degraded', {
          service: 'ModelOrchestrationService',
          health
        });

        // Check for auto-retrain conditions
        if (this.config.autoRetrainEnabled) {
          const triggered = await AutoRetrainingService.checkAndTriggerRetraining();
          if (triggered) {
            logger.info('Auto-retraining triggered due to degraded performance', {
              service: 'ModelOrchestrationService'
            });
          }
        }

        // Send degradation alert
        if (this.config.alertingEnabled) {
          await AlertingService.sendAlert({
            type: AlertType.PERFORMANCE_DEGRADATION,
            severity: AlertSeverity.MEDIUM,
            title: 'System Performance Degraded',
            message: 'Model performance is below optimal levels',
            details: {
              modelVersion: health.modelVersion,
              timestamp: new Date().toISOString(),
              metrics: health.metrics,
              recommendations: health.recommendations
            }
          });
        }
      }

      // Handle drift even in healthy state
      if (health.metrics.driftScore > this.config.performanceThresholds.maxDrift) {
        await DriftMonitorService.detectAndAdjustWeights();
      }

    } catch (error) {
      logger.error('Failed to handle health status', {
        service: 'ModelOrchestrationService',
        error
      });
    }
  }

  /**
   * Setup real-time subscriptions for immediate response
   */
  private static async setupRealtimeSubscriptions(): Promise<void> {
    try {
      // Subscribe to user corrections for immediate accuracy tracking
      serverSupabase
        .channel('corrections-channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'user_corrections'
        }, async (payload) => {
          await this.handleCorrection(payload.new);
        })
        .subscribe();

      // Subscribe to model predictions for error tracking
      serverSupabase
        .channel('predictions-channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'model_predictions_log'
        }, async (payload) => {
          await this.handlePrediction(payload.new);
        })
        .subscribe();

      logger.info('Real-time subscriptions established', {
        service: 'ModelOrchestrationService'
      });
    } catch (error) {
      logger.error('Failed to setup subscriptions', {
        service: 'ModelOrchestrationService',
        error
      });
    }
  }

  /**
   * Handle new correction
   */
  private static async handleCorrection(correction: unknown): Promise<void> {
    try {
      // Track correction for accuracy
      if (!correction.was_correct) {
        logger.info('Incorrect prediction corrected', {
          service: 'ModelOrchestrationService',
          predictionId: correction.prediction_id
        });

        // Check if we need immediate action
        const { count } = await serverSupabase
          .from('user_corrections')
          .select('*', { count: 'exact', head: true })
          .eq('was_correct', false)
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

        if (count && count > 10) {
          logger.warn('High correction rate detected', {
            service: 'ModelOrchestrationService',
            correctionsInLastHour: count
          });

          // Trigger immediate health check
          await this.performHealthCheck();
        }
      }
    } catch (error) {
      logger.error('Failed to handle correction', {
        service: 'ModelOrchestrationService',
        error
      });
    }
  }

  /**
   * Handle new prediction
   */
  private static async handlePrediction(prediction: unknown): Promise<void> {
    try {
      // Check for low confidence predictions
      if (prediction.confidence < 0.5) {
        logger.warn('Low confidence prediction', {
          service: 'ModelOrchestrationService',
          predictionId: prediction.id,
          confidence: prediction.confidence
        });

        // Track low confidence rate
        const { count } = await serverSupabase
          .from('model_predictions_log')
          .select('*', { count: 'exact', head: true })
          .lt('confidence', 0.5)
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Last 10 minutes

        if (count && count > 5) {
          logger.warn('High rate of low confidence predictions', {
            service: 'ModelOrchestrationService',
            lowConfidenceCount: count
          });

          // Could indicate model degradation
          await this.performHealthCheck();
        }
      }
    } catch (error) {
      logger.error('Failed to handle prediction', {
        service: 'ModelOrchestrationService',
        error
      });
    }
  }

  /**
   * Get current model version
   */
  private static async getCurrentModelVersion(): Promise<string> {
    try {
      const { data } = await serverSupabase
        .from('system_config')
        .select('value')
        .eq('key', 'current_model_version')
        .single();

      return data?.value?.version || 'v1.0.0';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get orchestration status
   */
  static getStatus(): {
    running: boolean;
    lastHealthCheck: SystemHealth | null;
    config: OrchestrationConfig;
  } {
    return {
      running: this.monitoringTimer !== null,
      lastHealthCheck: this.lastHealthCheck,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  static updateConfig(updates: Partial<OrchestrationConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };

    logger.info('Orchestration configuration updated', {
      service: 'ModelOrchestrationService',
      config: this.config
    });

    // Restart with new configuration
    if (this.monitoringTimer) {
      this.stop();
      this.start();
    }
  }

  /**
   * Trigger manual health check
   */
  static async triggerHealthCheck(): Promise<SystemHealth> {
    logger.info('Manual health check triggered', {
      service: 'ModelOrchestrationService'
    });

    return this.performHealthCheck();
  }

  /**
   * Get health history
   */
  static async getHealthHistory(hours: number = 24): Promise<any[]> {
    try {
      const { data } = await serverSupabase
        .from('ml_metrics')
        .select('*')
        .eq('metric', 'system_health_check')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      logger.error('Failed to get health history', {
        service: 'ModelOrchestrationService',
        error
      });
      return [];
    }
  }
}