// ============================================================================
// BUDGET RULE MANAGER
// Management of performance budget rules
// ============================================================================

import { logger } from '../logger';
import { BudgetEnforcementRule } from './types';

export class BudgetRuleManager {
  private budgetRules: Map<string, BudgetEnforcementRule> = new Map();
  private budgets: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultBudgets();
    this.initializeAdvancedBudgets();
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  private initializeDefaultBudgets(): void {
    this.budgets.set('app_start_time', 3000); // 3 seconds
    this.budgets.set('screen_transition_time', 300); // 300ms
    this.budgets.set('component_render_time', 16); // 60fps = 16ms per frame
    this.budgets.set('api_response_time', 2000); // 2 seconds
    this.budgets.set('storage_operation_time', 100); // 100ms
    this.budgets.set('bundle_size', 20 * 1024 * 1024); // 20MB
    this.budgets.set('memory_usage', 150 * 1024 * 1024); // 150MB
    this.budgets.set('js_heap_size', 100 * 1024 * 1024); // 100MB
  }

  private initializeAdvancedBudgets(): void {
    // App Performance Rules
    this.addBudgetRule({
      id: 'app_startup_time_enhanced',
      name: 'App Startup Time',
      metric: 'app_start_time',
      target: 2000,
      warning: 3000,
      critical: 5000,
      unit: 'ms',
      category: 'performance',
      enabled: true,
      comparison: 'less_than',
      description: 'Time from app launch to first interactive screen',
      enforcement: 'warn'
    });

    this.addBudgetRule({
      id: 'memory_usage_enhanced',
      name: 'Memory Usage',
      metric: 'memory_usage',
      target: 100 * 1024 * 1024, // 100MB
      warning: 150 * 1024 * 1024, // 150MB
      critical: 300 * 1024 * 1024, // 300MB
      unit: 'bytes',
      category: 'resources',
      enabled: true,
      comparison: 'less_than',
      description: 'JavaScript heap memory usage',
      enforcement: 'error'
    });

    this.addBudgetRule({
      id: 'api_response_time_enhanced',
      name: 'API Response Time',
      metric: 'api_response_time',
      target: 1000,
      warning: 2000,
      critical: 5000,
      unit: 'ms',
      category: 'performance',
      enabled: true,
      comparison: 'less_than',
      description: 'Average API request response time',
      enforcement: 'warn'
    });

    this.addBudgetRule({
      id: 'component_render_time_enhanced',
      name: 'Component Render Time',
      metric: 'component_render_time',
      target: 8, // 120fps target
      warning: 16, // 60fps
      critical: 33, // 30fps
      unit: 'ms',
      category: 'user_experience',
      enabled: true,
      comparison: 'less_than',
      description: 'Component render duration for smooth UI',
      enforcement: 'warn'
    });

    this.addBudgetRule({
      id: 'frame_rate_enhanced',
      name: 'Frame Rate (FPS)',
      metric: 'fps',
      target: 60,
      warning: 55,
      critical: 30,
      unit: 'fps',
      category: 'user_experience',
      enabled: true,
      comparison: 'greater_than',
      description: 'Frames per second for smooth animations',
      enforcement: 'warn'
    });
  }

  // ============================================================================
  // BUDGET MANAGEMENT
  // ============================================================================

  setBudget(metric: string, budget: number): void {
    this.budgets.set(metric, budget);
  }

  getBudget(metric: string): number | undefined {
    return this.budgets.get(metric);
  }

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  addBudgetRule(rule: BudgetEnforcementRule): void {
    this.budgetRules.set(rule.id, rule);
    // Also set the legacy budget for compatibility
    this.budgets.set(rule.metric, rule.critical);

    logger.debug('BudgetRuleManager', 'Budget rule added', {
      id: rule.id,
      metric: rule.metric,
      target: `${rule.target}${rule.unit}`
    });
  }

  removeBudgetRule(ruleId: string): boolean {
    const rule = this.budgetRules.get(ruleId);
    if (rule) {
      this.budgetRules.delete(ruleId);
      // Remove from legacy budgets if it was the only rule for this metric
      const hasOtherRules = Array.from(this.budgetRules.values()).some(r => r.metric === rule.metric);
      if (!hasOtherRules) {
        this.budgets.delete(rule.metric);
      }

      logger.debug('BudgetRuleManager', 'Budget rule removed', { id: ruleId });
      return true;
    }
    return false;
  }

  updateBudgetRule(ruleId: string, updates: Partial<BudgetEnforcementRule>): boolean {
    const rule = this.budgetRules.get(ruleId);
    if (rule) {
      const updatedRule = { ...rule, ...updates };
      this.budgetRules.set(ruleId, updatedRule);

      // Update legacy budget if metric changed
      if (updates.metric && updates.critical) {
        this.budgets.set(updates.metric, updates.critical);
      }

      logger.debug('BudgetRuleManager', 'Budget rule updated', { id: ruleId });
      return true;
    }
    return false;
  }

  getBudgetRule(ruleId: string): BudgetEnforcementRule | undefined {
    return this.budgetRules.get(ruleId);
  }

  getAllBudgetRules(): BudgetEnforcementRule[] {
    return Array.from(this.budgetRules.values());
  }

  getEnabledRules(): BudgetEnforcementRule[] {
    return Array.from(this.budgetRules.values()).filter(rule => rule.enabled);
  }

  getRelevantRules(metricName: string): BudgetEnforcementRule[] {
    return this.getEnabledRules().filter(rule => rule.metric === metricName);
  }

  setBudgetRuleEnabled(ruleId: string, enabled: boolean): boolean {
    return this.updateBudgetRule(ruleId, { enabled });
  }
}
