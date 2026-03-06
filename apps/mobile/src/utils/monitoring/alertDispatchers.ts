import { Platform } from 'react-native';
import { logger } from '../logger';
import type { Alert, AlertChannel, SystemHealth } from './types';

export function sendConsoleAlert(alert: Alert): void {
  const emoji = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' }[alert.severity];
  logger.warn(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
}

export function sendSentryAlert(alert: Alert): void {
  logger.error(`ALERT: ${alert.message}`, undefined, {
    alertId: alert.id,
    severity: alert.severity,
    details: alert.details,
  });
}

export async function sendWebhookAlert(
  alert: Alert,
  webhookEndpoints: string[],
  health: SystemHealth
): Promise<void> {
  const payload = {
    type: 'alert',
    alert: { id: alert.id, message: alert.message, severity: alert.severity,
      timestamp: alert.timestamp, details: alert.details },
    system: { platform: Platform.OS, health: summariseHealth(health) },
  };

  const promises = webhookEndpoints.map(async (url) => {
    try {
      if (Platform.OS === 'web') {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      logger.debug('MonitoringAndAlerting', 'Webhook alert sent', { url });
    } catch (error) {
      logger.error('MonitoringAndAlerting', 'Webhook alert failed', error as unknown as Record<string, unknown>);
    }
  });

  await Promise.allSettled(promises);
}

export async function sendEmailAlert(alert: Alert): Promise<void> {
  logger.debug('MonitoringAndAlerting', 'Email alert (placeholder)', { alert: alert.id });
}

export async function sendPushAlert(alert: Alert): Promise<void> {
  logger.debug('MonitoringAndAlerting', 'Push alert (placeholder)', { alert: alert.id });
}

export async function dispatchAlert(
  alert: Alert,
  channels: AlertChannel[],
  webhookEndpoints: string[],
  health: SystemHealth
): Promise<void> {
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'console': sendConsoleAlert(alert); break;
        case 'sentry':  sendSentryAlert(alert); break;
        case 'webhook': await sendWebhookAlert(alert, webhookEndpoints, health); break;
        case 'email':   await sendEmailAlert(alert); break;
        case 'push':    await sendPushAlert(alert); break;
      }
    } catch (error) {
      logger.error('MonitoringAndAlerting', `Failed to send alert via ${channel}`, error as unknown as Record<string, unknown>);
    }
  }
}

export function summariseHealth(health: SystemHealth): Record<string, unknown> {
  const services: Record<string, unknown> = {};
  for (const [name, status] of health.services) {
    services[name] = { healthy: status.healthy, message: status.message, responseTime: status.responseTime };
  }
  return { overall: health.overall, lastUpdated: health.lastUpdated, services };
}
