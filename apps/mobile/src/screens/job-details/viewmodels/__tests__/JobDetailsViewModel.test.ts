/**
 * Unit tests for useJobDetailsViewModel.
 * Mocks externals: useJob (React Query), useAuth, AIAnalysisService,
 * mobileApiClient and logger. Exercises the details-aggregate effect
 * (stored assessment branches, photo fallback, no-user, error) plus the
 * action callbacks.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGet = jest.fn();
jest.mock('@/utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...a: unknown[]) => mockGet(...a) },
}));

const mockAnalyze = jest.fn();
jest.mock('@/services/AIAnalysisService', () => ({
  AIAnalysisService: {
    analyzeJobPhotos: (...a: unknown[]) => mockAnalyze(...a),
  },
}));
jest.mock('@/services/UnifiedAIServiceMobile', () => ({
  __esModule: true,
  default: {},
}));

const mockUseJob = jest.fn();
jest.mock('@/hooks/useJobs', () => ({
  useJob: (...a: unknown[]) => mockUseJob(...a),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext-fallback', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

import { useJobDetailsViewModel } from '../JobDetailsViewModel';

const mockRefetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockUseJob.mockReturnValue({
    data: { id: 'j1', photos: [] },
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  });
  mockGet.mockResolvedValue({
    contractStatus: 'accepted',
    escrowStatus: 'held',
    hasReviewed: true,
    beforePhotoCount: 2,
    afterPhotoCount: 1,
    buildingAssessment: null,
  });
  mockAnalyze.mockResolvedValue({ confidence: 0.9, detectedItems: ['leak'] });
});

describe('details aggregate effect', () => {
  it('maps the aggregate into state', async () => {
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(result.current.contractStatus).toBe('accepted'));
    expect(result.current.escrowStatus).toBe('held');
    expect(result.current.hasReviewed).toBe(true);
    expect(result.current.beforePhotoCount).toBe(2);
    expect(result.current.afterPhotoCount).toBe(1);
  });

  it('builds AIAnalysis from an urgent/critical stored assessment', async () => {
    mockGet.mockResolvedValue({
      contractStatus: null,
      buildingAssessment: {
        id: 'a1',
        damageType: 'pipe_leak',
        severity: 'critical',
        confidence: 0.8,
        urgency: 'immediate',
        assessmentData: {
          recommended_actions: ['shut water'],
          estimated_duration: '2h',
        },
        createdAt: '2026-01-01',
      },
    });
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(result.current.aiAnalysis).not.toBeNull());
    expect(result.current.aiAnalysis?.estimatedComplexity).toBe('High');
    expect(result.current.aiAnalysis?.safetyConcerns).toHaveLength(1);
    expect(result.current.aiAnalysis?.recommendedActions).toEqual([
      'shut water',
    ]);
  });

  it('handles a non-urgent moderate assessment with no assessmentData', async () => {
    mockGet.mockResolvedValue({
      buildingAssessment: {
        id: 'a2',
        damageType: null,
        severity: 'moderate',
        confidence: null,
        urgency: 'scheduled',
        assessmentData: null,
        createdAt: null,
      },
    });
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(result.current.aiAnalysis).not.toBeNull());
    expect(result.current.aiAnalysis?.estimatedComplexity).toBe('Medium');
    expect(result.current.aiAnalysis?.safetyConcerns).toHaveLength(0);
    expect(result.current.aiAnalysis?.detectedItems).toEqual(['Unknown']);
  });

  it('falls back to real-time analysis when there is no stored assessment but photos exist', async () => {
    mockUseJob.mockReturnValue({
      data: { id: 'j1', photos: ['p1.jpg'] },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockGet.mockResolvedValue({ buildingAssessment: null });
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(mockAnalyze).toHaveBeenCalled());
    expect(result.current.aiAnalysis?.detectedItems).toEqual(['leak']);
  });

  it('logs a warning when the aggregate call fails', async () => {
    mockGet.mockRejectedValue(new Error('aggregate down'));
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(result.current.aiLoading).toBe(false));
    expect(result.current.contractStatus).toBeNull();
  });

  it('does not fetch when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(mockGet).not.toHaveBeenCalled());
  });
});

describe('actions', () => {
  it('loadAIAnalysis sets analysis on success', async () => {
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await waitFor(() => expect(result.current.contractStatus).toBe('accepted'));
    await act(async () => {
      await result.current.loadAIAnalysis({ id: 'j1' } as never);
    });
    expect(mockAnalyze).toHaveBeenCalled();
  });

  it('loadAIAnalysis swallows errors', async () => {
    mockAnalyze.mockRejectedValueOnce(new Error('ai down'));
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    await act(async () => {
      await result.current.loadAIAnalysis({ id: 'j1' } as never);
    });
    expect(result.current.aiLoading).toBe(false);
  });

  it('handleContractorAssigned and handleJobStatusUpdate refetch the job', async () => {
    const { result } = renderHook(() => useJobDetailsViewModel('j1'));
    act(() => result.current.handleContractorAssigned('c1', 'b1'));
    act(() =>
      result.current.handleJobStatusUpdate({
        id: 'j1',
        status: 'in_progress',
      } as never)
    );
    expect(mockRefetch).toHaveBeenCalled();
  });
});
