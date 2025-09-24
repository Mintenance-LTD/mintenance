import {
  renderWithProviders,
  createMockFactory,
  TestDataBuilder,
  MockDataGenerator,
  TestingConfig,
  TestPerformanceResult,
  TestAccessibilityResult,
  EnhancedRenderOptions,
} from '../../utils/testing';
import { render } from '@testing-library/react-native';
import React from 'react';

// Mock dependencies
jest.mock('@testing-library/react-native', () => ({
  render: jest.fn(),
  fireEvent: {
    press: jest.fn(),
    changeText: jest.fn(),
  },
  waitFor: jest.fn(),
  screen: {
    getByText: jest.fn(),
    getByTestId: jest.fn(),
    getByRole: jest.fn(),
  },
}));

jest.mock('../../utils/performance', () => ({
  performanceMonitor: {
    startTimer: jest.fn(() => jest.fn()),
    recordMetric: jest.fn(),
    trackComponentRender: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock React
const mockReactElement = { type: 'div', props: {}, key: null };

jest.mock('react', () => ({
  createElement: jest.fn(() => mockReactElement),
  Component: class Component {},
  useState: jest.fn(),
  useEffect: jest.fn(),
  useContext: jest.fn(),
}));

const mockRender = render as jest.MockedFunction<typeof render>;

describe('Enhanced Render Utilities', () => {
  const TestComponent = () => mockReactElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock document for Node environment
    const mockDocument = {
      createElement: jest.fn().mockReturnValue({
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        innerHTML: '',
        textContent: '',
      }),
    };
    global.document = mockDocument as any;

    // Mock render to return a basic result
    mockRender.mockReturnValue({
      container: mockDocument.createElement('div'),
      unmount: jest.fn(),
      rerender: jest.fn(),
      debug: jest.fn(),
      asJSON: jest.fn(),
      getByText: jest.fn(),
      getByTestId: jest.fn(),
      getByRole: jest.fn(),
      queryByText: jest.fn(),
      queryByTestId: jest.fn(),
      queryByRole: jest.fn(),
      getAllByText: jest.fn(),
      getAllByTestId: jest.fn(),
      getAllByRole: jest.fn(),
      queryAllByText: jest.fn(),
      queryAllByTestId: jest.fn(),
      queryAllByRole: jest.fn(),
      findByText: jest.fn(),
      findByTestId: jest.fn(),
      findByRole: jest.fn(),
      findAllByText: jest.fn(),
      findAllByTestId: jest.fn(),
      findAllByRole: jest.fn(),
      toJSON: jest.fn(),
      root: document.createElement('div'),
      UNSAFE_root: document.createElement('div'),
    } as any);
  });

  describe('renderWithProviders', () => {
    it('should render component with default options', () => {
      const result = renderWithProviders(React.createElement(TestComponent));

      expect(mockRender).toHaveBeenCalledWith(
        mockReactElement,
        expect.objectContaining({
          wrapper: expect.any(Function),
        })
      );
      expect(result).toBeDefined();
      expect(result.rerender).toBeDefined();
      expect(result.cleanup).toBeDefined();
    });

    it('should track performance when enabled', () => {
      const originalDateNow = Date.now;
      let timeCounter = 1000;
      Date.now = jest.fn(() => timeCounter++);

      const result = renderWithProviders(React.createElement(TestComponent), {
        performance: true,
      });

      expect(result.performance).toBeDefined();
      expect(result.performance?.renderTime).toBeGreaterThan(0);
      expect(result.performance?.asyncOperations).toEqual([]);
      expect(result.performance?.budgetViolations).toBeDefined();

      Date.now = originalDateNow;
    });

    it('should check performance budgets', () => {
      const originalDateNow = Date.now;
      let timeCounter = 1000;
      Date.now = jest.fn(() => {
        timeCounter += 100; // Simulate slow render (100ms)
        return timeCounter;
      });

      const result = renderWithProviders(React.createElement(TestComponent), {
        performance: true,
      });

      expect(result.performance?.budgetViolations).toContainEqual({
        metric: 'render_time',
        expected: 50,
        actual: 100,
      });

      Date.now = originalDateNow;
    });

    it('should run accessibility checks when enabled', () => {
      const result = renderWithProviders(React.createElement(TestComponent), {
        accessibility: true,
      });

      expect(result.accessibility).toBeDefined();
      expect(result.accessibility?.score).toBeDefined();
      expect(result.accessibility?.violations).toBeDefined();
      expect(result.accessibility?.passedChecks).toBeDefined();
      expect(result.accessibility?.totalChecks).toBeDefined();
    });

    it('should handle different themes', () => {
      renderWithProviders(React.createElement(TestComponent), {
        theme: 'dark',
      });

      expect(mockRender).toHaveBeenCalled();
    });

    it('should setup mocks based on configuration', () => {
      renderWithProviders(React.createElement(TestComponent), {
        mocks: {
          navigation: true,
          asyncStorage: true,
          haptics: true,
          biometrics: true,
        },
      });

      expect(mockRender).toHaveBeenCalled();
    });

    it('should provide rerender function', () => {
      const result = renderWithProviders(React.createElement(TestComponent));
      const NewComponent = () => mockReactElement;

      result.rerender(React.createElement(NewComponent), { theme: 'dark' });

      // Should have been called twice - initial render and rerender
      expect(mockRender).toHaveBeenCalledTimes(2);
    });

    it('should provide cleanup function', () => {
      const mockUnmount = jest.fn();
      const baseMockResult = {
        toJSON: jest.fn(),
        update: jest.fn(),
        unmount: jest.fn(),
        debug: jest.fn(),
        rerender: jest.fn(),
        container: {} as any,
        baseElement: {} as any,
        queryByText: jest.fn(),
        queryAllByText: jest.fn(),
        getByText: jest.fn(),
        getAllByText: jest.fn(),
        queryByDisplayValue: jest.fn(),
        queryAllByDisplayValue: jest.fn(),
        getByDisplayValue: jest.fn(),
        getAllByDisplayValue: jest.fn(),
        queryByPlaceholderText: jest.fn(),
        queryAllByPlaceholderText: jest.fn(),
        getByPlaceholderText: jest.fn(),
        getAllByPlaceholderText: jest.fn(),
        queryByTestId: jest.fn(),
        queryAllByTestId: jest.fn(),
        getByTestId: jest.fn(),
        getAllByTestId: jest.fn(),
        queryByRole: jest.fn(),
        queryAllByRole: jest.fn(),
        getByRole: jest.fn(),
        getAllByRole: jest.fn(),
      };

      mockRender.mockReturnValueOnce({
        ...baseMockResult,
        unmount: mockUnmount,
      } as any);

      const result = renderWithProviders(React.createElement(TestComponent));
      result.cleanup();

      expect(mockUnmount).toHaveBeenCalled();
    });
  });
});

describe('Mock Factory System', () => {
  describe('createMockFactory', () => {
    it('should create factory for simple data types', () => {
      const userFactory = createMockFactory({
        id: () => Math.random().toString(),
        name: () => 'Test User',
        email: () => 'test@example.com',
        age: () => 25,
        active: () => true,
      });

      const user = userFactory.create();

      expect(user).toEqual({
        id: expect.any(String),
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
        active: true,
      });
    });

    it('should allow overriding default values', () => {
      const userFactory = createMockFactory({
        id: () => '123',
        name: () => 'Default Name',
        email: () => 'default@example.com',
      });

      const user = userFactory.create({
        name: 'Custom Name',
        email: 'custom@example.com',
      });

      expect(user).toEqual({
        id: '123',
        name: 'Custom Name',
        email: 'custom@example.com',
      });
    });

    it('should create multiple instances with createMany', () => {
      const factory = createMockFactory({
        id: () => Math.random().toString(),
        value: () => 'test',
      });

      const items = factory.createMany(3);

      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        id: expect.any(String),
        value: 'test',
      });
    });

    it('should handle nested objects', () => {
      const factory = createMockFactory({
        id: () => '1',
        profile: () => ({
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        }),
      });

      const result = factory.create();

      expect(result.profile.firstName).toBe('John');
      expect(result.profile.preferences.theme).toBe('dark');
    });

    it('should provide state management', () => {
      const factory = createMockFactory({
        id: () => Math.random().toString(),
        counter: () => 0,
      });

      const item1 = factory.create();
      factory.setState({ counter: 5 });
      const item2 = factory.create({ counter: factory.getState().counter + 1 });

      expect(item2.counter).toBe(6);
    });
  });
});

describe('Test Data Builder', () => {
  describe('TestDataBuilder', () => {
    it('should build test data with fluent interface', () => {
      const builder = new TestDataBuilder()
        .user({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        })
        .job({
          id: 'job-456',
          title: 'Test Job',
          description: 'Test Description',
          homeownerId: 'user-123',
        })
        .bids([
          {
            id: 'bid-789',
            jobId: 'job-456',
            contractorId: 'contractor-123',
            amount: 1000,
          },
        ]);

      const data = builder.build();

      expect(data.users).toHaveLength(1);
      expect(data.users[0].id).toBe('user-123');
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Test Job');
      expect(data.bids).toHaveLength(1);
      expect(data.bids[0].amount).toBe(1000);
    });

    it('should handle multiple entities of same type', () => {
      const builder = new TestDataBuilder()
        .user({ id: 'user-1', name: 'User 1' })
        .user({ id: 'user-2', name: 'User 2' })
        .user({ id: 'user-3', name: 'User 3' });

      const data = builder.build();

      expect(data.users).toHaveLength(3);
      expect(data.users.map(u => u.name)).toEqual(['User 1', 'User 2', 'User 3']);
    });

    it('should support relationships between entities', () => {
      const builder = new TestDataBuilder()
        .user({ id: 'homeowner-1', name: 'Homeowner' })
        .user({ id: 'contractor-1', name: 'Contractor' })
        .job({
          id: 'job-1',
          title: 'Test Job',
          homeownerId: 'homeowner-1',
          contractorId: 'contractor-1',
        });

      const data = builder.build();

      expect(data.jobs[0].homeownerId).toBe('homeowner-1');
      expect(data.jobs[0].contractorId).toBe('contractor-1');
    });

    it('should generate realistic test data', () => {
      const data = TestDataBuilder.generateRealistic();

      expect(data.users.length).toBeGreaterThan(0);
      expect(data.jobs.length).toBeGreaterThan(0);
      expect(data.bids.length).toBeGreaterThan(0);
      expect(data.messages.length).toBeGreaterThan(0);
    });

    it('should create scenario-based test data', () => {
      const data = TestDataBuilder.createScenario('job_with_multiple_bids');

      expect(data.users.length).toBeGreaterThan(1); // Homeowner + contractors
      expect(data.jobs).toHaveLength(1);
      expect(data.bids.length).toBeGreaterThan(1); // Multiple bids
    });

    it('should handle different scenarios', () => {
      const scenarios = [
        'empty_marketplace',
        'active_bidding',
        'completed_jobs',
        'messaging_active',
      ];

      scenarios.forEach(scenario => {
        const data = TestDataBuilder.createScenario(scenario as any);
        expect(data).toBeDefined();
        expect(data.users).toBeDefined();
        expect(data.jobs).toBeDefined();
        expect(data.bids).toBeDefined();
      });
    });
  });
});

describe('Mock Data Generator', () => {
  describe('MockDataGenerator', () => {
    it('should generate realistic user data', () => {
      const users = MockDataGenerator.generateUsers(5);

      expect(users).toHaveLength(5);
      users.forEach(user => {
        expect(user.id).toMatch(/^user_[a-z0-9]+$/);
        expect(user.email).toMatch(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
        expect(user.firstName).toBeTruthy();
        expect(user.lastName).toBeTruthy();
        expect(['homeowner', 'contractor']).toContain(user.role);
      });
    });

    it('should generate realistic job data', () => {
      const jobs = MockDataGenerator.generateJobs(3);

      expect(jobs).toHaveLength(3);
      jobs.forEach(job => {
        expect(job.id).toMatch(/^job_[a-z0-9]+$/);
        expect(job.title).toBeTruthy();
        expect(job.description).toBeTruthy();
        expect(job.budget).toBeGreaterThan(0);
        expect(['posted', 'assigned', 'in_progress', 'completed']).toContain(job.status);
        expect(job.location).toBeDefined();
        expect(job.location.latitude).toBeGreaterThan(-90);
        expect(job.location.latitude).toBeLessThan(90);
        expect(job.location.longitude).toBeGreaterThan(-180);
        expect(job.location.longitude).toBeLessThan(180);
      });
    });

    it('should generate bid data with relationships', () => {
      const jobs = MockDataGenerator.generateJobs(2);
      const contractors = MockDataGenerator.generateUsers(3).filter(u => u.role === 'contractor');
      const bids = MockDataGenerator.generateBids(5, jobs, contractors);

      expect(bids).toHaveLength(5);
      bids.forEach(bid => {
        expect(bid.id).toMatch(/^bid_[a-z0-9]+$/);
        expect(jobs.map(j => j.id)).toContain(bid.jobId);
        expect(bid.amount).toBeGreaterThan(0);
        expect(['pending', 'accepted', 'rejected']).toContain(bid.status);
      });
    });

    it('should generate message data', () => {
      const users = MockDataGenerator.generateUsers(4);
      const jobs = MockDataGenerator.generateJobs(2);
      const messages = MockDataGenerator.generateMessages(10, users, jobs);

      expect(messages).toHaveLength(10);
      messages.forEach(message => {
        expect(message.id).toMatch(/^msg_[a-z0-9]+$/);
        expect(users.map(u => u.id)).toContain(message.senderId);
        expect(users.map(u => u.id)).toContain(message.receiverId);
        expect(jobs.map(j => j.id)).toContain(message.jobId);
        expect(message.content).toBeTruthy();
        expect(message.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should generate location data', () => {
      const location = MockDataGenerator.generateLocation();

      expect(location.latitude).toBeGreaterThan(-90);
      expect(location.latitude).toBeLessThan(90);
      expect(location.longitude).toBeGreaterThan(-180);
      expect(location.longitude).toBeLessThan(180);
      expect(location.address).toBeTruthy();
      expect(location.city).toBeTruthy();
      expect(location.state).toBeTruthy();
      expect(location.zipCode).toMatch(/^\d{5}$/);
    });

    it('should generate device info', () => {
      const deviceInfo = MockDataGenerator.generateDeviceInfo();

      expect(['ios', 'android']).toContain(deviceInfo.platform);
      expect(deviceInfo.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(deviceInfo.model).toBeTruthy();
      expect(deviceInfo.manufacturer).toBeTruthy();
      expect(deviceInfo.screenWidth).toBeGreaterThan(0);
      expect(deviceInfo.screenHeight).toBeGreaterThan(0);
    });
  });
});

describe('Testing Configuration', () => {
  it('should provide default testing configuration', () => {
    const config: TestingConfig = {
      performance: {
        enabled: true,
        trackRenders: true,
        trackAsyncOperations: true,
        budgets: {
          render_time: 50,
          memory_usage: 100 * 1024 * 1024,
        },
      },
      mocks: {
        navigation: true,
        asyncStorage: true,
        haptics: false,
        biometrics: false,
        camera: false,
        notifications: false,
      },
      accessibility: {
        enabled: true,
        strictMode: false,
        checkContrast: true,
        checkLabels: true,
      },
      snapshots: {
        enabled: true,
        updateMode: 'none',
        platform: 'both',
      },
    };

    expect(config.performance.enabled).toBe(true);
    expect(config.mocks.navigation).toBe(true);
    expect(config.accessibility.enabled).toBe(true);
    expect(config.snapshots.platform).toBe('both');
  });
});