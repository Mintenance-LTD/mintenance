/**
 * Payment Monitoring Service
 *
 * Monitors payment transactions for anomalies, fraud patterns,
 * and suspicious activity. Provides real-time alerting for high-risk transactions.
 *
 * Features:
 * - Anomaly detection
 * - Failure rate tracking
 * - Velocity limiting
 * - Pattern analysis
 * - Real-time alerts
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Transaction for monitoring
 */
export interface MonitoredTransaction {
  userId: string;
  amount: number;
  currency: string;
  type: 'payment' | 'escrow_release' | 'refund' | 'payout';
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  isAnomalous: boolean;
  confidence: number; // 0-100
  reasons: string[];
  riskScore: number; // 0-100
  blockedReasons: string[];
}

/**
 * Velocity check result
 */
export interface VelocityResult {
  withinLimits: boolean;
  currentCount: number;
  maxAllowed: number;
  windowMinutes: number;
  nextAllowedTime?: Date;
}

/**
 * Payment Monitoring Service
 */
export class PaymentMonitoringService {
  /**
   * Velocity limits (transactions per time window)
   */
  private static readonly VELOCITY_LIMITS = {
    PAYMENT_COUNT_PER_HOUR: 10,
    PAYMENT_COUNT_PER_DAY: 50,
    PAYMENT_AMOUNT_PER_HOUR: 50000, // $50,000
    PAYMENT_AMOUNT_PER_DAY: 200000, // $200,000
    REFUND_COUNT_PER_DAY: 5,
    ESCROW_RELEASE_COUNT_PER_DAY: 10,
  };

  /**
   * Anomaly thresholds
   */
  private static readonly ANOMALY_THRESHOLDS = {
    AMOUNT_DEVIATION_MULTIPLIER: 5, // 5x average is anomalous
    UNUSUAL_TIME_HOUR_START: 2, // 2 AM
    UNUSUAL_TIME_HOUR_END: 6, // 6 AM
    RAPID_SUCCESSION_MINUTES: 2, // 2 minutes between transactions
    MAX_FAILURE_RATE: 0.5, // 50% failure rate
  };

  /**
   * Detect anomalies in a transaction
   */
  static async detectAnomalies(
    userId: string,
    transaction: MonitoredTransaction
  ): Promise<AnomalyResult> {
    const reasons: string[] = [];
    const blockedReasons: string[] = [];
    let riskScore = 0;

    try {
      // Check 1: Unusual amount compared to user's history
      const amountAnomaly = await this.checkAmountAnomaly(userId, transaction.amount);
      if (amountAnomaly.isAnomalous) {
        reasons.push(`Transaction amount is ${amountAnomaly.deviationMultiplier}x user's average`);
        riskScore += 30;

        if (amountAnomaly.deviationMultiplier > 10) {
          blockedReasons.push('Transaction amount is extremely unusual for this account');
          riskScore += 40;
        }
      }

      // Check 2: Velocity - too many transactions in short time
      const velocityCheck = await this.checkVelocityLimits(userId, transaction.amount);
      if (!velocityCheck.withinLimits) {
        reasons.push('Transaction velocity exceeds limits');
        blockedReasons.push(
          `Too many transactions. Current: ${velocityCheck.currentCount}, Max: ${velocityCheck.maxAllowed}`
        );
        riskScore += 35;
      }

      // Check 3: Unusual time of day
      const timestamp = transaction.timestamp || new Date();
      const hour = timestamp.getHours();
      if (
        hour >= this.ANOMALY_THRESHOLDS.UNUSUAL_TIME_HOUR_START &&
        hour <= this.ANOMALY_THRESHOLDS.UNUSUAL_TIME_HOUR_END
      ) {
        reasons.push('Transaction at unusual time (late night/early morning)');
        riskScore += 15;
      }

      // Check 4: Rapid succession
      const isRapidSuccession = await this.checkRapidSuccession(userId);
      if (isRapidSuccession) {
        reasons.push('Multiple transactions in rapid succession');
        riskScore += 25;
      }

      // Check 5: High failure rate
      const failureRate = await this.trackFailureRate(userId);
      if (failureRate >= this.ANOMALY_THRESHOLDS.MAX_FAILURE_RATE) {
        reasons.push(`High payment failure rate: ${(failureRate * 100).toFixed(1)}%`);
        riskScore += 30;

        if (failureRate >= 0.8) {
          blockedReasons.push('Extremely high failure rate indicates potential fraud');
          riskScore += 30;
        }
      }

      // Check 6: Geographic anomaly (if location data available)
      if (transaction.metadata?.ipAddress) {
        const geoAnomaly = await this.checkGeographicAnomaly(
          userId,
          transaction.metadata.ipAddress
        );
        if (geoAnomaly) {
          reasons.push('Transaction from unusual location');
          riskScore += 20;
        }
      }

      // Check 7: Device fingerprint change (if available)
      if (transaction.metadata?.deviceFingerprint) {
        const isNewDevice = await this.checkDeviceAnomaly(
          userId,
          transaction.metadata.deviceFingerprint
        );
        if (isNewDevice) {
          reasons.push('Transaction from new device');
          riskScore += 15;
        }
      }

      // Cap risk score at 100
      riskScore = Math.min(100, riskScore);

      // Determine if anomalous (risk score > 50 or any blocking reasons)
      const isAnomalous = riskScore > 50 || blockedReasons.length > 0;

      // Calculate confidence (0-100)
      const confidence = Math.min(100, Math.round((reasons.length / 7) * 100));

      // Log the detection
      logger.info('Anomaly detection completed', {
        service: 'payment_monitoring',
        userId,
        transactionType: transaction.type,
        amount: transaction.amount,
        isAnomalous,
        riskScore,
        confidence,
        reasonCount: reasons.length,
        blockedReasonCount: blockedReasons.length,
      });

      // Alert on high-risk transactions
      if (isAnomalous) {
        await this.alertOnHighRiskTransaction({
          userId,
          transaction,
          riskScore,
          reasons,
          blockedReasons,
        });
      }

      return {
        isAnomalous,
        confidence,
        reasons,
        riskScore,
        blockedReasons,
      };
    } catch (error) {
      logger.error('Error detecting anomalies', error, {
        service: 'payment_monitoring',
        userId,
        transactionType: transaction.type,
      });

      // On error, flag as anomalous to be safe
      return {
        isAnomalous: true,
        confidence: 100,
        reasons: ['Error during anomaly detection - flagged for review'],
        riskScore: 100,
        blockedReasons: ['Manual review required due to detection error'],
      };
    }
  }

  /**
   * Check if amount is anomalous compared to user history
   */
  private static async checkAmountAnomaly(
    userId: string,
    amount: number
  ): Promise<{ isAnomalous: boolean; deviationMultiplier: number }> {
    try {
      // Get user's recent transaction history
      const { data: recentTransactions, error } = await serverSupabase
        .from('escrow_transactions')
        .select('amount')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !recentTransactions || recentTransactions.length === 0) {
        // No history - flag large amounts as anomalous
        return {
          isAnomalous: amount > 10000,
          deviationMultiplier: 0,
        };
      }

      // Calculate average transaction amount
      const avgAmount =
        recentTransactions.reduce((sum, t) => sum + t.amount, 0) /
        recentTransactions.length;

      // Calculate deviation
      const deviationMultiplier = avgAmount > 0 ? amount / avgAmount : 0;

      return {
        isAnomalous:
          deviationMultiplier >= this.ANOMALY_THRESHOLDS.AMOUNT_DEVIATION_MULTIPLIER,
        deviationMultiplier,
      };
    } catch (error) {
      logger.error('Error checking amount anomaly', error, {
        service: 'payment_monitoring',
        userId,
        amount,
      });
      return { isAnomalous: false, deviationMultiplier: 0 };
    }
  }

  /**
   * Track payment failure rate for a user
   */
  static async trackFailureRate(userId: string): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Count total payment attempts
      const { count: totalCount, error: totalError } = await serverSupabase
        .from('payment_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo);

      // Count failed attempts
      const { count: failedCount, error: failedError } = await serverSupabase
        .from('payment_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'failed')
        .gte('created_at', twentyFourHoursAgo);

      if (totalError || failedError) {
        logger.error('Error tracking failure rate', totalError || failedError, {
          service: 'payment_monitoring',
          userId,
        });
        return 0;
      }

      if (!totalCount || totalCount === 0) {
        return 0;
      }

      return (failedCount || 0) / totalCount;
    } catch (error) {
      logger.error('Error tracking failure rate', error, {
        service: 'payment_monitoring',
        userId,
      });
      return 0;
    }
  }

  /**
   * Check velocity limits (transaction count and amount)
   */
  static async checkVelocityLimits(
    userId: string,
    amount: number
  ): Promise<VelocityResult> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Check hourly transaction count
      const { count: hourlyCount, error: hourlyCountError } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo);

      if (hourlyCountError) {
        logger.error('Error checking hourly velocity', hourlyCountError, {
          service: 'payment_monitoring',
          userId,
        });
      }

      if ((hourlyCount || 0) >= this.VELOCITY_LIMITS.PAYMENT_COUNT_PER_HOUR) {
        return {
          withinLimits: false,
          currentCount: hourlyCount || 0,
          maxAllowed: this.VELOCITY_LIMITS.PAYMENT_COUNT_PER_HOUR,
          windowMinutes: 60,
          nextAllowedTime: new Date(Date.now() + 60 * 60 * 1000),
        };
      }

      // Check daily transaction count
      const { count: dailyCount, error: dailyCountError } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo);

      if (dailyCountError) {
        logger.error('Error checking daily velocity', dailyCountError, {
          service: 'payment_monitoring',
          userId,
        });
      }

      if ((dailyCount || 0) >= this.VELOCITY_LIMITS.PAYMENT_COUNT_PER_DAY) {
        return {
          withinLimits: false,
          currentCount: dailyCount || 0,
          maxAllowed: this.VELOCITY_LIMITS.PAYMENT_COUNT_PER_DAY,
          windowMinutes: 24 * 60,
          nextAllowedTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      }

      // Check hourly amount
      const { data: hourlyTransactions, error: hourlyAmountError } = await serverSupabase
        .from('escrow_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo);

      if (!hourlyAmountError && hourlyTransactions) {
        const hourlyTotal = hourlyTransactions.reduce((sum, t) => sum + t.amount, 0);

        if (hourlyTotal + amount > this.VELOCITY_LIMITS.PAYMENT_AMOUNT_PER_HOUR) {
          return {
            withinLimits: false,
            currentCount: hourlyTotal,
            maxAllowed: this.VELOCITY_LIMITS.PAYMENT_AMOUNT_PER_HOUR,
            windowMinutes: 60,
            nextAllowedTime: new Date(Date.now() + 60 * 60 * 1000),
          };
        }
      }

      // Check daily amount
      const { data: dailyTransactions, error: dailyAmountError } = await serverSupabase
        .from('escrow_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo);

      if (!dailyAmountError && dailyTransactions) {
        const dailyTotal = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);

        if (dailyTotal + amount > this.VELOCITY_LIMITS.PAYMENT_AMOUNT_PER_DAY) {
          return {
            withinLimits: false,
            currentCount: dailyTotal,
            maxAllowed: this.VELOCITY_LIMITS.PAYMENT_AMOUNT_PER_DAY,
            windowMinutes: 24 * 60,
            nextAllowedTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          };
        }
      }

      return {
        withinLimits: true,
        currentCount: hourlyCount || 0,
        maxAllowed: this.VELOCITY_LIMITS.PAYMENT_COUNT_PER_HOUR,
        windowMinutes: 60,
      };
    } catch (error) {
      logger.error('Error checking velocity limits', error, {
        service: 'payment_monitoring',
        userId,
        amount,
      });

      // On error, block to be safe
      return {
        withinLimits: false,
        currentCount: 0,
        maxAllowed: 0,
        windowMinutes: 60,
      };
    }
  }

  /**
   * Check for rapid succession of transactions
   */
  private static async checkRapidSuccession(userId: string): Promise<boolean> {
    try {
      const recentMinutesAgo = new Date(
        Date.now() - this.ANOMALY_THRESHOLDS.RAPID_SUCCESSION_MINUTES * 60 * 1000
      ).toISOString();

      const { count, error } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', recentMinutesAgo);

      if (error) {
        logger.error('Error checking rapid succession', error, {
          service: 'payment_monitoring',
          userId,
        });
        return false;
      }

      // Flag if more than 1 transaction in the rapid succession window
      return (count || 0) > 1;
    } catch (error) {
      logger.error('Error checking rapid succession', error, {
        service: 'payment_monitoring',
        userId,
      });
      return false;
    }
  }

  /**
   * Check for geographic anomalies
   */
  private static async checkGeographicAnomaly(
    userId: string,
    ipAddress: string
  ): Promise<boolean> {
    try {
      // Get user's typical locations from recent transactions
      const { data: recentLocations, error } = await serverSupabase
        .from('payment_attempts')
        .select('ip_address, geo_location')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !recentLocations || recentLocations.length === 0) {
        // No history - not anomalous
        return false;
      }

      // Check if current IP is in recent history
      const isKnownIP = recentLocations.some((loc) => loc.ip_address === ipAddress);

      return !isKnownIP;
    } catch (error) {
      logger.error('Error checking geographic anomaly', error, {
        service: 'payment_monitoring',
        userId,
      });
      return false;
    }
  }

  /**
   * Check for device anomalies
   */
  private static async checkDeviceAnomaly(
    userId: string,
    deviceFingerprint: string
  ): Promise<boolean> {
    try {
      const { data: knownDevices, error } = await serverSupabase
        .from('user_devices')
        .select('device_fingerprint')
        .eq('user_id', userId);

      if (error || !knownDevices) {
        return false;
      }

      const isKnownDevice = knownDevices.some(
        (d) => d.device_fingerprint === deviceFingerprint
      );

      return !isKnownDevice;
    } catch (error) {
      logger.error('Error checking device anomaly', error, {
        service: 'payment_monitoring',
        userId,
      });
      return false;
    }
  }

  /**
   * Alert on high-risk transaction
   */
  static async alertOnHighRiskTransaction(alert: {
    userId: string;
    transaction: MonitoredTransaction;
    riskScore: number;
    reasons: string[];
    blockedReasons: string[];
  }): Promise<void> {
    try {
      // Log critical alert
      logger.error('HIGH RISK TRANSACTION DETECTED', {
        service: 'payment_monitoring',
        severity: 'CRITICAL',
        userId: alert.userId,
        transactionType: alert.transaction.type,
        amount: alert.transaction.amount,
        currency: alert.transaction.currency,
        riskScore: alert.riskScore,
        reasons: alert.reasons,
        blockedReasons: alert.blockedReasons,
        timestamp: new Date().toISOString(),
      });

      // Store security event
      await serverSupabase.from('payment_security_events').insert({
        user_id: alert.userId,
        event_type: 'high_risk_transaction',
        risk_score: alert.riskScore,
        transaction_type: alert.transaction.type,
        amount: alert.transaction.amount,
        currency: alert.transaction.currency,
        reasons: alert.reasons,
        blocked_reasons: alert.blockedReasons,
        metadata: alert.transaction.metadata,
        created_at: new Date().toISOString(),
      });

      // Send alert to admin (would integrate with notification service)
      // await NotificationService.sendAdminAlert({
      //   type: 'high_risk_transaction',
      //   userId: alert.userId,
      //   riskScore: alert.riskScore,
      //   amount: alert.transaction.amount,
      // });

      // If blocked, notify user
      if (alert.blockedReasons.length > 0) {
        // await NotificationService.sendUserAlert({
        //   userId: alert.userId,
        //   type: 'transaction_blocked',
        //   message: 'Your transaction was blocked for security reasons. Please contact support.',
        // });
      }
    } catch (error) {
      logger.error('Error sending high-risk transaction alert', error, {
        service: 'payment_monitoring',
        userId: alert.userId,
      });
    }
  }
}
