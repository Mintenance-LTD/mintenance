# A/B Test Alerting System

## Overview

The A/B Test Alerting System monitors key metrics and triggers alerts when safety or performance thresholds are exceeded. Alerts are categorized by severity (critical, warning, info) and can trigger notifications.

## Alert Types

### Critical Alerts

**SFN Rate Exceeded**
- **Threshold**: SFN rate > 0.1%
- **Meaning**: Safety False Negative rate has exceeded the critical threshold
- **Action**: Immediate review of safety-critical assessments required
- **Configuration**: `AB_TEST_SFN_RATE_THRESHOLD` (default: 0.1)

### Warning Alerts

**Coverage Violation**
- **Threshold**: Coverage violation > 5% in any stratum
- **Meaning**: Conformal prediction coverage has dropped below target
- **Action**: Review calibration data and consider recalibration
- **Configuration**: `AB_TEST_COVERAGE_VIOLATION_THRESHOLD` (default: 5.0)

**Automation Rate Spike**
- **Threshold**: Day-over-day change > 20%
- **Meaning**: Automation rate changed significantly, may indicate system drift
- **Action**: Investigate cause of change
- **Configuration**: `AB_TEST_AUTOMATION_SPIKE_THRESHOLD` (default: 20.0)

### Info Alerts

**Low Critic Observations**
- **Threshold**: Critic model observations < 100
- **Meaning**: Critic model needs more training data
- **Action**: Validate more assessments to train the model
- **Configuration**: `AB_TEST_CRITIC_OBSERVATIONS_THRESHOLD` (default: 100)

**Low Calibration Data**
- **Threshold**: Calibration data points < 100
- **Meaning**: Insufficient calibration data for conformal prediction
- **Action**: Run `populate-ab-test-calibration-data.ts` script
- **Configuration**: `AB_TEST_CALIBRATION_DATA_THRESHOLD` (default: 100)

## Usage

### Checking Alerts

```typescript
import { ABTestAlertingService } from '@/lib/services/building-surveyor/ABTestAlertingService';

const result = await ABTestAlertingService.checkAlerts(experimentId);

if (result.hasAlerts) {
  console.log(`Critical: ${result.criticalCount}`);
  console.log(`Warning: ${result.warningCount}`);
  console.log(`Info: ${result.infoCount}`);
  
  result.alerts.forEach(alert => {
    console.log(`[${alert.severity}] ${alert.message}`);
  });
}
```

### Persisting Alerts

```typescript
// Automatically persists alerts to database
const result = await ABTestAlertingService.checkAndPersistAlerts(experimentId);
```

### Acknowledging Alerts

```typescript
await ABTestAlertingService.acknowledgeAlert(alertId, userId);
```

## Configuration

Alert thresholds can be configured via environment variables:

```bash
AB_TEST_SFN_RATE_THRESHOLD=0.1
AB_TEST_COVERAGE_VIOLATION_THRESHOLD=5.0
AB_TEST_AUTOMATION_SPIKE_THRESHOLD=20.0
AB_TEST_CRITIC_OBSERVATIONS_THRESHOLD=100
AB_TEST_CALIBRATION_DATA_THRESHOLD=100
```

## Alert Persistence

Alerts are logged and can be persisted to the database (when `ab_alerts` table is created). The system prevents duplicate alerts within a 1-hour window unless:

- Severity increases
- Value changes significantly (>10%)

## Integration

The alerting service is integrated into:

- **Monitoring Script**: `scripts/monitor-ab-test-metrics.ts` checks alerts on each run
- **Dashboard API**: `/api/building-surveyor/ab-test-dashboard` includes alert status
- **Metrics API**: Can include alerts via query parameter

## Best Practices

1. **Monitor Regularly**: Run the monitoring script daily or set up automated checks
2. **Respond to Critical Alerts**: Critical alerts require immediate attention
3. **Review Warning Trends**: Track warning alerts over time to identify patterns
4. **Acknowledge Alerts**: Mark alerts as acknowledged after addressing them
5. **Adjust Thresholds**: Fine-tune thresholds based on your safety requirements

