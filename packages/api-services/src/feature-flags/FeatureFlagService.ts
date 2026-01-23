/**
 * Feature Flag Service - Core feature flag management and evaluation
 */
import { FeatureFlag } from './FeatureFlagController';
import { logger } from '@mintenance/shared';
interface FlagConfig {
  name: FeatureFlag;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  rolloutStrategy: 'percentage' | 'gradual' | 'user_whitelist' | 'ab_test';
  targetingRules: TargetingRule[];
  metadata: Record<string, any>;
  updatedBy?: string;
  updatedAt?: string;
}
interface TargetingRule {
  id: string;
  type: 'user' | 'segment' | 'attribute' | 'percentage';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  attribute?: string;
  value: unknown;
  enabled: boolean;
}
interface Experiment {
  id: string;
  flagName: FeatureFlag;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Array<{
    id: string;
    name: string;
    percentage: number;
    config: Record<string, unknown>;
  }>;
  metrics: Array<{
    name: string;
    type: 'conversion' | 'engagement' | 'revenue';
    goal: number;
  }>;
  startDate?: string;
  endDate?: string;
  results?: unknown;
}
export class FeatureFlagService {
  private supabase: unknown;
  private cache: Map<string, { value: unknown; expires: number }> = new Map();
  constructor(config: { supabase: unknown }) {
    this.supabase = config.supabase;
  }
  /**
   * Get a specific feature flag configuration
   */
  async getFlag(flagName: FeatureFlag, userId?: string | null): Promise<FlagConfig | null> {
    try {
      // Check cache first
      const cacheKey = `flag:${flagName}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return this.evaluateForUser(cached, userId);
      }
      // Get from database
      const { data, error } = await this.supabase
        .from('feature_flags')
        .select('*')
        .eq('name', flagName)
        .single();
      if (error || !data) {
        return null;
      }
      const flag: FlagConfig = {
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        rolloutPercentage: data.rollout_percentage,
        rolloutStrategy: data.rollout_strategy,
        targetingRules: data.targeting_rules || [],
        metadata: data.metadata || {}
      };
      // Cache for 5 minutes
      this.setCache(cacheKey, flag, 5 * 60 * 1000);
      return this.evaluateForUser(flag, userId);
    } catch (error) {
      logger.error('Error getting feature flag:', error);
      return null;
    }
  }
  /**
   * Get all feature flags for a user
   */
  async getAllFlags(userId?: string | null): Promise<Record<string, FlagConfig>> {
    try {
      const { data } = await this.supabase
        .from('feature_flags')
        .select('*')
        .order('name');
      const flags: Record<string, FlagConfig> = {};
      for (const flag of data || []) {
        const config: FlagConfig = {
          name: flag.name,
          description: flag.description,
          enabled: flag.enabled,
          rolloutPercentage: flag.rollout_percentage,
          rolloutStrategy: flag.rollout_strategy,
          targetingRules: flag.targeting_rules || [],
          metadata: flag.metadata || {}
        };
        flags[flag.name] = await this.evaluateForUser(config, userId) || config;
      }
      return flags;
    } catch (error) {
      logger.error('Error getting all feature flags:', error);
      return {};
    }
  }
  /**
   * Create or update a feature flag
   */
  async createOrUpdateFlag(config: FlagConfig): Promise<FlagConfig> {
    try {
      const { data, error } = await this.supabase
        .from('feature_flags')
        .upsert({
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          rollout_percentage: config.rolloutPercentage,
          rollout_strategy: config.rolloutStrategy,
          targeting_rules: config.targetingRules,
          metadata: config.metadata,
          updated_by: config.updatedBy,
          updated_at: config.updatedAt || new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      // Clear cache
      this.clearCache(`flag:${config.name}`);
      return config;
    } catch (error) {
      logger.error('Error creating/updating feature flag:', error);
      throw new Error('Failed to update feature flag');
    }
  }
  /**
   * Evaluate a feature flag for a specific user
   */
  async evaluateFlag(
    flagName: FeatureFlag,
    userId: string,
    attributes?: Record<string, any>
  ): Promise<{ enabled: boolean; variant?: string; reason?: string }> {
    try {
      const flag = await this.getFlag(flagName, userId);
      if (!flag) {
        return { enabled: false, reason: 'Flag not found' };
      }
      if (!flag.enabled) {
        return { enabled: false, reason: 'Flag disabled' };
      }
      // Check targeting rules
      for (const rule of flag.targetingRules) {
        if (!rule.enabled) continue;
        const matches = await this.evaluateRule(rule, userId, attributes);
        if (matches) {
          return { enabled: true, reason: `Matched rule: ${rule.id}` };
        }
      }
      // Check rollout percentage
      if (flag.rolloutStrategy === 'percentage') {
        const hash = this.hashUserId(userId + flagName);
        const bucket = hash % 100;
        const enabled = bucket < flag.rolloutPercentage;
        return {
          enabled,
          reason: enabled ? 'Within rollout percentage' : 'Outside rollout percentage'
        };
      }
      // Check A/B test
      if (flag.rolloutStrategy === 'ab_test') {
        const experiment = await this.getActiveExperiment(flagName);
        if (experiment) {
          const variant = this.assignVariant(userId, experiment);
          return {
            enabled: true,
            variant: variant.name,
            reason: `A/B test variant: ${variant.name}`
          };
        }
      }
      return { enabled: flag.enabled, reason: 'Default state' };
    } catch (error) {
      logger.error('Error evaluating feature flag:', error);
      return { enabled: false, reason: 'Evaluation error' };
    }
  }
  /**
   * Get targeting rules for a flag
   */
  async getTargetingRules(flagName: FeatureFlag): Promise<TargetingRule[]> {
    try {
      const flag = await this.getFlag(flagName);
      return flag?.targetingRules || [];
    } catch (error) {
      logger.error('Error getting targeting rules:', error);
      return [];
    }
  }
  /**
   * Log a flag change for audit
   */
  async logFlagChange(
    flagName: FeatureFlag,
    action: string,
    userId: string,
    changes: unknown
  ): Promise<void> {
    try {
      await this.supabase
        .from('feature_flag_audit_log')
        .insert({
          flag_name: flagName,
          action,
          user_id: userId,
          changes,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error logging flag change:', error);
    }
  }
  /**
   * Get experiments for flags
   */
  async getExperiments(params: {
    flagName?: FeatureFlag;
    status?: string;
  }): Promise<Experiment[]> {
    try {
      let query = this.supabase
        .from('feature_flag_experiments')
        .select('*');
      if (params.flagName) {
        query = query.eq('flag_name', params.flagName);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      const { data } = await query.order('created_at', { ascending: false });
      return (data || []).map((exp: unknown) => ({
        id: exp.id,
        flagName: exp.flag_name,
        name: exp.name,
        status: exp.status,
        variants: exp.variants || [],
        metrics: exp.metrics || [],
        startDate: exp.start_date,
        endDate: exp.end_date,
        results: exp.results
      }));
    } catch (error) {
      logger.error('Error getting experiments:', error);
      return [];
    }
  }
  /**
   * Check if auto-rollback is enabled for a flag
   */
  async isAutoRollbackEnabled(flagName: FeatureFlag): Promise<boolean> {
    try {
      const flag = await this.getFlag(flagName);
      return flag?.metadata?.autoRollback === true;
    } catch (error) {
      logger.error('Error checking auto-rollback:', error);
      return false;
    }
  }
  /**
   * Get rollback thresholds for a flag
   */
  async getRollbackThresholds(flagName: FeatureFlag): Promise<unknown> {
    try {
      const flag = await this.getFlag(flagName);
      return flag?.metadata?.rollbackThresholds || {
        maxErrorRate: 0.05,
        maxLatency: 1000,
        minConversionRate: 0.01
      };
    } catch (error) {
      logger.error('Error getting rollback thresholds:', error);
      return {};
    }
  }
  // ============= Private Helper Methods =============
  private async evaluateForUser(flag: FlagConfig, userId?: string | null): Promise<FlagConfig | null> {
    if (!userId) return flag;
    // Apply user-specific evaluation
    const evaluation = await this.evaluateFlag(flag.name, userId);
    return {
      ...flag,
      enabled: evaluation.enabled
    };
  }
  private async evaluateRule(
    rule: TargetingRule,
    userId: string,
    attributes?: Record<string, any>
  ): Promise<boolean> {
    switch (rule.type) {
      case 'user':
        return this.evaluateUserRule(rule, userId);
      case 'segment':
        return this.evaluateSegmentRule(rule, userId);
      case 'attribute':
        return this.evaluateAttributeRule(rule, attributes);
      case 'percentage':
        return this.evaluatePercentageRule(rule, userId);
      default:
        return false;
    }
  }
  private evaluateUserRule(rule: TargetingRule, userId: string): boolean {
    switch (rule.operator) {
      case 'equals':
        return userId === rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(userId);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(userId);
      default:
        return false;
    }
  }
  private async evaluateSegmentRule(rule: TargetingRule, userId: string): Promise<boolean> {
    // Would check if user belongs to a segment
    try {
      const { data } = await this.supabase
        .from('user_segments')
        .select('segment_id')
        .eq('user_id', userId)
        .eq('segment_id', rule.value)
        .single();
      return !!data;
    } catch {
      return false;
    }
  }
  private evaluateAttributeRule(
    rule: TargetingRule,
    attributes?: Record<string, any>
  ): boolean {
    if (!attributes || !rule.attribute) return false;
    const value = attributes[rule.attribute];
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'contains':
        return String(value).includes(String(rule.value));
      case 'greater_than':
        return Number(value) > Number(rule.value);
      case 'less_than':
        return Number(value) < Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      default:
        return false;
    }
  }
  private evaluatePercentageRule(rule: TargetingRule, userId: string): boolean {
    const hash = this.hashUserId(userId);
    const bucket = hash % 100;
    return bucket < Number(rule.value);
  }
  private async getActiveExperiment(flagName: FeatureFlag): Promise<Experiment | null> {
    try {
      const { data } = await this.supabase
        .from('feature_flag_experiments')
        .select('*')
        .eq('flag_name', flagName)
        .eq('status', 'running')
        .single();
      if (!data) return null;
      return {
        id: data.id,
        flagName: data.flag_name,
        name: data.name,
        status: data.status,
        variants: data.variants || [],
        metrics: data.metrics || [],
        startDate: data.start_date,
        endDate: data.end_date
      };
    } catch {
      return null;
    }
  }
  private assignVariant(userId: string, experiment: Experiment): unknown {
    const hash = this.hashUserId(userId + experiment.id);
    const bucket = hash % 100;
    let accumulated = 0;
    for (const variant of experiment.variants) {
      accumulated += variant.percentage;
      if (bucket < accumulated) {
        return variant;
      }
    }
    return experiment.variants[0]; // Default to first variant
  }
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  private getFromCache(key: string): unknown {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    this.cache.delete(key);
    return null;
  }
  private setCache(key: string, value: unknown, ttl: number): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
  private clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}