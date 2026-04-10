// ============================================================================
// TESTING UTILITIES - CENTRAL EXPORTS
// Main entry point for all testing utilities
// ============================================================================

// Test Utilities - setup, teardown, rendering
// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

import {
  renderWithProviders,
  createSnapshotTest,
  PerformanceTester,
  IntegrationTester,
} from './TestUtilities';
import { createMockFactory, MockDataGenerator } from './MockFactories';
import { TestDataBuilder } from './TestFixtures';
import { setupMocks, cleanupMocks } from './MockSetup';
import { testHelpers } from './TestHelpers';

export type {
  TestingConfig,
  TestPerformanceResult,
  TestAccessibilityResult,
  EnhancedRenderOptions,
} from './TestUtilities';
export { renderWithProviders } from './TestUtilities';

// Mock Factories - mock creation and data generation
export { createMockFactory, MockDataGenerator } from './MockFactories';

// Test Fixtures - test data builders and scenarios
export { TestDataBuilder } from './TestFixtures';

// Mock Setup - mock setup and teardown
// Accessibility Testing - accessibility checks
// Performance Testing - performance measurement
// Test Helpers - helper functions
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
