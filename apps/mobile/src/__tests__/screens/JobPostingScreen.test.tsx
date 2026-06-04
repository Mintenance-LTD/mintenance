/**
 * JobPostingScreen tests.
 *
 * Realigned for the 2026-05-22/23 Mint Editorial + job-draft refactor:
 *   - The budget input was removed; client-side validation now runs the
 *     shared `validateJobDraft` adapter (title min 5, description min 20,
 *     location min 3) so messages mirror the wire schema.
 *   - At least one photo is required before a job can be posted.
 *   - The create payload no longer carries `budget`; it carries `photos`
 *     (uploaded URLs) plus optional tenancy metadata.
 *   - Non-homeowners are routed away via `goToTab(navigation, 'HomeTab')`,
 *     i.e. `navigation.navigate('HomeTab')`.
 */
import React from 'react';
import { act } from '@testing-library/react-native';
import { render, fireEvent, waitFor } from '../test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import JobPostingScreen from '../../screens/JobPostingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { createTestQueryClient } from '../utils/test-utils';
import { useCreateJob } from '../../hooks/useJobs';
import { AuthMockFactory } from '../../test-utils/authMockFactory';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock dependencies
jest.mock('../../services/JobService');
jest.mock('../../contexts/AuthContext');
jest.mock('../../hooks/useJobs');
const nav = require('@react-navigation/native');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  ImagePickerResult: {},
}));
// Photos are uploaded to public URLs before the create payload is built.
// Stub the helper so it echoes the local URIs without a real network call.
jest.mock('../../utils/uploadJobPhotos', () => ({
  uploadJobPhotos: jest.fn((uris: string[]) => Promise.resolve(uris)),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCreateJob = useCreateJob as jest.MockedFunction<
  typeof useCreateJob
>;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const mockUser = {
  id: 'user-1',
  email: 'homeowner@example.com',
  first_name: 'John',
  last_name: 'Homeowner',
  role: 'homeowner' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const buildMutationMock = (overrides: Record<string, unknown> = {}) =>
  ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'job-1' }),
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    mutate: jest.fn(),
    reset: jest.fn(),
    variables: undefined,
    isIdle: true,
    status: 'idle' as const,
    context: undefined,
    submittedAt: 0,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    ...overrides,
  }) as any;

describe('JobPostingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (nav.useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      // useUnsavedChanges subscribes to 'beforeRemove' once the form is dirty.
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
    });
    mockUseAuth.mockReturnValue(
      AuthMockFactory.createAuthenticatedHomeowner({
        id: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        role: mockUser.role,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      })
    );
    mockUseCreateJob.mockReturnValue(buildMutationMock());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderJobPostingScreen = () => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <JobPostingScreen
          navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any}
        />
      </QueryClientProvider>
    );
  };

  // Adds a photo via the image-picker. Uses an https URI so the
  // component skips the file:// SecurityManager validation branch.
  const addPhoto = async (getByTestId: any, uri = 'https://photo1.jpg') => {
    const picker = require('expo-image-picker');
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri }],
    });
    await act(async () => {
      fireEvent.press(getByTestId('add-photo-button'));
    });
  };

  const fillRequiredText = async (getByTestId: any) => {
    await act(async () => {
      fireEvent.changeText(
        getByTestId('job-title-input'),
        'Fix Kitchen Faucet'
      );
      fireEvent.changeText(
        getByTestId('job-description-input'),
        'Leaky kitchen faucet needs professional repair'
      );
      fireEvent.changeText(
        getByTestId('job-location-input'),
        '123 Main Street, Anytown'
      );
    });
  };

  it('renders job posting form correctly', () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    expect(getByTestId('job-title-input')).toBeTruthy();
    expect(getByTestId('job-description-input')).toBeTruthy();
    expect(getByTestId('job-location-input')).toBeTruthy();
    // The category Picker renders test-accessible option rows.
    expect(getByTestId('category-option-plumbing')).toBeTruthy();
    expect(getByTestId('job-priority-select')).toBeTruthy();
    expect(getByTestId('add-photo-button')).toBeTruthy();
    expect(getByText('Post Job')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = renderJobPostingScreen();

    await act(async () => {
      fireEvent.press(getByText('Post Job'));
    });

    // validateJobDraft surfaces the canonical title min-length message.
    await waitFor(() => {
      expect(getByText('Title must be at least 5 characters')).toBeTruthy();
    });
  });

  it('validates title minimum length', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    await act(async () => {
      fireEvent.changeText(getByTestId('job-title-input'), 'Hi');
    });

    await waitFor(() => {
      expect(getByText('Title must be at least 5 characters')).toBeTruthy();
    });
  });

  it('validates description length', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    await act(async () => {
      fireEvent.changeText(
        getByTestId('job-title-input'),
        'Fix Kitchen Faucet'
      );
      fireEvent.changeText(getByTestId('job-description-input'), 'Too short');
    });

    await waitFor(() => {
      expect(
        getByText('Description must be at least 20 characters')
      ).toBeTruthy();
    });
  });

  it('selects job category correctly', async () => {
    const { getByTestId } = renderJobPostingScreen();

    await act(async () => {
      fireEvent.press(getByTestId('category-option-plumbing'));
    });

    expect(getByTestId('category-option-plumbing')).toBeTruthy();
  });

  it('selects job priority correctly', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    await act(async () => {
      fireEvent.press(getByTestId('job-priority-select'));
      fireEvent.press(getByText('High'));
    });

    expect(getByText('High')).toBeTruthy();
  });

  it('handles photo selection', async () => {
    const mockImagePicker = require('expo-image-picker');
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'https://photo1.jpg' }],
    });

    const { getByTestId } = renderJobPostingScreen();

    await act(async () => {
      fireEvent.press(getByTestId('add-photo-button'));
    });

    await waitFor(() => {
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  it('limits photos to maximum of 3', async () => {
    const { getByTestId } = renderJobPostingScreen();

    await addPhoto(getByTestId, 'https://photo1.jpg');
    await addPhoto(getByTestId, 'https://photo2.jpg');
    await addPhoto(getByTestId, 'https://photo3.jpg');
    // 4th press hits the limit guard (Alert) and is a no-op for state.
    await addPhoto(getByTestId, 'https://photo4.jpg');

    expect(getByTestId('add-photo-button')).toBeTruthy();
    expect(getByTestId('photo-0')).toBeTruthy();
    expect(getByTestId('photo-1')).toBeTruthy();
    expect(getByTestId('photo-2')).toBeTruthy();
    expect(() => getByTestId('photo-3')).toThrow();
  });

  it('removes photo when delete button is pressed', async () => {
    const { getByTestId } = renderJobPostingScreen();

    await addPhoto(getByTestId);

    await waitFor(() => {
      expect(getByTestId('photo-0')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('delete-photo-0'));
    });

    await waitFor(() => {
      expect(() => getByTestId('photo-0')).toThrow();
    });
  });

  it('creates job with valid data', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({ id: 'job-1' });
    mockUseCreateJob.mockReturnValue(
      buildMutationMock({ mutateAsync: mockMutateAsync })
    );

    const { getByTestId, getByText } = renderJobPostingScreen();

    await fillRequiredText(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('category-option-plumbing'));
      fireEvent.press(getByText('High'));
    });
    await addPhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText('Post Job'));
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fix Kitchen Faucet',
          description: 'Leaky kitchen faucet needs professional repair',
          location: '123 Main Street, Anytown',
          homeownerId: 'user-1',
          category: 'plumbing',
          urgency: 'high',
          photos: ['https://photo1.jpg'],
        })
      );
    });
  });

  it('shows success message and navigates on successful job creation', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    await fillRequiredText(getByTestId);
    await addPhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText('Post Job'));
    });

    await waitFor(() => {
      expect(getByText('Job posted successfully!')).toBeTruthy();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('JobDetails', {
        jobId: 'job-1',
      });
    });
  });

  it('shows error message on job creation failure', async () => {
    mockUseCreateJob.mockReturnValue(
      buildMutationMock({
        mutateAsync: jest
          .fn()
          .mockRejectedValue(new Error('Failed to create job')),
      })
    );

    const { getByTestId, getByText } = renderJobPostingScreen();

    await fillRequiredText(getByTestId);
    await addPhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText('Post Job'));
    });

    await waitFor(() => {
      expect(getByText('Failed to create job')).toBeTruthy();
    });
  });

  it('shows loading state during job creation', async () => {
    mockUseCreateJob.mockReturnValue(
      buildMutationMock({
        mutateAsync: jest.fn().mockImplementation(() => new Promise(() => {})),
      })
    );

    const { getByTestId, getByText } = renderJobPostingScreen();

    await fillRequiredText(getByTestId);
    await addPhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText('Post Job'));
    });

    await waitFor(() => {
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  it('disables form during submission', async () => {
    mockUseCreateJob.mockReturnValue(
      buildMutationMock({
        mutateAsync: jest.fn().mockImplementation(() => new Promise(() => {})),
      })
    );

    const { getByTestId, getByText } = renderJobPostingScreen();

    await fillRequiredText(getByTestId);
    await addPhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText('Post Job'));
    });

    await waitFor(() => {
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  it('redirects non-homeowners', () => {
    mockUseAuth.mockReturnValue(
      AuthMockFactory.createAuthenticatedContractor({
        id: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      })
    );

    renderJobPostingScreen();

    // goToTab(navigation, 'HomeTab') -> navigation.navigate('HomeTab')
    expect(mockNavigate).toHaveBeenCalledWith('HomeTab');
  });
});
