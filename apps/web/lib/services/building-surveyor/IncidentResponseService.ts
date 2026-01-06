/**
 * Incident Response Service
 *
 * Automated incident management and response for model degradation
 * Handles detection, mitigation, and resolution workflows
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AlertingService, AlertType, AlertSeverity } from './AlertingService';
import { AutoRetrainingService } from './AutoRetrainingService';

/**
 * Incident types
 */
export enum IncidentType {
  DRIFT_CRITICAL = 'drift_critical',
  ACCURACY_CRITICAL = 'accuracy_critical',
  MODEL_FAILURE = 'model_failure',
  DEPLOYMENT_FAILURE = 'deployment_failure',
  DATA_QUALITY_ISSUE = 'data_quality_issue',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SECURITY_BREACH = 'security_breach'
}

/**
 * Incident status
 */
export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  MITIGATED = 'mitigated',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

/**
 * Incident priority based on impact and urgency
 */
export enum IncidentPriority {
  P1 = 'critical', // Complete failure, immediate action required
  P2 = 'high',     // Significant degradation, action within 1 hour
  P3 = 'medium',   // Moderate impact, action within 4 hours
  P4 = 'low'       // Minor impact, action within 24 hours
}

/**
 * Incident details
 */
export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentPriority;
  status: IncidentStatus;
  affectedModelVersion: string;
  startedAt: Date;
  detectedAt: Date;
  mitigatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  impactDescription: string;
  rootCause?: string;
  remediationSteps: string[];
  lessonsLearned?: string;
  relatedAlerts: string[];
  assignedTo?: string;
  metrics: Record<string, any>;
}

/**
 * Mitigation action
 */
interface MitigationAction {
  type: 'rollback' | 'disable_feature' | 'increase_threshold' | 'manual_override' | 'retrain';
  description: string;
  automated: boolean;
  requiresApproval: boolean;
  estimatedDuration: number; // minutes
}

/**
 * Incident Response Service
 */
export class IncidentResponseService {
  private static activeIncidents: Map<string, Incident> = new Map();
  private static mitigationInProgress: Set<string> = new Set();

  /**
   * Detect and create incident if needed
   */
  static async detectIncident(params: {
    driftScore?: number;
    accuracyDrop?: number;
    errorRate?: number;
    responseTime?: number;
    modelVersion: string;
  }): Promise<Incident | null> {
    try {
      // Check for critical conditions
      const incidentType = this.determineIncidentType(params);

      if (!incidentType) {
        return null; // No incident detected
      }

      // Check if similar incident already exists
      const existingIncident = await this.checkExistingIncident(incidentType, params.modelVersion);

      if (existingIncident) {
        logger.info('Similar incident already active', {
          service: 'IncidentResponseService',
          incidentId: existingIncident.id
        });
        return existingIncident;
      }

      // Create new incident
      const incident = await this.createIncident({
        type: incidentType,
        modelVersion: params.modelVersion,
        metrics: params
      });

      // Start automated response
      this.initiateResponse(incident).catch(error => {
        logger.error('Failed to initiate incident response', {
          service: 'IncidentResponseService',
          incidentId: incident.id,
          error
        });
      });

      return incident;
    } catch (error) {
      logger.error('Failed to detect incident', {
        service: 'IncidentResponseService',
        error
      });
      return null;
    }
  }

  /**
   * Determine incident type based on metrics
   */
  private static determineIncidentType(params: {
    driftScore?: number;
    accuracyDrop?: number;
    errorRate?: number;
    responseTime?: number;
  }): IncidentType | null {
    // Critical drift (> 50%)
    if (params.driftScore && params.driftScore > 0.5) {
      return IncidentType.DRIFT_CRITICAL;
    }

    // Critical accuracy drop (> 15%)
    if (params.accuracyDrop && params.accuracyDrop > 0.15) {
      return IncidentType.ACCURACY_CRITICAL;
    }

    // High error rate (> 10%)
    if (params.errorRate && params.errorRate > 0.1) {
      return IncidentType.MODEL_FAILURE;
    }

    // Severe performance degradation (> 5 seconds)
    if (params.responseTime && params.responseTime > 5000) {
      return IncidentType.PERFORMANCE_DEGRADATION;
    }

    return null;
  }

  /**
   * Check for existing incident
   */
  private static async checkExistingIncident(
    type: IncidentType,
    modelVersion: string
  ): Promise<Incident | null> {
    try {
      const { data } = await serverSupabase
        .from('incidents')
        .select('*')
        .eq('incident_type', type)
        .eq('affected_model_version', modelVersion)
        .in('status', ['open', 'investigating', 'mitigated'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        return this.mapDbIncidentToIncident(data);
      }
    } catch (error) {
      // No existing incident
    }

    return null;
  }

  /**
   * Create new incident
   */
  private static async createIncident(params: {
    type: IncidentType;
    modelVersion: string;
    metrics: Record<string, any>;
  }): Promise<Incident> {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const severity = this.determineSeverity(params.type, params.metrics);

    const incident: Incident = {
      id: incidentId,
      type: params.type,
      severity,
      status: IncidentStatus.OPEN,
      affectedModelVersion: params.modelVersion,
      startedAt: new Date(),
      detectedAt: new Date(),
      impactDescription: this.generateImpactDescription(params.type, params.metrics),
      remediationSteps: [],
      relatedAlerts: [],
      metrics: params.metrics
    };

    // Store in database
    await serverSupabase.from('incidents').insert({
      id: incident.id,
      incident_type: incident.type,
      severity: incident.severity,
      status: incident.status,
      affected_model_version: incident.affectedModelVersion,
      started_at: incident.startedAt,
      detected_at: incident.detectedAt,
      impact_description: incident.impactDescription,
      remediation_steps: incident.remediationSteps,
      related_alerts: incident.relatedAlerts
    });

    // Store in memory for quick access
    this.activeIncidents.set(incidentId, incident);

    // Send alert
    await AlertingService.sendAlert({
      type: AlertType.SYSTEM_FAILURE,
      severity: this.mapPriorityToAlertSeverity(severity),
      title: `Incident Created: ${params.type.replace('_', ' ').toUpperCase()}`,
      message: incident.impactDescription,
      details: {
        modelVersion: params.modelVersion,
        timestamp: new Date().toISOString(),
        metrics: params.metrics,
        recommendations: this.getInitialRecommendations(params.type)
      }
    });

    logger.info('Incident created', {
      service: 'IncidentResponseService',
      incidentId,
      type: params.type,
      severity
    });

    return incident;
  }

  /**
   * Initiate automated response
   */
  private static async initiateResponse(incident: Incident): Promise<void> {
    if (this.mitigationInProgress.has(incident.id)) {
      logger.warn('Mitigation already in progress', {
        service: 'IncidentResponseService',
        incidentId: incident.id
      });
      return;
    }

    this.mitigationInProgress.add(incident.id);

    try {
      // Update status to investigating
      await this.updateIncidentStatus(incident.id, IncidentStatus.INVESTIGATING);

      // Determine mitigation actions
      const actions = this.determineMitigationActions(incident);

      // Execute automated actions
      for (const action of actions) {
        if (action.automated && !action.requiresApproval) {
          await this.executeMitigationAction(incident, action);
        } else if (action.requiresApproval) {
          await this.requestApproval(incident, action);
        }
      }

      // Check if incident is mitigated
      const isMitigated = await this.checkMitigation(incident);

      if (isMitigated) {
        await this.updateIncidentStatus(incident.id, IncidentStatus.MITIGATED);
        incident.mitigatedAt = new Date();

        // Schedule resolution check
        setTimeout(() => {
          this.checkResolution(incident);
        }, 30 * 60 * 1000); // 30 minutes
      }
    } catch (error) {
      logger.error('Failed to initiate response', {
        service: 'IncidentResponseService',
        incidentId: incident.id,
        error
      });
    } finally {
      this.mitigationInProgress.delete(incident.id);
    }
  }

  /**
   * Determine mitigation actions based on incident type
   */
  private static determineMitigationActions(incident: Incident): MitigationAction[] {
    const actions: MitigationAction[] = [];

    switch (incident.type) {
      case IncidentType.DRIFT_CRITICAL:
        actions.push({
          type: 'rollback',
          description: 'Rollback to previous stable model version',
          automated: true,
          requiresApproval: incident.severity === IncidentPriority.P1,
          estimatedDuration: 5
        });
        actions.push({
          type: 'retrain',
          description: 'Trigger emergency model retraining',
          automated: true,
          requiresApproval: false,
          estimatedDuration: 60
        });
        break;

      case IncidentType.ACCURACY_CRITICAL:
        actions.push({
          type: 'increase_threshold',
          description: 'Increase confidence threshold to reduce false positives',
          automated: true,
          requiresApproval: false,
          estimatedDuration: 1
        });
        actions.push({
          type: 'rollback',
          description: 'Rollback if accuracy continues to degrade',
          automated: true,
          requiresApproval: true,
          estimatedDuration: 5
        });
        break;

      case IncidentType.MODEL_FAILURE:
        actions.push({
          type: 'rollback',
          description: 'Immediate rollback to stable version',
          automated: true,
          requiresApproval: false,
          estimatedDuration: 2
        });
        actions.push({
          type: 'disable_feature',
          description: 'Disable AI predictions temporarily',
          automated: false,
          requiresApproval: true,
          estimatedDuration: 1
        });
        break;

      case IncidentType.PERFORMANCE_DEGRADATION:
        actions.push({
          type: 'manual_override',
          description: 'Enable caching and reduce model complexity',
          automated: true,
          requiresApproval: false,
          estimatedDuration: 5
        });
        break;

      default:
        actions.push({
          type: 'manual_override',
          description: 'Manual investigation required',
          automated: false,
          requiresApproval: true,
          estimatedDuration: 30
        });
    }

    return actions;
  }

  /**
   * Execute mitigation action
   */
  private static async executeMitigationAction(
    incident: Incident,
    action: MitigationAction
  ): Promise<void> {
    logger.info('Executing mitigation action', {
      service: 'IncidentResponseService',
      incidentId: incident.id,
      action: action.type
    });

    try {
      switch (action.type) {
        case 'rollback':
          await this.executeRollback(incident);
          break;

        case 'retrain':
          await AutoRetrainingService.triggerManualRetraining(
            `Incident response: ${incident.type}`
          );
          break;

        case 'increase_threshold':
          await this.adjustConfidenceThreshold(0.1); // Increase by 10%
          break;

        case 'disable_feature':
          await this.disableAIPredictions();
          break;

        case 'manual_override':
          await this.applyManualOverrides(incident);
          break;
      }

      // Record action in incident
      incident.remediationSteps.push(`${action.type}: ${action.description}`);

      // Update database
      await serverSupabase
        .from('incidents')
        .update({
          remediation_steps: incident.remediationSteps,
          updated_at: new Date()
        })
        .eq('id', incident.id);

      // Log to audit trail
      await this.logAutomatedAction(incident.id, action);

    } catch (error) {
      logger.error('Failed to execute mitigation action', {
        service: 'IncidentResponseService',
        incidentId: incident.id,
        action: action.type,
        error
      });
    }
  }

  /**
   * Execute model rollback
   */
  private static async executeRollback(incident: Incident): Promise<void> {
    try {
      // Get previous stable version
      const { data: previousVersion } = await serverSupabase
        .from('model_lineage')
        .select('parent_version')
        .eq('model_version', incident.affectedModelVersion)
        .single();

      if (!previousVersion?.parent_version) {
        throw new Error('No previous version found for rollback');
      }

      // Update current model version
      await serverSupabase
        .from('system_config')
        .upsert({
          key: 'current_model_version',
          value: { version: previousVersion.parent_version },
          reason: `Incident rollback: ${incident.id}`
        });

      // Send rollback alert
      await AlertingService.sendRollbackAlert({
        fromVersion: incident.affectedModelVersion,
        toVersion: previousVersion.parent_version,
        reason: `Incident response: ${incident.type}`,
        performanceMetrics: incident.metrics
      });

      logger.info('Model rolled back successfully', {
        service: 'IncidentResponseService',
        incidentId: incident.id,
        fromVersion: incident.affectedModelVersion,
        toVersion: previousVersion.parent_version
      });
    } catch (error) {
      logger.error('Failed to execute rollback', {
        service: 'IncidentResponseService',
        incidentId: incident.id,
        error
      });
      throw error;
    }
  }

  /**
   * Adjust confidence threshold
   */
  private static async adjustConfidenceThreshold(adjustment: number): Promise<void> {
    const { data: currentConfig } = await serverSupabase
      .from('system_config')
      .select('value')
      .eq('key', 'confidence_threshold')
      .single();

    const currentThreshold = currentConfig?.value?.threshold || 0.7;
    const newThreshold = Math.min(0.95, currentThreshold + adjustment);

    await serverSupabase
      .from('system_config')
      .upsert({
        key: 'confidence_threshold',
        value: { threshold: newThreshold },
        reason: 'Incident mitigation: Increased confidence threshold'
      });

    logger.info('Confidence threshold adjusted', {
      service: 'IncidentResponseService',
      oldThreshold: currentThreshold,
      newThreshold
    });
  }

  /**
   * Disable AI predictions temporarily
   */
  private static async disableAIPredictions(): Promise<void> {
    await serverSupabase
      .from('system_config')
      .upsert({
        key: 'ai_predictions_enabled',
        value: { enabled: false },
        reason: 'Incident mitigation: AI predictions disabled'
      });

    logger.warn('AI predictions disabled due to incident', {
      service: 'IncidentResponseService'
    });
  }

  /**
   * Apply manual overrides for performance
   */
  private static async applyManualOverrides(incident: Incident): Promise<void> {
    // Enable caching
    await serverSupabase
      .from('system_config')
      .upsert({
        key: 'performance_overrides',
        value: {
          caching_enabled: true,
          reduced_complexity: true,
          batch_processing: false,
          async_processing: true
        },
        reason: `Incident mitigation: ${incident.id}`
      });

    logger.info('Performance overrides applied', {
      service: 'IncidentResponseService',
      incidentId: incident.id
    });
  }

  /**
   * Request approval for action
   */
  private static async requestApproval(
    incident: Incident,
    action: MitigationAction
  ): Promise<void> {
    await AlertingService.sendAlert({
      type: AlertType.SYSTEM_FAILURE,
      severity: AlertSeverity.HIGH,
      title: 'Approval Required for Incident Mitigation',
      message: `Incident ${incident.id} requires approval for: ${action.description}`,
      details: {
        modelVersion: incident.affectedModelVersion,
        timestamp: new Date().toISOString(),
        metrics: incident.metrics,
        actionTaken: `Awaiting approval for ${action.type}`,
        recommendations: [
          'Review incident details',
          'Approve or reject mitigation action',
          'Consider manual intervention if needed'
        ]
      }
    });
  }

  /**
   * Check if mitigation was successful
   */
  private static async checkMitigation(incident: Incident): Promise<boolean> {
    // Re-check the metrics that triggered the incident
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

    const { data: latestMetrics } = await serverSupabase
      .from('model_performance_snapshots')
      .select('metrics')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!latestMetrics) return false;

    // Check if metrics have improved
    switch (incident.type) {
      case IncidentType.DRIFT_CRITICAL:
        return latestMetrics.metrics.driftScore < 0.3;

      case IncidentType.ACCURACY_CRITICAL:
        return latestMetrics.metrics.accuracy > 0.8;

      case IncidentType.MODEL_FAILURE:
        return latestMetrics.metrics.errorRate < 0.05;

      case IncidentType.PERFORMANCE_DEGRADATION:
        return latestMetrics.metrics.responseTime < 2000;

      default:
        return true;
    }
  }

  /**
   * Check if incident is resolved
   */
  private static async checkResolution(incident: Incident): Promise<void> {
    try {
      // Monitor for 30 minutes to ensure stability
      const isStable = await this.checkMitigation(incident);

      if (isStable) {
        await this.updateIncidentStatus(incident.id, IncidentStatus.RESOLVED);
        incident.resolvedAt = new Date();

        // Perform root cause analysis
        const rootCause = await this.performRootCauseAnalysis(incident);
        incident.rootCause = rootCause;

        // Generate lessons learned
        const lessons = this.generateLessonsLearned(incident);
        incident.lessonsLearned = lessons;

        // Update database
        await serverSupabase
          .from('incidents')
          .update({
            status: IncidentStatus.RESOLVED,
            resolved_at: incident.resolvedAt,
            root_cause: rootCause,
            lessons_learned: lessons
          })
          .eq('id', incident.id);

        // Send resolution notification
        await AlertingService.sendAlert({
          type: AlertType.SYSTEM_FAILURE,
          severity: AlertSeverity.LOW,
          title: `Incident Resolved: ${incident.id}`,
          message: `The incident has been successfully resolved and the system is stable`,
          details: {
            modelVersion: incident.affectedModelVersion,
            timestamp: new Date().toISOString(),
            metrics: incident.metrics,
            actionTaken: incident.remediationSteps.join(', '),
            recommendations: [
              'Review root cause analysis',
              'Implement preventive measures',
              'Update runbooks if needed'
            ]
          }
        });

        // Schedule closure
        setTimeout(() => {
          this.closeIncident(incident.id);
        }, 24 * 60 * 60 * 1000); // 24 hours
      } else {
        // Escalate if not resolved
        await this.escalateIncident(incident);
      }
    } catch (error) {
      logger.error('Failed to check resolution', {
        service: 'IncidentResponseService',
        incidentId: incident.id,
        error
      });
    }
  }

  /**
   * Perform root cause analysis
   */
  private static async performRootCauseAnalysis(incident: Incident): Promise<string> {
    // Simplified RCA - in production, this would be more sophisticated
    const causes: Record<IncidentType, string> = {
      [IncidentType.DRIFT_CRITICAL]: 'Data distribution shift due to seasonal changes or new patterns',
      [IncidentType.ACCURACY_CRITICAL]: 'Model overfitting or insufficient training data diversity',
      [IncidentType.MODEL_FAILURE]: 'Code bug or infrastructure issue',
      [IncidentType.DEPLOYMENT_FAILURE]: 'Configuration error or dependency conflict',
      [IncidentType.DATA_QUALITY_ISSUE]: 'Upstream data source changes or validation failures',
      [IncidentType.PERFORMANCE_DEGRADATION]: 'Resource constraints or inefficient model architecture',
      [IncidentType.SECURITY_BREACH]: 'Unauthorized access or vulnerability exploitation'
    };

    return causes[incident.type] || 'Unknown root cause';
  }

  /**
   * Generate lessons learned
   */
  private static generateLessonsLearned(incident: Incident): string {
    const lessons = [
      `Incident type: ${incident.type}`,
      `Duration: ${Math.round((incident.resolvedAt!.getTime() - incident.startedAt.getTime()) / 60000)} minutes`,
      `Mitigation actions: ${incident.remediationSteps.length}`,
      'Recommendations:',
      '- Implement additional monitoring for early detection',
      '- Update alerting thresholds based on this incident',
      '- Consider preventive retraining schedule',
      '- Review and update incident response procedures'
    ];

    return lessons.join('\n');
  }

  /**
   * Escalate incident
   */
  private static async escalateIncident(incident: Incident): Promise<void> {
    await AlertingService.sendAlert({
      type: AlertType.SYSTEM_FAILURE,
      severity: AlertSeverity.CRITICAL,
      title: `ESCALATION: Incident ${incident.id} Not Resolved`,
      message: 'Incident mitigation failed, manual intervention required',
      details: {
        modelVersion: incident.affectedModelVersion,
        timestamp: new Date().toISOString(),
        metrics: incident.metrics,
        actionTaken: incident.remediationSteps.join(', '),
        recommendations: [
          'Immediate manual investigation required',
          'Consider emergency rollback',
          'Engage senior engineering team',
          'Review all recent changes'
        ]
      }
    });

    await serverSupabase.from('alert_escalations').insert({
      alert_id: incident.id,
      escalation_level: 2,
      escalated_at: new Date(),
      escalated_to: { teams: ['engineering', 'ml-ops'] }
    });
  }

  /**
   * Close incident
   */
  private static async closeIncident(incidentId: string): Promise<void> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return;

    incident.status = IncidentStatus.CLOSED;
    incident.closedAt = new Date();

    await serverSupabase
      .from('incidents')
      .update({
        status: IncidentStatus.CLOSED,
        closed_at: incident.closedAt
      })
      .eq('id', incidentId);

    this.activeIncidents.delete(incidentId);

    logger.info('Incident closed', {
      service: 'IncidentResponseService',
      incidentId
    });
  }

  /**
   * Update incident status
   */
  private static async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus
  ): Promise<void> {
    const incident = this.activeIncidents.get(incidentId);
    if (incident) {
      incident.status = status;
    }

    await serverSupabase
      .from('incidents')
      .update({ status, updated_at: new Date() })
      .eq('id', incidentId);

    logger.info('Incident status updated', {
      service: 'IncidentResponseService',
      incidentId,
      status
    });
  }

  /**
   * Log automated action to audit trail
   */
  private static async logAutomatedAction(
    incidentId: string,
    action: MitigationAction
  ): Promise<void> {
    await serverSupabase.from('automation_audit_log').insert({
      action_type: `incident_mitigation_${action.type}`,
      action_details: {
        incident_id: incidentId,
        action,
        timestamp: new Date().toISOString()
      },
      triggered_by: 'system',
      success: true
    });
  }

  /**
   * Determine incident severity
   */
  private static determineSeverity(
    type: IncidentType,
    metrics: Record<string, any>
  ): IncidentPriority {
    // Critical types always get P1
    if (type === IncidentType.MODEL_FAILURE || type === IncidentType.SECURITY_BREACH) {
      return IncidentPriority.P1;
    }

    // Check metric thresholds
    if (metrics.driftScore > 0.5 || metrics.accuracyDrop > 0.15) {
      return IncidentPriority.P1;
    }

    if (metrics.driftScore > 0.3 || metrics.accuracyDrop > 0.1) {
      return IncidentPriority.P2;
    }

    if (metrics.driftScore > 0.2 || metrics.accuracyDrop > 0.05) {
      return IncidentPriority.P3;
    }

    return IncidentPriority.P4;
  }

  /**
   * Generate impact description
   */
  private static generateImpactDescription(
    type: IncidentType,
    metrics: Record<string, any>
  ): string {
    const descriptions: Record<IncidentType, string> = {
      [IncidentType.DRIFT_CRITICAL]: `Critical model drift detected (${(metrics.driftScore * 100).toFixed(1)}%), predictions may be unreliable`,
      [IncidentType.ACCURACY_CRITICAL]: `Model accuracy dropped by ${(metrics.accuracyDrop * 100).toFixed(1)}%, affecting prediction quality`,
      [IncidentType.MODEL_FAILURE]: `Model experiencing high error rate (${(metrics.errorRate * 100).toFixed(1)}%), service degraded`,
      [IncidentType.DEPLOYMENT_FAILURE]: 'Model deployment failed, rollback may be required',
      [IncidentType.DATA_QUALITY_ISSUE]: 'Input data quality issues detected, affecting model performance',
      [IncidentType.PERFORMANCE_DEGRADATION]: `Response time increased to ${metrics.responseTime}ms, user experience impacted`,
      [IncidentType.SECURITY_BREACH]: 'Security incident detected, immediate action required'
    };

    return descriptions[type] || 'Unknown incident impact';
  }

  /**
   * Get initial recommendations
   */
  private static getInitialRecommendations(type: IncidentType): string[] {
    const recommendations: Record<IncidentType, string[]> = {
      [IncidentType.DRIFT_CRITICAL]: [
        'Review recent data distributions',
        'Check for seasonal patterns',
        'Consider immediate retraining',
        'Monitor prediction confidence scores'
      ],
      [IncidentType.ACCURACY_CRITICAL]: [
        'Analyze recent predictions',
        'Review training data quality',
        'Check for class imbalance',
        'Consider model architecture changes'
      ],
      [IncidentType.MODEL_FAILURE]: [
        'Check error logs',
        'Verify input data format',
        'Review recent code changes',
        'Consider rollback to stable version'
      ],
      [IncidentType.DEPLOYMENT_FAILURE]: [
        'Review deployment logs',
        'Check configuration settings',
        'Verify dependencies',
        'Test in staging environment'
      ],
      [IncidentType.DATA_QUALITY_ISSUE]: [
        'Validate input data',
        'Check data pipeline',
        'Review data transformations',
        'Implement additional validation'
      ],
      [IncidentType.PERFORMANCE_DEGRADATION]: [
        'Check resource utilization',
        'Review model complexity',
        'Enable caching',
        'Consider model optimization'
      ],
      [IncidentType.SECURITY_BREACH]: [
        'Isolate affected systems',
        'Review access logs',
        'Change credentials',
        'Perform security audit'
      ]
    };

    return recommendations[type] || ['Manual investigation required'];
  }

  /**
   * Map priority to alert severity
   */
  private static mapPriorityToAlertSeverity(priority: IncidentPriority): AlertSeverity {
    const mapping: Record<IncidentPriority, AlertSeverity> = {
      [IncidentPriority.P1]: AlertSeverity.CRITICAL,
      [IncidentPriority.P2]: AlertSeverity.HIGH,
      [IncidentPriority.P3]: AlertSeverity.MEDIUM,
      [IncidentPriority.P4]: AlertSeverity.LOW
    };

    return mapping[priority];
  }

  /**
   * Map database incident to Incident interface
   */
  private static mapDbIncidentToIncident(data: unknown): Incident {
    return {
      id: data.id,
      type: data.incident_type,
      severity: data.severity,
      status: data.status,
      affectedModelVersion: data.affected_model_version,
      startedAt: new Date(data.started_at),
      detectedAt: new Date(data.detected_at),
      mitigatedAt: data.mitigated_at ? new Date(data.mitigated_at) : undefined,
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      impactDescription: data.impact_description,
      rootCause: data.root_cause,
      remediationSteps: data.remediation_steps || [],
      lessonsLearned: data.lessons_learned,
      relatedAlerts: data.related_alerts || [],
      assignedTo: data.assigned_to,
      metrics: {}
    };
  }

  /**
   * Get active incidents
   */
  static getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values());
  }

  /**
   * Get incident by ID
   */
  static async getIncident(incidentId: string): Promise<Incident | null> {
    // Check memory first
    if (this.activeIncidents.has(incidentId)) {
      return this.activeIncidents.get(incidentId)!;
    }

    // Check database
    try {
      const { data } = await serverSupabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (data) {
        return this.mapDbIncidentToIncident(data);
      }
    } catch (error) {
      logger.error('Failed to get incident', {
        service: 'IncidentResponseService',
        incidentId,
        error
      });
    }

    return null;
  }
}