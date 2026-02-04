/**
 * Alerting Service for Model Drift and Performance Degradation
 *
 * Provides multi-channel alerting (Email, Slack, PagerDuty) for:
 * - Model drift detection
 * - Performance degradation
 * - Accuracy drops
 * - Auto-retraining triggers
 * - System failures
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { Resend } from 'resend';
import { WebClient as SlackWebClient } from '@slack/web-api';

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);
const slack = new SlackWebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Alert types
 */
export enum AlertType {
  DRIFT_DETECTED = 'drift_detected',
  ACCURACY_DROP = 'accuracy_drop',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  AUTO_RETRAIN_TRIGGERED = 'auto_retrain_triggered',
  RETRAIN_COMPLETED = 'retrain_completed',
  MODEL_ROLLBACK = 'model_rollback',
  SYSTEM_FAILURE = 'system_failure'
}

/**
 * Alert channels
 */
export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  PAGERDUTY = 'pagerduty',
  WEBHOOK = 'webhook'
}

/**
 * Alert payload interface
 */
export interface AlertPayload {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: {
    modelVersion?: string;
    driftScore?: number;
    accuracyDrop?: number;
    performanceScore?: number;
    correctionCount?: number;
    timestamp: string;
    metrics?: Record<string, unknown>;
    recommendations?: string[];
    actionTaken?: string;
  };
  channels?: AlertChannel[];
  recipients?: {
    emails?: string[];
    slackChannels?: string[];
    pagerdutyService?: string;
    webhookUrls?: string[];
  };
}

/**
 * Alert configuration interface
 */
interface AlertConfig {
  channels: {
    email: {
      enabled: boolean;
      recipients: string[];
      fromEmail: string;
      fromName: string;
    };
    slack: {
      enabled: boolean;
      channels: Record<AlertSeverity, string>;
      botName: string;
    };
    pagerduty: {
      enabled: boolean;
      routingKey: string;
      serviceIds: Record<AlertSeverity, string>;
    };
    webhook: {
      enabled: boolean;
      urls: string[];
    };
  };
  thresholds: {
    driftScore: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    accuracyDrop: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    performanceScore: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  escalation: {
    enabled: boolean;
    rules: Array<{
      severity: AlertSeverity;
      initialDelay: number; // minutes
      escalationDelay: number; // minutes
      maxEscalations: number;
    }>;
  };
}

/**
 * Alerting Service
 */
export class AlertingService {
  private static config: AlertConfig = {
    channels: {
      email: {
        enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
        recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
        fromEmail: process.env.ALERT_FROM_EMAIL || 'alerts@mintenance.com',
        fromName: process.env.ALERT_FROM_NAME || 'Mintenance AI Alerts'
      },
      slack: {
        enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
        channels: {
          [AlertSeverity.LOW]: process.env.SLACK_CHANNEL_LOW || '#ai-alerts-low',
          [AlertSeverity.MEDIUM]: process.env.SLACK_CHANNEL_MEDIUM || '#ai-alerts-medium',
          [AlertSeverity.HIGH]: process.env.SLACK_CHANNEL_HIGH || '#ai-alerts-high',
          [AlertSeverity.CRITICAL]: process.env.SLACK_CHANNEL_CRITICAL || '#ai-alerts-critical'
        },
        botName: process.env.SLACK_BOT_NAME || 'AI Monitor'
      },
      pagerduty: {
        enabled: process.env.PAGERDUTY_ENABLED === 'true',
        routingKey: process.env.PAGERDUTY_ROUTING_KEY || '',
        serviceIds: {
          [AlertSeverity.LOW]: process.env.PAGERDUTY_SERVICE_LOW || '',
          [AlertSeverity.MEDIUM]: process.env.PAGERDUTY_SERVICE_MEDIUM || '',
          [AlertSeverity.HIGH]: process.env.PAGERDUTY_SERVICE_HIGH || '',
          [AlertSeverity.CRITICAL]: process.env.PAGERDUTY_SERVICE_CRITICAL || ''
        }
      },
      webhook: {
        enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
        urls: (process.env.WEBHOOK_URLS || '').split(',').filter(Boolean)
      }
    },
    thresholds: {
      driftScore: {
        low: 0.15,
        medium: 0.25,
        high: 0.35,
        critical: 0.5
      },
      accuracyDrop: {
        low: 0.03, // 3%
        medium: 0.05, // 5%
        high: 0.10, // 10%
        critical: 0.15 // 15%
      },
      performanceScore: {
        critical: 50,
        high: 60,
        medium: 70,
        low: 80
      }
    },
    escalation: {
      enabled: process.env.ALERT_ESCALATION_ENABLED === 'true',
      rules: [
        {
          severity: AlertSeverity.CRITICAL,
          initialDelay: 5,
          escalationDelay: 10,
          maxEscalations: 3
        },
        {
          severity: AlertSeverity.HIGH,
          initialDelay: 15,
          escalationDelay: 30,
          maxEscalations: 2
        },
        {
          severity: AlertSeverity.MEDIUM,
          initialDelay: 30,
          escalationDelay: 60,
          maxEscalations: 1
        }
      ]
    }
  };

  /**
   * Send alert through configured channels
   */
  static async sendAlert(payload: AlertPayload): Promise<void> {
    try {
      // Determine channels if not specified
      const channels = payload.channels || this.getDefaultChannels(payload.severity);

      // Store alert in database
      await this.storeAlert(payload);

      // Send to each channel in parallel
      const promises: Promise<void>[] = [];

      if (channels.includes(AlertChannel.EMAIL) && this.config.channels.email.enabled) {
        promises.push(this.sendEmailAlert(payload));
      }

      if (channels.includes(AlertChannel.SLACK) && this.config.channels.slack.enabled) {
        promises.push(this.sendSlackAlert(payload));
      }

      if (channels.includes(AlertChannel.PAGERDUTY) && this.config.channels.pagerduty.enabled) {
        promises.push(this.sendPagerDutyAlert(payload));
      }

      if (channels.includes(AlertChannel.WEBHOOK) && this.config.channels.webhook.enabled) {
        promises.push(this.sendWebhookAlert(payload));
      }

      await Promise.allSettled(promises);

      logger.info('Alert sent successfully', {
        service: 'AlertingService',
        type: payload.type,
        severity: payload.severity,
        channels
      });

      // Setup escalation if needed
      if (this.config.escalation.enabled) {
        await this.setupEscalation(payload);
      }
    } catch (error) {
      logger.error('Failed to send alert', {
        service: 'AlertingService',
        error,
        payload
      });
      throw error;
    }
  }

  /**
   * Send drift detection alert
   */
  static async sendDriftAlert(params: {
    driftScore: number;
    driftType: string;
    modelVersion: string;
    affectedFeatures: string[];
    recommendations: string[];
  }): Promise<void> {
    const severity = this.getDriftSeverity(params.driftScore);

    await this.sendAlert({
      type: AlertType.DRIFT_DETECTED,
      severity,
      title: `Model Drift Detected - ${severity.toUpperCase()} Priority`,
      message: `Drift score of ${(params.driftScore * 100).toFixed(1)}% detected in model ${params.modelVersion}`,
      details: {
        modelVersion: params.modelVersion,
        driftScore: params.driftScore,
        timestamp: new Date().toISOString(),
        metrics: {
          driftType: params.driftType,
          affectedFeatures: params.affectedFeatures
        },
        recommendations: params.recommendations
      }
    });
  }

  /**
   * Send accuracy drop alert
   */
  static async sendAccuracyAlert(params: {
    currentAccuracy: number;
    baselineAccuracy: number;
    dropPercentage: number;
    modelVersion: string;
    sampleSize: number;
  }): Promise<void> {
    const severity = this.getAccuracySeverity(params.dropPercentage);

    await this.sendAlert({
      type: AlertType.ACCURACY_DROP,
      severity,
      title: `Model Accuracy Degradation - ${severity.toUpperCase()} Priority`,
      message: `Accuracy dropped by ${(params.dropPercentage * 100).toFixed(1)}% from baseline`,
      details: {
        modelVersion: params.modelVersion,
        accuracyDrop: params.dropPercentage,
        timestamp: new Date().toISOString(),
        metrics: {
          currentAccuracy: params.currentAccuracy,
          baselineAccuracy: params.baselineAccuracy,
          sampleSize: params.sampleSize
        },
        recommendations: [
          'Review recent predictions for patterns',
          'Check for data distribution changes',
          'Consider triggering model retraining'
        ]
      }
    });
  }

  /**
   * Send auto-retrain trigger alert
   */
  static async sendAutoRetrainAlert(params: {
    triggerReason: string;
    correctionCount: number;
    driftScore?: number;
    accuracyDrop?: number;
    modelVersion: string;
  }): Promise<void> {
    await this.sendAlert({
      type: AlertType.AUTO_RETRAIN_TRIGGERED,
      severity: AlertSeverity.MEDIUM,
      title: 'Automatic Model Retraining Initiated',
      message: `Model retraining triggered: ${params.triggerReason}`,
      details: {
        modelVersion: params.modelVersion,
        correctionCount: params.correctionCount,
        driftScore: params.driftScore,
        accuracyDrop: params.accuracyDrop,
        timestamp: new Date().toISOString(),
        actionTaken: 'Retraining pipeline initiated',
        recommendations: [
          'Monitor retraining progress',
          'Review training metrics',
          'Validate new model before deployment'
        ]
      }
    });
  }

  /**
   * Send model rollback alert
   */
  static async sendRollbackAlert(params: {
    fromVersion: string;
    toVersion: string;
    reason: string;
    performanceMetrics: Record<string, unknown>;
  }): Promise<void> {
    await this.sendAlert({
      type: AlertType.MODEL_ROLLBACK,
      severity: AlertSeverity.HIGH,
      title: 'Model Rollback Executed',
      message: `Model rolled back from ${params.fromVersion} to ${params.toVersion}`,
      details: {
        modelVersion: params.toVersion,
        timestamp: new Date().toISOString(),
        metrics: params.performanceMetrics,
        actionTaken: `Rolled back due to: ${params.reason}`,
        recommendations: [
          'Investigate root cause of failure',
          'Review training data quality',
          'Check for data distribution changes',
          'Consider manual intervention'
        ]
      }
    });
  }

  /**
   * Send email alert
   */
  private static async sendEmailAlert(payload: AlertPayload): Promise<void> {
    try {
      const recipients = payload.recipients?.emails || this.config.channels.email.recipients;

      if (recipients.length === 0) {
        logger.warn('No email recipients configured for alert');
        return;
      }

      const html = this.formatEmailContent(payload);

      await resend.emails.send({
        from: `${this.config.channels.email.fromName} <${this.config.channels.email.fromEmail}>`,
        to: recipients,
        subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        html
      });

      logger.info('Email alert sent', {
        service: 'AlertingService',
        recipients,
        type: payload.type
      });
    } catch (error) {
      logger.error('Failed to send email alert', {
        service: 'AlertingService',
        error
      });
    }
  }

  /**
   * Send Slack alert
   */
  private static async sendSlackAlert(payload: AlertPayload): Promise<void> {
    try {
      const channel = payload.recipients?.slackChannels?.[0] ||
                      this.config.channels.slack.channels[payload.severity];

      const blocks = this.formatSlackBlocks(payload);

      await slack.chat.postMessage({
        channel,
        username: this.config.channels.slack.botName,
        blocks,
        text: payload.title // Fallback text
      });

      logger.info('Slack alert sent', {
        service: 'AlertingService',
        channel,
        type: payload.type
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        service: 'AlertingService',
        error
      });
    }
  }

  /**
   * Send PagerDuty alert
   */
  private static async sendPagerDutyAlert(payload: AlertPayload): Promise<void> {
    try {
      const routingKey = this.config.channels.pagerduty.routingKey;
      if (!routingKey) {
        logger.warn('PagerDuty routing key not configured');
        return;
      }

      const event = {
        routing_key: routingKey,
        event_action: 'trigger',
        payload: {
          summary: payload.title,
          severity: this.mapToPagerDutySeverity(payload.severity),
          source: 'mintenance-ai',
          component: 'building-surveyor',
          custom_details: payload.details
        }
      };

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`PagerDuty API error: ${response.statusText}`);
      }

      logger.info('PagerDuty alert sent', {
        service: 'AlertingService',
        type: payload.type,
        severity: payload.severity
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', {
        service: 'AlertingService',
        error
      });
    }
  }

  /**
   * Send webhook alert
   */
  private static async sendWebhookAlert(payload: AlertPayload): Promise<void> {
    try {
      const urls = payload.recipients?.webhookUrls || this.config.channels.webhook.urls;

      const promises = urls.map(url =>
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      );

      await Promise.allSettled(promises);

      logger.info('Webhook alerts sent', {
        service: 'AlertingService',
        urlCount: urls.length,
        type: payload.type
      });
    } catch (error) {
      logger.error('Failed to send webhook alerts', {
        service: 'AlertingService',
        error
      });
    }
  }

  /**
   * Store alert in database
   */
  private static async storeAlert(payload: AlertPayload): Promise<void> {
    try {
      await serverSupabase.from('drift_notifications').insert({
        severity: payload.severity,
        model_version: payload.details.modelVersion || 'unknown',
        performance_score: payload.details.performanceScore,
        alerts: payload,
        timestamp: payload.details.timestamp,
        sent: true,
        sent_to: {
          channels: payload.channels,
          recipients: payload.recipients
        }
      });
    } catch (error) {
      logger.error('Failed to store alert in database', {
        service: 'AlertingService',
        error
      });
    }
  }

  /**
   * Setup alert escalation
   */
  private static async setupEscalation(payload: AlertPayload): Promise<void> {
    const rule = this.config.escalation.rules.find(r => r.severity === payload.severity);

    if (!rule) return;

    // Schedule escalation checks
    setTimeout(async () => {
      // Check if issue is resolved
      const resolved = await this.checkIfResolved(payload);
      if (!resolved) {
        // Escalate alert
        await this.escalateAlert(payload, 1, rule);
      }
    }, rule.initialDelay * 60 * 1000);
  }

  /**
   * Escalate alert
   */
  private static async escalateAlert(
    originalPayload: AlertPayload,
    escalationLevel: number,
    rule: { severity: AlertSeverity; initialDelay: number; escalationDelay: number; maxEscalations: number }
  ): Promise<void> {
    if (escalationLevel > rule.maxEscalations) {
      logger.warn('Max escalation level reached', {
        service: 'AlertingService',
        type: originalPayload.type
      });
      return;
    }

    const escalatedPayload: AlertPayload = {
      ...originalPayload,
      title: `[ESCALATED ${escalationLevel}] ${originalPayload.title}`,
      message: `This alert has been escalated (Level ${escalationLevel}). ${originalPayload.message}`,
      severity: AlertSeverity.CRITICAL // Escalate to critical
    };

    await this.sendAlert(escalatedPayload);

    // Schedule next escalation
    setTimeout(async () => {
      const resolved = await this.checkIfResolved(originalPayload);
      if (!resolved) {
        await this.escalateAlert(originalPayload, escalationLevel + 1, rule);
      }
    }, rule.escalationDelay * 60 * 1000);
  }

  /**
   * Check if alert condition is resolved
   */
  private static async checkIfResolved(payload: AlertPayload): Promise<boolean> {
    // Implementation depends on alert type
    // For now, return false to demonstrate escalation
    return false;
  }

  /**
   * Format email content
   */
  private static formatEmailContent(payload: AlertPayload): string {
    const detailsHtml = Object.entries(payload.details)
      .filter(([key]) => key !== 'timestamp')
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `<li><strong>${this.formatKey(key)}:</strong><br/><pre>${JSON.stringify(value, null, 2)}</pre></li>`;
        }
        return `<li><strong>${this.formatKey(key)}:</strong> ${value}</li>`;
      })
      .join('');

    const recommendationsHtml = payload.details.recommendations
      ? `<h3>Recommendations</h3><ul>${payload.details.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .alert-container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .severity-${payload.severity} {
            border-left: 5px solid ${this.getSeverityColor(payload.severity)};
            padding-left: 15px;
          }
          h2 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
          ul { list-style-type: none; padding-left: 0; }
          li { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="alert-container severity-${payload.severity}">
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          <h3>Details</h3>
          <ul>${detailsHtml}</ul>
          ${recommendationsHtml}
          <hr/>
          <p><small>Alert generated at ${payload.details.timestamp}</small></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Format Slack blocks
   */
  private static formatSlackBlocks(payload: AlertPayload): Array<Record<string, unknown>> {
    const blocks: Array<Record<string, unknown>> = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: payload.title,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message
        }
      },
      {
        type: 'section',
        fields: Object.entries(payload.details)
          .filter(([key]) => !['timestamp', 'metrics', 'recommendations'].includes(key))
          .map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${this.formatKey(key)}:*\n${value}`
          }))
      }
    ];

    if (payload.details.recommendations) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recommendations:*\n${payload.details.recommendations.map(r => `• ${r}`).join('\n')}`
        }
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🚨 *Severity:* ${payload.severity.toUpperCase()} | ⏰ *Time:* ${payload.details.timestamp}`
        }
      ]
    });

    return blocks;
  }

  /**
   * Get default channels based on severity
   */
  private static getDefaultChannels(severity: AlertSeverity): AlertChannel[] {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.PAGERDUTY];
      case AlertSeverity.HIGH:
        return [AlertChannel.EMAIL, AlertChannel.SLACK];
      case AlertSeverity.MEDIUM:
        return [AlertChannel.SLACK];
      case AlertSeverity.LOW:
      default:
        return [AlertChannel.SLACK];
    }
  }

  /**
   * Get drift severity based on score
   */
  private static getDriftSeverity(driftScore: number): AlertSeverity {
    const thresholds = this.config.thresholds.driftScore;
    if (driftScore >= thresholds.critical) return AlertSeverity.CRITICAL;
    if (driftScore >= thresholds.high) return AlertSeverity.HIGH;
    if (driftScore >= thresholds.medium) return AlertSeverity.MEDIUM;
    if (driftScore >= thresholds.low) return AlertSeverity.LOW;
    return AlertSeverity.LOW;
  }

  /**
   * Get accuracy severity based on drop percentage
   */
  private static getAccuracySeverity(dropPercentage: number): AlertSeverity {
    const thresholds = this.config.thresholds.accuracyDrop;
    if (dropPercentage >= thresholds.critical) return AlertSeverity.CRITICAL;
    if (dropPercentage >= thresholds.high) return AlertSeverity.HIGH;
    if (dropPercentage >= thresholds.medium) return AlertSeverity.MEDIUM;
    if (dropPercentage >= thresholds.low) return AlertSeverity.LOW;
    return AlertSeverity.LOW;
  }

  /**
   * Map to PagerDuty severity
   */
  private static mapToPagerDutySeverity(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'critical';
      case AlertSeverity.HIGH:
        return 'error';
      case AlertSeverity.MEDIUM:
        return 'warning';
      case AlertSeverity.LOW:
      default:
        return 'info';
    }
  }

  /**
   * Format key for display
   */
  private static formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  /**
   * Get severity color
   */
  private static getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '#d32f2f';
      case AlertSeverity.HIGH:
        return '#f57c00';
      case AlertSeverity.MEDIUM:
        return '#fbc02d';
      case AlertSeverity.LOW:
      default:
        return '#388e3c';
    }
  }
}