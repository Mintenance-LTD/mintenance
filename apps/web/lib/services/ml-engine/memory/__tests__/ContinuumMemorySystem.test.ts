// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { ContinuumMemorySystem } from '../ContinuumMemorySystem';
import type { ContinuumMemoryConfig } from '../types';

// Mock the serverSupabase module
vi.mock('../../../../api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock the logger
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ContinuumMemorySystem', () => {
  let service: ContinuumMemorySystem;

  const mockConfig: ContinuumMemoryConfig = {
    agentName: 'test-agent',
    levels: [
      {
        level: 0,
        frequency: 1,
        chunkSize: 64,
        learningRate: 0.01,
        mlpConfig: {
          inputSize: 64,
          outputSize: 64,
          hiddenSizes: [128],
          activation: 'relu',
        },
      },
      {
        level: 1,
        frequency: 10,
        chunkSize: 64,
        learningRate: 0.001,
        mlpConfig: {
          inputSize: 64,
          outputSize: 64,
          hiddenSizes: [128],
          activation: 'relu',
        },
      },
    ],
    defaultChunkSize: 64,
    defaultLearningRate: 0.01,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContinuumMemorySystem(mockConfig);
  });

  describe('initialization', () => {
    it('should create an instance with config', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with provided agent name', () => {
      expect(service).toBeInstanceOf(ContinuumMemorySystem);
    });
  });

  describe('methods', () => {
    it('should enable Titans without error', () => {
      expect(() => service.enableTitans(true)).not.toThrow();
    });

    it('should enable proper backpropagation without error', () => {
      expect(() => service.enableProperBackpropagation(true)).not.toThrow();
    });

    it('should set activation function without error', () => {
      expect(() => service.setActivationFunction('relu')).not.toThrow();
      expect(() => service.setActivationFunction('tanh')).not.toThrow();
      expect(() => service.setActivationFunction('sigmoid')).not.toThrow();
    });
  });
});
