// ============================================================================
// TESTING UTILITIES - CENTRAL EXPORTS
// Main entry point for all testing utilities
// ============================================================================

// Test Utilities - setup, teardown, rendering
export {
  TestingConfig,
  TestPerformanceResult,
  TestAccessibilityResult,
  EnhancedRenderOptions,
  EnhancedRenderResult,
  renderWithProviders,
  createSnapshotTest,
  IntegrationTester,
  PerformanceTester,
} from './TestUtilities';

// Mock Factories - mock creation and data generation
export {
  MockFactory,
  createMockFactory,
  MockDataGenerator,
} from './MockFactories';

// Test Fixtures - test data builders and scenarios
export {
  TestDataBuilder,
} from './TestFixtures';

// Mock Setup - mock setup and teardown
export {
  setupMocks,
  cleanupMocks,
} from './MockSetup';

// Accessibility Testing - accessibility checks
export {
  runAccessibilityChecks,
} from './AccessibilityTesting';

// Performance Testing - performance measurement
export {
  PerformanceTester as PerformanceTesterClass,
} from './PerformanceTesting';

// Test Helpers - helper functions
export {
  testHelpers,
} from './TestHelpers';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

import { renderWithProviders, createSnapshotTest, PerformanceTester, IntegrationTester } from './TestUtilities';
import { createMockFactory, MockDataGenerator } from './MockFactories';
import { TestDataBuilder } from './TestFixtures';
import { setupMocks, cleanupMocks } from './MockSetup';
import { testHelpers } from './TestHelpers';

export const testUtils = {
  render: renderWithProviders,
  createSnapshot: createSnapshotTest,
  performance: PerformanceTester,
  integration: IntegrationTester,
  setupMocks,
  cleanupMocks,
  createMockFactory,
  TestDataBuilder,
  MockDataGenerator,
  testHelpers,
};

export default testUtils;
