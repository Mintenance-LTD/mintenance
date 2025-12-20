// ============================================================================
// TEST UTILITIES
// Common test utilities, setup/teardown, and enhanced rendering
// ============================================================================

import { render, RenderOptions, RenderResult } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { logger } from '../logger';
import { setupMocks, cleanupMocks } from './MockSetup';
import { runAccessibilityChecks, TestAccessibilityResult } from './AccessibilityTesting';
import { PerformanceTester, TestPerformanceResult } from './PerformanceTesting';

// ============================================================================
// TESTING TYPES
// ============================================================================

export interface TestingConfig {
  performance: {
    enabled: boolean;
    trackRenders: boolean;
    trackAsyncOperations: boolean;
    budgets: Record<string, number>;
  };
  mocks: {
    navigation: boolean;
    asyncStorage: boolean;
    haptics: boolean;
    biometrics: boolean;
    camera: boolean;
    notifications: boolean;
  };
  accessibility: {
    enabled: boolean;
    strictMode: boolean;
    checkContrast: boolean;
    checkLabels: boolean;
  };
  snapshots: {
    enabled: boolean;
    updateMode: 'none' | 'new' | 'all';
    platform: 'ios' | 'android' | 'both';
  };
}

// Re-export types from other modules
export { TestPerformanceResult } from './PerformanceTesting';
export { TestAccessibilityResult } from './AccessibilityTesting';

// ============================================================================
// ENHANCED RENDER UTILITIES
// ============================================================================

export interface EnhancedRenderOptions extends RenderOptions {
  performance?: boolean;
  accessibility?: boolean;
  mocks?: Partial<TestingConfig['mocks']>;
  theme?: 'light' | 'dark';
  initialState?: any;
}

export interface EnhancedRenderResult extends RenderResult {
  performance?: TestPerformanceResult;
  accessibility?: TestAccessibilityResult;
  rerender: (ui: ReactElement, options?: EnhancedRenderOptions) => void;
  cleanup: () => void;
}

// Mock providers and wrappers
const createTestProviders = (options: EnhancedRenderOptions) => {
  // This would normally wrap with ThemeProvider, NavigationContainer, etc.
  return ({ children }: { children: React.ReactNode }) => {
    // Mock implementation - in real app would include actual providers
    return children as React.ReactElement;
  };
};

// Enhanced render function
export function renderWithProviders(
  ui: ReactElement,
  options: EnhancedRenderOptions = {}
): EnhancedRenderResult {
  const {
    performance = false,
    accessibility = false,
    mocks = {},
    theme = 'light',
    ...renderOptions
  } = options;

  // Setup mocks based on configuration
  setupMocks(mocks);

  // Performance tracking
  const startTime = performance ? Date.now() : 0;
  const initialMemory = performance && global.gc ? process.memoryUsage() : null;

  // Render with providers
  const Wrapper = createTestProviders(options);
  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Calculate performance metrics
  let performanceResult: TestPerformanceResult | undefined;
  if (performance) {
    const renderTime = Date.now() - startTime;
    const finalMemory = global.gc ? process.memoryUsage() : null;

    performanceResult = {
      renderTime,
      memoryUsage: finalMemory && initialMemory
        ? finalMemory.heapUsed - initialMemory.heapUsed
        : 0,
      asyncOperations: [],
      budgetViolations: [],
    };

    // Check against budgets
    const componentRenderBudget = 50; // 50ms budget for test renders
    if (renderTime > componentRenderBudget) {
      performanceResult.budgetViolations.push({
        metric: 'render_time',
        expected: componentRenderBudget,
        actual: renderTime,
      });
    }
  }

  // Accessibility testing
  let accessibilityResult: TestAccessibilityResult | undefined;
  if (accessibility) {
    accessibilityResult = runAccessibilityChecks(result);
  }

  return {
    ...result,
    performance: performanceResult,
    accessibility: accessibilityResult,
    rerender: (newUi: ReactElement, newOptions?: EnhancedRenderOptions) => {
      const mergedOptions = { ...options, ...newOptions };
      return renderWithProviders(newUi, mergedOptions);
    },
    cleanup: () => {
      result.unmount();
      cleanupMocks();
    },
  };
}

// ============================================================================
// SNAPSHOT TESTING UTILITIES
// ============================================================================

export function createSnapshotTest(
  name: string,
  component: ReactElement,
  options: EnhancedRenderOptions = {}
) {
  return () => {
    const result = renderWithProviders(component, {
      ...options,
      performance: false, // Disable for snapshot tests
      accessibility: false, // Disable for snapshot tests
    });

    expect(result.toJSON()).toMatchSnapshot();
  };
}

// ============================================================================
// INTEGRATION TEST UTILITIES
// ============================================================================

export class IntegrationTester {
  private performanceTester = new PerformanceTester();

  async testUserFlow(
    name: string,
    steps: Array<{
      description: string;
      action: () => Promise<void> | void;
      assertions?: () => void;
    }>
  ): Promise<void> {
    const endTest = this.performanceTester.startTest(`flow_${name}`);

    try {
      for (const [index, step] of steps.entries()) {
        logger.info(`Integration Test - ${name}: Step ${index + 1}`, {
          data: { description: step.description },
        });

        const stepEndTest = this.performanceTester.startTest(
          `step_${index + 1}_${step.description.replace(/\s+/g, '_').toLowerCase()}`
        );

        await step.action();

        if (step.assertions) {
          step.assertions();
        }

        stepEndTest();
      }

      endTest();
      logger.info(`Integration Test - ${name}: Completed successfully`);
    } catch (error) {
      endTest();
      logger.error(`Integration Test - ${name}: Failed`, { data: error });
      throw error;
    }
  }

  getFlowMetrics(): string {
    return this.performanceTester.generateReport();
  }
}

// Re-export PerformanceTester for direct use
export { PerformanceTester } from './PerformanceTesting';
