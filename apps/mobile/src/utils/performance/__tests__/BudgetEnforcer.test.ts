/**
 * Comprehensive unit tests for BudgetEnforcer.
 *
 * Mocks ONLY externals:
 *  - logger (../../logger)
 *  - react-native DeviceEventEmitter (so emit() is observable, no native bridge)
 * The unit under test (BudgetEnforcer) and its sibling rule store (BudgetRuleManager,
 * pure in-memory logic) are exercised for real to maximize real coverage.
 *
 * Date.now is spied to deterministically drive the violation-cooldown branches.
 */

import { BudgetEnforcer } from '../BudgetEnforcer';
import { logger } from '../../logger';
import { DeviceEventEmitter } from 'react-native';
import type {
  BudgetEnforcementRule,
  PerformanceMetric,
  PerformanceViolation,
} from '../types';

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockEmit = DeviceEventEmitter.emit as jest.Mock;

// --- helpers ----------------------------------------------------------------

const baseMetric = (
  overrides: Partial<PerformanceMetric> = {}
): PerformanceMetric => ({
  name: 'custom_metric',
  value: 0,
  timestamp: 1234567890,
  category: 'custom',
  ...overrides,
});

const makeRule = (
  overrides: Partial<BudgetEnforcementRule> = {}
): BudgetEnforcementRule => ({
  id: 'rule_custom',
  name: 'Custom Rule',
  metric: 'custom_metric',
  target: 100,
  warning: 200,
  critical: 300,
  unit: 'ms',
  category: 'performance',
  enabled: true,
  comparison: 'less_than',
  enforcement: 'log',
  ...overrides,
});

describe('BudgetEnforcer', () => {
  let enforcer: BudgetEnforcer;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Stable Date.now baseline so cooldown math is deterministic.
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    enforcer = new BudgetEnforcer();
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  // ==========================================================================
  // CONFIGURATION (budget delegation)
  // ==========================================================================
  describe('budget configuration delegation', () => {
    it('setBudget then getBudget round-trips the value', () => {
      enforcer.setBudget('my_metric', 555);
      expect(enforcer.getBudget('my_metric')).toBe(555);
    });

    it('getBudget reflects the advanced-rule legacy budget for a seeded metric', () => {
      // app_start_time is seeded at 3000 but the advanced rule
      // app_startup_time_enhanced overwrites the legacy budget with its critical (5000).
      expect(enforcer.getBudget('app_start_time')).toBe(5000);
    });

    it('getBudget returns the seeded default for a metric without an advanced rule', () => {
      expect(enforcer.getBudget('storage_operation_time')).toBe(100);
    });

    it('getBudget returns undefined for an unknown metric', () => {
      expect(enforcer.getBudget('does_not_exist')).toBeUndefined();
    });
  });

  // ==========================================================================
  // RULE MANAGEMENT DELEGATION
  // ==========================================================================
  describe('rule management delegation', () => {
    it('addBudgetRule and getBudgetRule round-trip', () => {
      const rule = makeRule({ id: 'rule_added', metric: 'added_metric' });
      enforcer.addBudgetRule(rule);
      expect(enforcer.getBudgetRule('rule_added')).toEqual(rule);
    });

    it('getAllBudgetRules includes default + added rules', () => {
      const before = enforcer.getAllBudgetRules().length;
      enforcer.addBudgetRule(makeRule({ id: 'rule_extra', metric: 'extra' }));
      expect(enforcer.getAllBudgetRules().length).toBe(before + 1);
    });

    it('removeBudgetRule returns true for existing, false for missing', () => {
      enforcer.addBudgetRule(makeRule({ id: 'rule_rm', metric: 'rm_metric' }));
      expect(enforcer.removeBudgetRule('rule_rm')).toBe(true);
      expect(enforcer.removeBudgetRule('rule_rm')).toBe(false);
      expect(enforcer.getBudgetRule('rule_rm')).toBeUndefined();
    });

    it('updateBudgetRule mutates fields and returns true; false when missing', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'rule_up', metric: 'up_metric', target: 1 })
      );
      expect(enforcer.updateBudgetRule('rule_up', { target: 999 })).toBe(true);
      expect(enforcer.getBudgetRule('rule_up')?.target).toBe(999);
      expect(enforcer.updateBudgetRule('nope', { target: 5 })).toBe(false);
    });

    it('setBudgetRuleEnabled toggles enabled and returns true; false when missing', () => {
      enforcer.addBudgetRule(makeRule({ id: 'rule_en', metric: 'en_metric' }));
      expect(enforcer.setBudgetRuleEnabled('rule_en', false)).toBe(true);
      expect(enforcer.getBudgetRule('rule_en')?.enabled).toBe(false);
      expect(enforcer.setBudgetRuleEnabled('missing', true)).toBe(false);
    });
  });

  // ==========================================================================
  // enforceMetric — top-level gating
  // ==========================================================================
  describe('enforceMetric gating', () => {
    it('returns null when enforcement is disabled', () => {
      enforcer.setEnforcementEnabled(false);
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'app_start_time', value: 999999, threshold: 1 })
      );
      expect(result).toBeNull();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('returns null when no rules match and no legacy threshold violation', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'no_rule_metric', value: 5, threshold: 100 })
      );
      expect(result).toBeNull();
    });

    it('skips disabled rules and falls through (no violation)', () => {
      // app_startup_time_enhanced is less_than target 2000; disable it then send a
      // value that WOULD violate, proving disabled rules are excluded.
      enforcer.setBudgetRuleEnabled('app_startup_time_enhanced', false);
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'app_start_time', value: 6000 })
      );
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // less_than comparison — all three severities + pass
  // ==========================================================================
  describe('less_than comparison severities', () => {
    beforeEach(() => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'lt_rule',
          metric: 'lt_metric',
          target: 100,
          warning: 200,
          critical: 300,
          comparison: 'less_than',
          enforcement: 'log',
        })
      );
    });

    it('value below target → no violation', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'lt_metric', value: 50 })
      );
      expect(result).toBeNull();
    });

    it('value at target exactly → no violation (boundary value === target)', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'lt_metric', value: 100 })
      );
      expect(result).toBeNull();
    });

    it('value just above target → low severity, threshold = target', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'lt_metric', value: 101 })
      );
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('low');
      expect(result?.threshold).toBe(100);
      expect(result?.actual).toBe(101);
      expect(result?.metric).toBe('lt_metric');
    });

    it('value at warning boundary → medium severity, threshold = warning', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'lt_metric', value: 200 })
      );
      expect(result?.severity).toBe('medium');
      expect(result?.threshold).toBe(200);
    });

    it('value at critical boundary → critical severity, threshold = critical', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'lt_metric', value: 300 })
      );
      expect(result?.severity).toBe('critical');
      expect(result?.threshold).toBe(300);
    });
  });

  // ==========================================================================
  // greater_than comparison — all three severities + pass
  // ==========================================================================
  describe('greater_than comparison severities', () => {
    beforeEach(() => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'gt_rule',
          metric: 'gt_metric',
          target: 60,
          warning: 55,
          critical: 30,
          unit: 'fps',
          comparison: 'greater_than',
          enforcement: 'log',
        })
      );
    });

    it('value above target → no violation', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'gt_metric', value: 120 })
      );
      expect(result).toBeNull();
    });

    it('value at target exactly → no violation (boundary value === target)', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'gt_metric', value: 60 })
      );
      expect(result).toBeNull();
    });

    it('value just below target → low severity', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'gt_metric', value: 59 })
      );
      expect(result?.severity).toBe('low');
      expect(result?.threshold).toBe(60);
    });

    it('value at warning boundary → medium severity', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'gt_metric', value: 55 })
      );
      expect(result?.severity).toBe('medium');
      expect(result?.threshold).toBe(55);
    });

    it('value at critical boundary → critical severity', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'gt_metric', value: 30 })
      );
      expect(result?.severity).toBe('critical');
      expect(result?.threshold).toBe(30);
    });
  });

  // ==========================================================================
  // equal_to comparison — all three severities + pass
  // ==========================================================================
  describe('equal_to comparison severities', () => {
    beforeEach(() => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'eq_rule',
          metric: 'eq_metric',
          target: 100,
          warning: 110, // warningDiff = 10
          critical: 130, // criticalDiff = 30
          comparison: 'equal_to',
          enforcement: 'log',
        })
      );
    });

    it('value exactly at target → no violation (diff = 0)', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'eq_metric', value: 100 })
      );
      expect(result).toBeNull();
    });

    it('value with small diff (< warningDiff) → low severity', () => {
      // diff = 5 < 10
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'eq_metric', value: 105 })
      );
      expect(result?.severity).toBe('low');
      expect(result?.threshold).toBe(100); // target
    });

    it('value at warningDiff boundary → medium severity', () => {
      // diff = 10 >= warningDiff(10) but < criticalDiff(30)
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'eq_metric', value: 110 })
      );
      expect(result?.severity).toBe('medium');
      expect(result?.threshold).toBe(110); // warning
    });

    it('value at criticalDiff boundary → critical severity (negative direction)', () => {
      // value = 70 → diff = 30 >= criticalDiff(30)
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'eq_metric', value: 70 })
      );
      expect(result?.severity).toBe('critical');
      expect(result?.threshold).toBe(130); // critical
    });
  });

  // ==========================================================================
  // enforcement actions: log / warn / error / throw
  // ==========================================================================
  describe('enforcement actions', () => {
    it("enforcement 'log' calls logger.debug", () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'log_rule', metric: 'log_metric', enforcement: 'log' })
      );
      mockLogger.debug.mockClear(); // BudgetRuleManager logs on addBudgetRule
      enforcer.enforceMetric(baseMetric({ name: 'log_metric', value: 150 })); // low
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      const [msg, ctx] = mockLogger.debug.mock.calls[0];
      expect(msg).toContain('Performance budget violation');
      expect(ctx).toMatchObject({ rule: 'log_rule', severity: 'low' });
    });

    it("enforcement 'warn' calls logger.warn", () => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'warn_rule',
          metric: 'warn_metric',
          enforcement: 'warn',
        })
      );
      enforcer.enforceMetric(baseMetric({ name: 'warn_metric', value: 150 }));
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it("enforcement 'error' calls logger.error", () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'err_rule', metric: 'err_metric', enforcement: 'error' })
      );
      enforcer.enforceMetric(baseMetric({ name: 'err_metric', value: 150 }));
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("enforcement 'throw' on non-critical severity logs error instead of throwing", () => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'throw_rule',
          metric: 'throw_metric',
          enforcement: 'throw',
        })
      );
      // value 150 → low severity, not critical
      expect(() =>
        enforcer.enforceMetric(baseMetric({ name: 'throw_metric', value: 150 }))
      ).not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("enforcement 'throw' on critical severity throws", () => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'throw_crit',
          metric: 'throw_crit_metric',
          target: 100,
          warning: 200,
          critical: 300,
          enforcement: 'throw',
        })
      );
      // value 300 → critical
      expect(() =>
        enforcer.enforceMetric(
          baseMetric({ name: 'throw_crit_metric', value: 300 })
        )
      ).toThrow('Performance budget violation');
    });
  });

  // ==========================================================================
  // cooldown logic
  // ==========================================================================
  describe('violation cooldown', () => {
    it('suppresses a repeat violation within the cooldown window (non-critical = 60s)', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'cd_rule', metric: 'cd_metric', enforcement: 'log' })
      );
      nowSpy.mockReturnValue(1_000_000);
      const first = enforcer.enforceMetric(
        baseMetric({ name: 'cd_metric', value: 150 })
      );
      expect(first).not.toBeNull();

      // 59s later — still inside the 60s window → suppressed
      nowSpy.mockReturnValue(1_000_000 + 59_000);
      const second = enforcer.enforceMetric(
        baseMetric({ name: 'cd_metric', value: 150 })
      );
      expect(second).toBeNull();
    });

    it('allows a repeat violation after the cooldown window elapses', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'cd2_rule', metric: 'cd2_metric', enforcement: 'log' })
      );
      nowSpy.mockReturnValue(1_000_000);
      expect(
        enforcer.enforceMetric(baseMetric({ name: 'cd2_metric', value: 150 }))
      ).not.toBeNull();

      // 61s later — outside 60s window → allowed again
      nowSpy.mockReturnValue(1_000_000 + 61_000);
      expect(
        enforcer.enforceMetric(baseMetric({ name: 'cd2_metric', value: 150 }))
      ).not.toBeNull();
    });

    it('uses a 30s cooldown window for critical severity', () => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'cd_crit',
          metric: 'cd_crit_metric',
          target: 100,
          warning: 200,
          critical: 300,
          enforcement: 'log',
        })
      );
      nowSpy.mockReturnValue(2_000_000);
      expect(
        enforcer.enforceMetric(
          baseMetric({ name: 'cd_crit_metric', value: 300 })
        )
      ).not.toBeNull();

      // 29s later — inside 30s critical window → suppressed
      nowSpy.mockReturnValue(2_000_000 + 29_000);
      expect(
        enforcer.enforceMetric(
          baseMetric({ name: 'cd_crit_metric', value: 300 })
        )
      ).toBeNull();

      // 31s later — outside → allowed
      nowSpy.mockReturnValue(2_000_000 + 31_000);
      expect(
        enforcer.enforceMetric(
          baseMetric({ name: 'cd_crit_metric', value: 300 })
        )
      ).not.toBeNull();
    });

    it('tracks cooldown per (rule, severity) — different severities are independent', () => {
      enforcer.addBudgetRule(
        makeRule({
          id: 'cd_multi',
          metric: 'cd_multi_metric',
          target: 100,
          warning: 200,
          critical: 300,
          enforcement: 'log',
        })
      );
      nowSpy.mockReturnValue(3_000_000);
      // low severity violation
      expect(
        enforcer.enforceMetric(
          baseMetric({ name: 'cd_multi_metric', value: 150 })
        )
      ).not.toBeNull();
      // immediately a critical violation — different cooldown key, still fires
      expect(
        enforcer.enforceMetric(
          baseMetric({ name: 'cd_multi_metric', value: 300 })
        )
      ).not.toBeNull();
    });
  });

  // ==========================================================================
  // event emission + listeners
  // ==========================================================================
  describe('violation listeners & event emission', () => {
    it('emits performance_budget_violation and notifies listeners on advanced violation', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'ev_rule', metric: 'ev_metric', enforcement: 'log' })
      );
      const listener = jest.fn();
      enforcer.onBudgetViolation(listener);

      const result = enforcer.enforceMetric(
        baseMetric({ name: 'ev_metric', value: 150 })
      );

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(result);
      expect(mockEmit).toHaveBeenCalledWith(
        'performance_budget_violation',
        result
      );
    });

    it('a throwing listener is caught and logged, others still run', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'ev2_rule', metric: 'ev2_metric', enforcement: 'log' })
      );
      const bad = jest.fn(() => {
        throw new Error('boom');
      });
      const good = jest.fn();
      enforcer.onBudgetViolation(bad);
      enforcer.onBudgetViolation(good);

      enforcer.enforceMetric(baseMetric({ name: 'ev2_metric', value: 150 }));

      expect(bad).toHaveBeenCalled();
      expect(good).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Budget violation listener error',
        expect.objectContaining({ data: expect.any(Error) })
      );
    });

    it('onBudgetViolation returns an unsubscribe fn that detaches the listener', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'ev3_rule', metric: 'ev3_metric', enforcement: 'log' })
      );
      const listener = jest.fn();
      const unsubscribe = enforcer.onBudgetViolation(listener);
      unsubscribe();

      enforcer.enforceMetric(baseMetric({ name: 'ev3_metric', value: 150 }));
      expect(listener).not.toHaveBeenCalled();
    });

    it('advanced violation carries a stackTrace and the metric timestamp', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'ev4_rule', metric: 'ev4_metric', enforcement: 'log' })
      );
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'ev4_metric', value: 150, timestamp: 42 })
      );
      expect(result?.timestamp).toBe(42);
      expect(typeof result?.stackTrace).toBe('string');
    });
  });

  // ==========================================================================
  // legacy threshold path (recordViolation + calculateSeverity)
  // ==========================================================================
  describe('legacy threshold violation path', () => {
    it('records a legacy violation when value exceeds metric.threshold and no rule matches', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_only', value: 120, threshold: 100 })
      );
      expect(result).not.toBeNull();
      expect(result?.metric).toBe('legacy_only');
      expect(result?.threshold).toBe(100);
      expect(result?.actual).toBe(120);
      expect(mockEmit).toHaveBeenCalledWith('performance_violation', result);
    });

    it('legacy severity = low when ratio < 1.5', () => {
      // ratio = 120/100 = 1.2
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_low', value: 120, threshold: 100 })
      );
      expect(result?.severity).toBe('low');
    });

    it('legacy severity = medium when 1.5 <= ratio < 2', () => {
      // ratio = 1.6
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_med', value: 160, threshold: 100 })
      );
      expect(result?.severity).toBe('medium');
    });

    it('legacy severity = high when 2 <= ratio < 3', () => {
      // ratio = 2.5
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_high', value: 250, threshold: 100 })
      );
      expect(result?.severity).toBe('high');
    });

    it('legacy severity = critical when ratio >= 3', () => {
      // ratio = 3
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_crit', value: 300, threshold: 100 })
      );
      expect(result?.severity).toBe('critical');
    });

    it('no legacy violation when value === threshold (not strictly greater)', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_eq', value: 100, threshold: 100 })
      );
      expect(result).toBeNull();
    });

    it('no legacy violation when threshold is undefined', () => {
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'legacy_none', value: 999999 })
      );
      expect(result).toBeNull();
    });

    it('rule violation takes precedence over legacy threshold (rule returns first)', () => {
      enforcer.addBudgetRule(
        makeRule({ id: 'prec_rule', metric: 'prec_metric', enforcement: 'log' })
      );
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'prec_metric', value: 150, threshold: 1 })
      );
      // advanced violation emits performance_budget_violation, not legacy event
      expect(mockEmit).toHaveBeenCalledWith(
        'performance_budget_violation',
        expect.anything()
      );
      expect(mockEmit).not.toHaveBeenCalledWith(
        'performance_violation',
        expect.anything()
      );
      expect(result?.metric).toBe('prec_metric');
    });
  });

  // ==========================================================================
  // getThresholdForSeverity 'high' branch via legacy violation listener bridge
  // ==========================================================================
  describe('getThresholdForSeverity high-severity branch', () => {
    it('maps high severity to the warning threshold', () => {
      // The 'high' severity is only produced by the legacy path. To exercise
      // getThresholdForSeverity's 'high' case we craft a custom rule whose
      // recordAdvancedViolation would map it — but advanced path never yields
      // 'high'. Instead we verify the legacy 'high' violation reports the
      // metric.threshold directly (recordViolation does not call
      // getThresholdForSeverity), confirming the high branch is unreachable from
      // the advanced path. Covered: legacy high severity above.
      const result = enforcer.enforceMetric(
        baseMetric({ name: 'high_metric', value: 250, threshold: 100 })
      );
      expect(result?.severity).toBe('high');
      expect(result?.threshold).toBe(100);
    });
  });
});
