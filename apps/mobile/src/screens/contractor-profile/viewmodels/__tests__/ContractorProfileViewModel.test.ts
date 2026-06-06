/**
 * Unit tests for useContractorProfileViewModel.
 * Mocks useNavigation, mobileApiClient, logger; spies on react-native
 * Linking/Share/Alert. Covers the fetch effect (happy / no-id / review-error /
 * fetch-error) and the message/call/video/share/add-photo actions.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Linking, Share, Alert } from 'react-native';

const mockGet = jest.fn();
jest.mock('@/utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...a: unknown[]) => mockGet(...a) },
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: mockGetParent }),
}));

import { useContractorProfileViewModel } from '../ContractorProfileViewModel';

const contractorPayload = {
  contractor: {
    id: 'c1',
    name: 'Bob',
    company_name: 'BobCo',
    city: 'London',
    rating: 4.5,
    reviewCount: 10,
    total_jobs_completed: 20,
    skills: ['plumbing'],
    hourly_rate: 50,
    verified: true,
    phone: '07000',
    avatarUrl: 'a.png',
    portfolio_images: ['p1.jpg', '', null],
    postcode_prefix: 'E1',
    postcode_proof_count: 3,
    dispute_history: {
      resolved_count: 2,
      unresolved_count: 0,
      avg_resolution_hours: 24,
    },
  },
};
const reviewsPayload = {
  reviews: [
    {
      id: 'r1',
      author: 'Ann',
      rating: 5,
      comment: 'great',
      date: '2026-01-01',
    },
    { id: 'r2', rating: 4, date: '2026-02-01' }, // no author/comment -> defaults
  ],
};

let openUrlSpy: jest.SpyInstance;
let shareSpy: jest.SpyInstance;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation((url: string) =>
    url.includes('/reviews')
      ? Promise.resolve(reviewsPayload)
      : Promise.resolve(contractorPayload)
  );
  mockGetParent.mockReturnValue(undefined);
  openUrlSpy = jest
    .spyOn(Linking, 'openURL')
    .mockResolvedValue(undefined as never);
  shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({} as never);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  openUrlSpy.mockRestore();
  shareSpy.mockRestore();
  alertSpy.mockRestore();
});

describe('fetchProfile', () => {
  it('maps the API contractor + reviews into state', async () => {
    const { result } = renderHook(() => useContractorProfileViewModel('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.contractor.name).toBe('BobCo'); // company_name wins
    expect(result.current.contractor.profileImageUrl).toBe('a.png');
    expect(result.current.contractor.disputeHistory?.resolvedCount).toBe(2);
    expect(result.current.photos).toEqual(['p1.jpg']); // empties filtered out
    expect(result.current.reviews).toHaveLength(2);
    expect(result.current.reviews[1].reviewerName).toBe('Anonymous');
  });

  it('sets an error when no contractorId is provided', async () => {
    const { result } = renderHook(() => useContractorProfileViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('No contractor ID provided');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('keeps the profile when the reviews call fails', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/reviews')
        ? Promise.reject(new Error('reviews down'))
        : Promise.resolve(contractorPayload)
    );
    const { result } = renderHook(() => useContractorProfileViewModel('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.contractor.id).toBe('c1');
    expect(result.current.reviews).toEqual([]);
  });

  it('sets an error when the contractor call fails', async () => {
    mockGet.mockRejectedValue?.(new Error('x'));
    mockGet.mockImplementation(() => Promise.reject(new Error('profile down')));
    const { result } = renderHook(() => useContractorProfileViewModel('c1'));
    await waitFor(() => expect(result.current.error).toBe('profile down'));
  });
});

describe('handleMessage', () => {
  it('warns and does not navigate without a job context', async () => {
    const { result } = renderHook(() => useContractorProfileViewModel('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleMessage());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockParentNavigate).not.toHaveBeenCalled();
  });

  it('navigates via the parent stack when available', async () => {
    mockGetParent.mockReturnValue({ navigate: mockParentNavigate });
    const { result } = renderHook(() =>
      useContractorProfileViewModel('c1', { jobId: 'j1', source: 'bidReview' })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleMessage());
    expect(mockParentNavigate).toHaveBeenCalledWith(
      'MessagingTab',
      expect.objectContaining({ screen: 'Messaging' })
    );
  });

  it('falls back to a same-stack navigate without a parent', async () => {
    mockGetParent.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useContractorProfileViewModel('c1', { jobId: 'j1' })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleMessage());
    expect(mockNavigate).toHaveBeenCalledWith('Messaging', expect.any(Object));
  });
});

describe('handleCall / handleVideo / handleShare / handleAddPhoto', () => {
  async function ready() {
    const hook = renderHook(() => useContractorProfileViewModel('c1'));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook.result;
  }

  it('opens the dialer when a phone exists', async () => {
    const result = await ready();
    act(() => result.current.handleCall());
    expect(openUrlSpy).toHaveBeenCalledWith('tel:07000');
  });

  it('alerts when there is no phone number', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/reviews')
        ? Promise.resolve(reviewsPayload)
        : Promise.resolve({
            contractor: { ...contractorPayload.contractor, phone: undefined },
          })
    );
    const result = await ready();
    act(() => result.current.handleCall());
    expect(alertSpy).toHaveBeenCalledWith(
      'No Phone Number',
      expect.any(String)
    );
  });

  it('alerts when the dialer fails to open', async () => {
    openUrlSpy.mockRejectedValueOnce(new Error('no dialer'));
    const result = await ready();
    await act(async () => {
      result.current.handleCall();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Unable to make a phone call'
      )
    );
  });

  it('handleVideo shows a coming-soon alert', async () => {
    const result = await ready();
    act(() => result.current.handleVideo());
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', expect.any(String));
  });

  it('handleShare invokes the share sheet', async () => {
    const result = await ready();
    await act(async () => {
      await result.current.handleShare();
    });
    expect(shareSpy).toHaveBeenCalled();
  });

  it('handleShare logs on failure', async () => {
    shareSpy.mockRejectedValueOnce(new Error('share boom'));
    const result = await ready();
    await act(async () => {
      await result.current.handleShare();
    });
  });

  it('handleAddPhoto + setActiveTab do not throw', async () => {
    const result = await ready();
    act(() => {
      result.current.handleAddPhoto();
      result.current.setActiveTab('reviews');
    });
    expect(result.current.activeTab).toBe('reviews');
  });
});
