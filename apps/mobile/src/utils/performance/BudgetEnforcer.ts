// ============================================================================
// BUDGET ENFORCER
// Performance budget enforcement and violation tracking
// ============================================================================

import { DeviceEventEmitter } from 'react-native';
import { logger } from '../logger';
import { BudgetRuleManager } from './BudgetRuleManager';
import {
  BudgetEnforcementRule,
  PerformanceMetric,
  PerformanceViolation,
} from './types';

export class BudgetEnforcer {
  private ruleManager: BudgetRuleManager;
  private budgetViolationListeners: ((violation: PerformanceViolation) => void)[] = [];
  private enforcementEnabled = true;
  private violationCooldowns: Map<string, number> = new Map();

  constructor() {
    this.ruleManager = new BudgetRuleManager();
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setBudget(metric: string, budget: number): void {
    this.ruleManager.setBudget(metric, budget);
  }

  getBudget(metric: string): number | undefined {
    return this.ruleManager.getBudget(metric);
  }

  setEnforcementEnabled(enabled: boolean): void {
    this.enforcementEnabled = enabled;
  }

  // ============================================================================
  // RULE MANAGEMENT (DELEGATION)
  // ============================================================================

  addBudgetRule(rule: BudgetEnforcementRule): void {
    this.ruleManager.addBudgetRule(rule);
  }

  removeBudgetRule(ruleId: string): boolean {
    return this.ruleManager.removeBudgetRule(ruleId);
  }

  updateBudgetRule(ruleId: string, updates: Partial<BudgetEnforcementRule>): boolean {
    return this.ruleManager.updateBudgetRule(ruleId, updates);
  }

  getBudgetRule(ruleId: string): BudgetEnforcementRule | undefined {
    return this.ruleManager.getBudgetRule(ruleId);
  }

  getAllBudgetRules(): BudgetEnforcementRule[] {
    return this.ruleManager.getAllBudgetRules();
  }

  setBudgetRuleEnabled(ruleId: string, enabled: boolean): boolean {
    return this.ruleManager.setBudgetRuleEnabled(ruleId, enabled);
  }

  // ============================================================================
  // VIOLATION ENFORCEMENT
  // ============================================================================

  enforceMetric(metric: PerformanceMetric): PerformanceViolation | null {
    if (!this.enforcementEnabled) return null;

    // Check advanced budget rules
    const relevantRules = this.ruleManager.getRelevantRules(metric.name);

    for (const rule of relevantRules) {
      const violation = this.checkRuleViolation(rule, metric);
      if (violation) return violation;
    }

    // Legacy violation check for backward compatibility
    if (metric.threshold && metric.value > metric.threshold) {
      return this.recordViolation(metric);
    }

    return null;
  }

  private checkRuleViolation(rule: BudgetEnforcementRule, metric: PerformanceMetric): PerformanceViolation | null {
    const violation = this.evaluateRuleCondition(rule, metric.value);
    if (!violation) return null;

    // Check cooldown to prevent spam
    const cooldownKey = `${rule.id}_${violation.severity}`;
    const lastViolationTime = this.violationCooldowns.get(cooldownKey) || 0;
    const cooldownPeriod = violation.severity === 'critical' ? 30000 : 60000; // 30s for critical, 60s for others

    if (Date.now() - lastViolationTime < cooldownPeriod) {
      return null;
    }

    this.violationCooldowns.set(cooldownKey, Date.now());

    // Record the violation
    const advancedViolation = this.recordAdvancedViolation(rule, violation, metric);

    // Enforce according to rule settings
    this.enforceViolation(rule, violation, metric);

    return advancedViolation;
  }

  private evaluateRuleCondition(rule: BudgetEnforcementRule, value: number): { severity: PerformanceViolation['severity'] } | null {
    let isViolation = false;
    let severity: PerformanceViolation['severity'] = 'low';

    switch (rule.comparison) {
      case 'less_than':
        if (value >= rule.critical) {
          isViolation = true;
          severity = 'critical';
        } else if (value >= rule.warning) {
          isViolation = true;
          severity = 'medium';
        } else if (value > rule.target) {
          isViolation = true;
          severity = 'low';
        }
        break;
      case 'greater_than':
        if (value <= rule.critical) {
          isViolation = true;
          severity = 'critical';
        } else if (value <= rule.warning) {
          isViolation = true;
          severity = 'medium';
        } else if (value < rule.target) {
          isViolation = true;
          severity = 'low';
        }
        break;
      case 'equal_to':
        const targetDiff = Math.abs(value - rule.target);
        const warningDiff = Math.abs(rule.warning - rule.target);
        const criticalDiff = Math.abs(rule.critical - rule.target);

        if (targetDiff >= criticalDiff) {
          isViolation = true;
          severity = 'critical';
        } else if (targetDiff >= warningDiff) {
          isViolation = true;
          severity = 'medium';
        } else if (targetDiff > 0) {
          isViolation = true;
          severity = 'low';
        }
        break;
    }

    return isViolation ? { severity } : null;
  }

  private recordAdvancedViolation(rule: BudgetEnforcementRule, violation: { severity: PerformanceViolation['severity'] }, metric: PerformanceMetric): PerformanceViolation {
    const advancedViolation: PerformanceViolation = {
      metric: rule.metric,
      threshold: this.getThresholdForSeverity(rule, violation.severity),
      actual: metric.value,
      severity: violation.severity,
      timestamp: metric.timestamp,
      stackTrace: new Error().stack,
    };

    // Notify violation listeners
    this.budgetViolationListeners.forEach(listener => {
      try {
        listener(advancedViolation);
      } catch (error) {
        logger.warn('Budget violation listener error', { data: error });
      }
    });

    DeviceEventEmitter.emit('performance_budget_violation', advancedViolation);

    return advancedViolation;
  }

  private getThresholdForSeverity(rule: BudgetEnforcementRule, severity: PerformanceViolation['severity']): number {
    switch (severity) {
      case 'critical': return rule.critical;
      case 'high':
      case 'medium': return rule.warning;
      case 'low': return rule.target;
      default: return rule.target;
    }
  }

  private enforceViolation(rule: BudgetEnforcementRule, violation: { severity: PerformanceViolation['severity'] }, metric: PerformanceMetric): void {
    const message = `Performance budget violation: ${rule.name} (${metric.value}${rule.unit} > ${this.getThresholdForSeverity(rule, violation.severity)}${rule.unit})`;

    switch (rule.enforcement) {
      case 'log':
        logger.debug(message, {
          rule: rule.id,
          metric: metric.name,
          value: metric.value,
          severity: violation.severity
        });
        break;
      case 'warn':
        logger.warn(message, {
          rule: rule.id,
          metric: metric.name,
          value: metric.value,
          severity: violation.severity
        });
        break;
      case 'error':
        logger.error(message, undefined, {
          rule: rule.id,
          metric: metric.name,
          value: metric.value,
          severity: violation.severity
        });
        break;
      case 'throw':
        if (violation.severity === 'critical') {
          throw new Error(message);
        } else {
          logger.error(message, undefined, {
            rule: rule.id,
            metric: metric.name,
            value: metric.value,
            severity: violation.severity
          });
        }
        break;
    }
  }

  private recordViolation(metric: PerformanceMetric): PerformanceViolation {
    const severity = this.calculateSeverity(metric);
    const violation: PerformanceViolation = {
      metric: metric.name,
      threshold: metric.threshold!,
      actual: metric.value,
      severity,
      timestamp: metric.timestamp,
      stackTrace: new Error().stack,
    };

    DeviceEventEmitter.emit('performance_violation', violation);

    return violation;
  }

  private calculateSeverity(metric: PerformanceMetric): PerformanceViolation['severity'] {
    const threshold = metric.threshold!;
    const actual = metric.value;
    const ratio = actual / threshold;

    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  onBudgetViolation(listener: (violation: PerformanceViolation) => void): () => void {
    this.budgetViolationListeners.push(listener);
    return () => {
      this.budgetViolationListeners = this.budgetViolationListeners.filter(l => l !== listener);
    };
  }
}
