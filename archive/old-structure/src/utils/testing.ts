// ============================================================================
// COMPREHENSIVE TESTING UTILITIES
// Advanced testing helpers for React Native components and services
// ============================================================================

import { render, RenderOptions, RenderResult } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { performanceMonitor } from './performance';
import { logger } from './logger';

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

export interface TestPerformanceResult {
  renderTime: number;
  memoryUsage: number;
  asyncOperations: Array<{
    name: string;
    duration: number;
    success: boolean;
  }>;
  budgetViolations: Array<{
    metric: string;
    expected: number;
    actual: number;
  }>;
}

export interface TestAccessibilityResult {
  violations: Array<{
    type: 'missing_label' | 'low_contrast' | 'invalid_role' | 'missing_hint';
    element: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  score: number; // 0-100
  passedChecks: number;
  totalChecks: number;
}

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
// MOCK SETUP UTILITIES
// ============================================================================

const activeMocks: Array<() => void> = [];

function setupMocks(mockConfig: Partial<TestingConfig['mocks']>) {
  // Navigation mocks
  if (mockConfig.navigation) {
    const navigationMock = setupNavigationMock();
    activeMocks.push(navigationMock);
  }

  // AsyncStorage mocks
  if (mockConfig.asyncStorage) {
    const storageMock = setupAsyncStorageMock();
    activeMocks.push(storageMock);
  }

  // Haptics mocks
  if (mockConfig.haptics) {
    const hapticsMock = setupHapticsMock();
    activeMocks.push(hapticsMock);
  }

  // Biometrics mocks
  if (mockConfig.biometrics) {
    const biometricsMock = setupBiometricsMock();
    activeMocks.push(biometricsMock);
  }

  // Camera mocks
  if (mockConfig.camera) {
    const cameraMock = setupCameraMock();
    activeMocks.push(cameraMock);
  }

  // Notifications mocks
  if (mockConfig.notifications) {
    const notificationsMock = setupNotificationsMock();
    activeMocks.push(notificationsMock);
  }
}

function cleanupMocks() {
  activeMocks.forEach(cleanup => cleanup());
  activeMocks.length = 0;
}

function setupNavigationMock() {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockReset = jest.fn();

  (global as any).mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    canGoBack: () => true,
    getState: () => ({ index: 0, routes: [] }),
  };

  return () => {
    delete (global as any).mockNavigation;
  };
}

function setupAsyncStorageMock() {
  const mockStorage = new Map<string, string>();

  const mockAsyncStorage = {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) || null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStorage.keys()))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map(key => [key, mockStorage.get(key) || null]))
    ),
  };

  (global as any).mockAsyncStorage = mockAsyncStorage;

  return () => {
    delete (global as any).mockAsyncStorage;
    mockStorage.clear();
  };
}

function setupHapticsMock() {
  const mockHaptics = {
    impactAsync: jest.fn(() => Promise.resolve()),
    notificationAsync: jest.fn(() => Promise.resolve()),
    selectionAsync: jest.fn(() => Promise.resolve()),
  };

  (global as any).mockHaptics = mockHaptics;

  return () => {
    delete (global as any).mockHaptics;
  };
}

function setupBiometricsMock() {
  const mockBiometrics = {
    hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
    isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
    authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
    getAvailableAuthenticationTypesAsync: jest.fn(() => Promise.resolve(['fingerprint'])),
  };

  (global as any).mockBiometrics = mockBiometrics;

  return () => {
    delete (global as any).mockBiometrics;
  };
}

function setupCameraMock() {
  const mockCamera = {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    launchImageLibraryAsync: jest.fn(() => Promise.resolve({
      cancelled: false,
      assets: [{ uri: 'mock://image.jpg' }],
    })),
    launchCameraAsync: jest.fn(() => Promise.resolve({
      cancelled: false,
      assets: [{ uri: 'mock://photo.jpg' }],
    })),
  };

  (global as any).mockCamera = mockCamera;

  return () => {
    delete (global as any).mockCamera;
  };
}

function setupNotificationsMock() {
  const mockNotifications = {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
    cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
    registerForPushNotificationsAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  };

  (global as any).mockNotifications = mockNotifications;

  return () => {
    delete (global as any).mockNotifications;
  };
}

// ============================================================================
// ACCESSIBILITY TESTING
// ============================================================================

function runAccessibilityChecks(renderResult: RenderResult): TestAccessibilityResult {
  const violations: TestAccessibilityResult['violations'] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Check for accessibility labels
  totalChecks++;
  try {
    const unlabeledButtons = renderResult.getAllByRole('button').filter(
      button => !button.props.accessibilityLabel && !button.props.children
    );
    if (unlabeledButtons.length === 0) {
      passedChecks++;
    } else {
      violations.push({
        type: 'missing_label',
        element: 'button',
        severity: 'high',
        suggestion: 'Add accessibilityLabel prop to buttons without text content',
      });
    }
  } catch {
    passedChecks++; // No buttons found, check passes
  }

  // Check for accessibility hints on interactive elements
  totalChecks++;
  try {
    const interactiveElements = [
      ...renderResult.getAllByRole('button'),
      ...renderResult.queryAllByRole('link'),
    ];

    const elementsNeedingHints = interactiveElements.filter(
      element => element.props.onPress && !element.props.accessibilityHint
    );

    if (elementsNeedingHints.length === 0) {
      passedChecks++;
    } else {
      violations.push({
        type: 'missing_hint',
        element: 'interactive',
        severity: 'medium',
        suggestion: 'Add accessibilityHint to interactive elements to explain their action',
      });
    }
  } catch {
    passedChecks++;
  }

  // More accessibility checks would go here...
  // - Color contrast validation
  // - Font size compliance
  // - Touch target size validation
  // - Screen reader compatibility

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return {
    violations,
    score,
    passedChecks,
    totalChecks,
  };
}

// ============================================================================
// PERFORMANCE TESTING UTILITIES
// ============================================================================

export class PerformanceTester {
  private metrics: Array<{ name: string; value: number; timestamp: number }> = [];

  startTest(name: string): () => void {
    const startTime = performance.now();
    const startMemory = global.gc ? process.memoryUsage() : null;

    return () => {
      const duration = performance.now() - startTime;
      const endMemory = global.gc ? process.memoryUsage() : null;

      this.metrics.push({
        name: `${name}_duration`,
        value: duration,
        timestamp: Date.now(),
      });

      if (startMemory && endMemory) {
        this.metrics.push({
          name: `${name}_memory`,
          value: endMemory.heapUsed - startMemory.heapUsed,
          timestamp: Date.now(),
        });
      }
    };
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTest = this.startTest(name);
    try {
      const result = await fn();
      endTest();
      return result;
    } catch (error) {
      endTest();
      throw error;
    }
  }

  measureSync<T>(name: string, fn: () => T): T {
    const endTest = this.startTest(name);
    try {
      const result = fn();
      endTest();
      return result;
    } catch (error) {
      endTest();
      throw error;
    }
  }

  getMetrics(): Array<{ name: string; value: number; timestamp: number }> {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No performance metrics collected';
    }

    const report = ['Performance Test Report', '========================'];

    const grouped = this.metrics.reduce((acc, metric) => {
      const baseName = metric.name.replace(/_duration|_memory/, '');
      if (!acc[baseName]) acc[baseName] = {};

      if (metric.name.endsWith('_duration')) {
        acc[baseName].duration = metric.value;
      } else if (metric.name.endsWith('_memory')) {
        acc[baseName].memory = metric.value;
      }

      return acc;
    }, {} as Record<string, { duration?: number; memory?: number }>);

    Object.entries(grouped).forEach(([name, values]) => {
      report.push(`\n${name}:`);
      if (values.duration !== undefined) {
        report.push(`  Duration: ${values.duration.toFixed(2)}ms`);
      }
      if (values.memory !== undefined) {
        report.push(`  Memory: ${(values.memory / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    return report.join('\n');
  }
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

// ============================================================================
// MOCK FACTORY SYSTEM
// ============================================================================

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
  setState(state: Partial<T>): void;
  getState(): Partial<T>;
}

export function createMockFactory<T extends Record<string, any>>(
  defaults: { [K in keyof T]: () => T[K] }
): MockFactory<T> {
  let state: Partial<T> = {};

  return {
    create(overrides: Partial<T> = {}): T {
      const result = {} as T;

      // Apply defaults
      for (const [key, defaultFn] of Object.entries(defaults)) {
        result[key as keyof T] = defaultFn();
      }

      // Apply state overrides
      Object.assign(result, state);

      // Apply parameter overrides
      Object.assign(result, overrides);

      return result;
    },

    createMany(count: number, overrides: Partial<T> = {}): T[] {
      return Array.from({ length: count }, () => this.create(overrides));
    },

    setState(newState: Partial<T>): void {
      state = { ...state, ...newState };
    },

    getState(): Partial<T> {
      return { ...state };
    },
  };
}

// ============================================================================
// TEST DATA BUILDER
// ============================================================================

export class TestDataBuilder {
  private entities: Map<string, any[]> = new Map();
  private relationships: Map<string, { from: string; to: string; field: string }[]> = new Map();

  constructor() {
    this.entities = new Map();
    this.relationships = new Map();
  }

  // Fluent API methods for individual entities
  user(userData: any): this {
    if (!this.entities.has('users')) {
      this.entities.set('users', []);
    }
    this.entities.get('users')!.push(userData);
    return this;
  }

  job(jobData: any): this {
    if (!this.entities.has('jobs')) {
      this.entities.set('jobs', []);
    }
    this.entities.get('jobs')!.push(jobData);
    return this;
  }

  bid(bidData: any): this {
    if (!this.entities.has('bids')) {
      this.entities.set('bids', []);
    }
    this.entities.get('bids')!.push(bidData);
    return this;
  }

  message(messageData: any): this {
    if (!this.entities.has('messages')) {
      this.entities.set('messages', []);
    }
    this.entities.get('messages')!.push(messageData);
    return this;
  }

  bids(bidsData: any[]): this {
    if (!this.entities.has('bids')) {
      this.entities.set('bids', []);
    }
    bidsData.forEach(bidData => {
      this.entities.get('bids')!.push(bidData);
    });
    return this;
  }

  // Batch generation methods
  addUsers(count: number): this {
    const users = MockDataGenerator.generateUsers(count);
    this.entities.set('users', users);
    return this;
  }

  addJobs(count: number): this {
    const jobs = MockDataGenerator.generateJobs(count);
    this.entities.set('jobs', jobs);
    return this;
  }

  addBids(count: number): this {
    const users = this.entities.get('users') || [];
    const jobs = this.entities.get('jobs') || [];
    const contractors = users.filter((u: any) => u.role === 'contractor');

    const bids = MockDataGenerator.generateBids(count, jobs, contractors);
    this.entities.set('bids', bids);
    return this;
  }

  addMessages(count: number): this {
    const users = this.entities.get('users') || [];
    const jobs = this.entities.get('jobs') || [];

    const messages = MockDataGenerator.generateMessages(count, users, jobs);
    this.entities.set('messages', messages);
    return this;
  }

  withRelationship(from: string, to: string, field: string): this {
    if (!this.relationships.has(from)) {
      this.relationships.set(from, []);
    }
    this.relationships.get(from)!.push({ from, to, field });
    return this;
  }

  withScenario(scenarioName: string): this {
    switch (scenarioName) {
      case 'basic_job_workflow':
        return this
          .addUsers(5)
          .addJobs(3)
          .addBids(8)
          .addMessages(15)
          .withRelationship('jobs', 'users', 'homeowner_id')
          .withRelationship('bids', 'jobs', 'job_id')
          .withRelationship('bids', 'users', 'contractor_id');

      case 'active_marketplace':
        return this
          .addUsers(20)
          .addJobs(10)
          .addBids(30)
          .addMessages(50);

      case 'job_with_multiple_bids':
        return this
          .addUsers(6) // 1 homeowner + 5 contractors
          .addJobs(1)
          .addBids(5)
          .addMessages(10)
          .withRelationship('jobs', 'users', 'homeowner_id')
          .withRelationship('bids', 'jobs', 'job_id')
          .withRelationship('bids', 'users', 'contractor_id');

      case 'empty_marketplace':
        return this
          .addUsers(2)
          .addJobs(0)
          .addBids(0)
          .addMessages(0);

      case 'high_activity':
        return this
          .addUsers(50)
          .addJobs(25)
          .addBids(100)
          .addMessages(200);

      case 'active_bidding':
        return this
          .addUsers(15)
          .addJobs(8)
          .addBids(40)
          .addMessages(30);

      case 'completed_jobs':
        return this
          .addUsers(10)
          .addJobs(12)
          .addBids(20)
          .addMessages(50);

      case 'messaging_active':
        return this
          .addUsers(8)
          .addJobs(5)
          .addBids(10)
          .addMessages(75);

      default:
        return this;
    }
  }

  build(): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    // Apply relationships
    this.relationships.forEach((relations, entityType) => {
      relations.forEach(relation => {
        const fromEntities = this.entities.get(relation.from);
        const toEntities = this.entities.get(relation.to);

        if (fromEntities && toEntities) {
          fromEntities.forEach((entity: any) => {
            if (toEntities.length > 0) {
              const randomTarget = toEntities[Math.floor(Math.random() * toEntities.length)];
              entity[relation.field] = randomTarget.id;
            }
          });
        }
      });
    });

    // Build final result
    this.entities.forEach((entities, type) => {
      result[type] = [...entities];
    });

    return result;
  }

  getUsers(): any[] {
    return this.entities.get('users') || [];
  }

  getJobs(): any[] {
    return this.entities.get('jobs') || [];
  }

  getBids(): any[] {
    return this.entities.get('bids') || [];
  }

  getMessages(): any[] {
    return this.entities.get('messages') || [];
  }

  // Static methods for test convenience
  static generateRealistic(): any {
    const builder = new TestDataBuilder();
    return builder
      .addUsers(8)
      .addJobs(5)
      .addBids(15)
      .addMessages(25)
      .build();
  }

  static createScenario(scenarioName: string): any {
    const builder = new TestDataBuilder();
    return builder.withScenario(scenarioName).build();
  }
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

export class MockDataGenerator {
  private static firstNames = [
    'John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Anna',
    'Mark', 'Emma', 'Paul', 'Rachel', 'Steve', 'Amanda', 'Brian', 'Jessica'
  ];

  private static lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez'
  ];

  private static jobCategories = [
    'plumbing', 'electrical', 'carpentry', 'painting', 'roofing',
    'landscaping', 'cleaning', 'renovation', 'hvac', 'appliance_repair'
  ];

  private static locations = [
    { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
    { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
    { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
    { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 }
  ];

  static generateUsers(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `user_${i + 1}`,
      email: `user${i + 1}@example.com`,
      firstName: this.firstNames[Math.floor(Math.random() * this.firstNames.length)],
      lastName: this.lastNames[Math.floor(Math.random() * this.lastNames.length)],
      role: Math.random() > 0.5 ? 'contractor' : 'homeowner', // 50% chance for better balance
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      profileImageUrl: `https://api.dicebear.com/6.x/personas/svg?seed=user${i + 1}`,
      bio: 'Generated test user bio',
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
      totalJobsCompleted: Math.floor(Math.random() * 50),
      isAvailable: Math.random() > 0.3,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  static generateJobs(count: number): any[] {
    return Array.from({ length: count }, (_, i) => {
      const location = this.locations[Math.floor(Math.random() * this.locations.length)];
      const category = this.jobCategories[Math.floor(Math.random() * this.jobCategories.length)];

      return {
        id: `job_${i + 1}`,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Job ${i + 1}`,
        description: `Professional ${category} work needed. This is a test job description for ${category} services.`,
        location: {
          address: `${location.city}, ${location.state}`,
          latitude: location.lat + (Math.random() - 0.5) * 0.1,
          longitude: location.lng + (Math.random() - 0.5) * 0.1,
          city: location.city,
          state: location.state,
        },
        homeownerId: null, // Will be set by relationships
        contractorId: Math.random() > 0.7 ? null : `contractor_${Math.floor(Math.random() * 5) + 1}`,
        status: ['posted', 'assigned', 'in_progress', 'completed'][Math.floor(Math.random() * 4)],
        budget: Math.floor(Math.random() * 5000) + 500,
        category,
        subcategory: `${category}_repair`,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        photos: [`https://picsum.photos/400/300?random=${i + 1}`],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  static generateBids(count: number, jobs: any[], contractors: any[]): any[] {
    if (jobs.length === 0 || contractors.length === 0) {
      // If no contractors provided, generate some temporary ones for the bids
      if (contractors.length === 0 && jobs.length > 0) {
        contractors = this.generateUsers(Math.max(3, count)).filter(u => u.role === 'contractor');
        // If still no contractors due to randomness, force create some
        if (contractors.length === 0) {
          contractors = Array.from({ length: Math.max(3, count) }, (_, i) => ({
            id: `temp_contractor_${i + 1}`,
            role: 'contractor',
            firstName: 'Contractor',
            lastName: `${i + 1}`,
            email: `contractor${i + 1}@example.com`,
          }));
        }
      } else {
        return [];
      }
    }

    return Array.from({ length: count }, (_, i) => {
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const contractor = contractors[Math.floor(Math.random() * contractors.length)];

      return {
        id: `bid_${Math.random().toString(36).substring(2, 8)}`,
        jobId: job.id,
        contractorId: contractor.id,
        amount: Math.floor(job.budget * (0.8 + Math.random() * 0.4)), // 80% - 120% of job budget
        description: `Professional bid for ${job.title}. Includes materials and labor.`,
        status: ['pending', 'accepted', 'rejected'][Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  static generateMessages(count: number, users: any[], jobs: any[]): any[] {
    if (users.length === 0) {
      return [];
    }

    return Array.from({ length: count }, (_, i) => {
      const sender = users[Math.floor(Math.random() * users.length)];
      const receiver = users[Math.floor(Math.random() * users.length)];
      const job = jobs.length > 0 ? jobs[Math.floor(Math.random() * jobs.length)] : null;

      return {
        id: `msg_${Math.random().toString(36).substring(2, 8)}`,
        jobId: job?.id || null,
        senderId: sender.id,
        receiverId: receiver.id,
        messageText: `Test message ${i + 1}: This is a sample message between users.`,
        content: `Test message ${i + 1}: This is a sample message between users.`,
        messageType: 'text',
        attachmentUrl: Math.random() > 0.8 ? `https://picsum.photos/200/200?random=${i + 10}` : null,
        read: Math.random() > 0.3,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        syncedAt: new Date().toISOString(),
      };
    });
  }

  static generateLocation(): any {
    const location = this.locations[Math.floor(Math.random() * this.locations.length)];
    return {
      latitude: location.lat + (Math.random() - 0.5) * 0.1,
      longitude: location.lng + (Math.random() - 0.5) * 0.1,
      city: location.city,
      state: location.state,
      country: 'US',
      address: `${Math.floor(Math.random() * 9999) + 1} Main St`,
      zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
    };
  }

  static generateDeviceInfo(): any {
    const platforms = ['ios', 'android'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    // Generate realistic screen dimensions
    const screenDimensions = platform === 'ios'
      ? { width: 390, height: 844 } // iPhone dimensions
      : { width: 360, height: 780 }; // Android dimensions

    return {
      platform,
      version: `${Math.floor(Math.random() * 5) + 10}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      model: platform === 'ios'
        ? ['iPhone 12', 'iPhone 13', 'iPhone 14', 'iPad Pro'][Math.floor(Math.random() * 4)]
        : ['Samsung Galaxy S21', 'Google Pixel 6', 'OnePlus 9'][Math.floor(Math.random() * 3)],
      isDevice: true,
      manufacturer: platform === 'ios' ? 'Apple' : ['Samsung', 'Google', 'OnePlus'][Math.floor(Math.random() * 3)],
      screenWidth: screenDimensions.width + Math.floor(Math.random() * 100) - 50, // Add some variation
      screenHeight: screenDimensions.height + Math.floor(Math.random() * 100) - 50,
    };
  }
}

// ============================================================================
// TEST UTILITIES EXPORTS
// ============================================================================

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
};

export default testUtils;