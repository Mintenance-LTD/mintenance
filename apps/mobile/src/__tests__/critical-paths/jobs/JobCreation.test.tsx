import React from 'react';
import { render, fireEvent, waitFor, act } from '../../test-utils';
import { Alert } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockMutateAsync = jest.fn();

jest.mock('../../../hooks/useJobs', () => ({
  useCreateJob: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'homeowner_1', role: 'homeowner' },
  }),
}));

jest.mock('../../../components/AIPricingWidget', () => ({
  AIPricingWidget: () => null,
}));

jest.mock('../../../components/ai/BuildingAssessmentCard', () => ({
  BuildingAssessmentCard: () => null,
}));

jest.mock('../../../utils/ErrorManager', () => ({
  ErrorManager: {
    handleValidationError: jest.fn(),
    handleError: jest.fn(),
  },
  ErrorCategory: {},
  ErrorSeverity: {},
}));

jest.mock('../../../utils/SecurityManager', () => ({
  SecurityManager: {
    validateTextInput: () => ({ errors: [] }),
    validateFileUpload: jest.fn(() =>
      Promise.resolve({ isValid: true, errors: [] })
    ),
  },
}));

// 2026-05-22: photos are now required on every job. The screen uploads
// local photo URIs via the shared `uploadJobPhotos` helper before POSTing.
// Mock it so the create flow doesn't make a real network call and returns
// stable public URLs.
jest.mock('../../../utils/uploadJobPhotos', () => ({
  uploadJobPhotos: jest.fn(() =>
    Promise.resolve(['https://cdn.example.com/photo-0.jpg'])
  ),
}));

// expo-image-picker is `require()`d lazily inside handleAddPhoto. Returning
// a non-local (https) URI skips the file-upload security validation branch
// and adds the photo straight to state.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'https://cdn.example.com/local-photo.jpg' }],
    })
  ),
}));

const JobPostingScreen = require('../../../screens/JobPostingScreen').default;

// Adds one photo through the real handleAddPhoto path so the
// photos-required gate is satisfied before submitting.
async function addOnePhoto(getByTestId: (id: string) => unknown) {
  await act(async () => {
    fireEvent.press(getByTestId('add-photo-button') as never);
  });
}

describe('Job Creation - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      id: 'job_new',
      title: 'Test Job',
      status: 'posted',
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('should create job with all required fields', async () => {
    const mockNavigation = { navigate: jest.fn() };
    const { getByTestId, getByText } = render(
      <JobPostingScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    fireEvent.changeText(getByTestId('job-title-input'), 'Plumbing Repair');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Fix leaky faucet in the upstairs bathroom'
    );
    fireEvent.changeText(getByTestId('job-location-input'), 'Central London');
    fireEvent.press(getByTestId('category-option-plumbing'));
    fireEvent.press(getByText('High'));
    // Photos required since 2026-05-22 — budget input was removed.
    await addOnePhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText(/post job/i));
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plumbing Repair',
          description: 'Fix leaky faucet in the upstairs bathroom',
          location: 'Central London',
          homeownerId: 'homeowner_1',
          category: 'plumbing',
          urgency: 'high',
        })
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('JobDetails', {
        jobId: 'job_new',
      });
    });
  });

  it('should validate required fields', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <JobPostingScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: {} }}
      />
    );

    // A photo is required before the field-validation branch is reached
    // (the photos-required gate short-circuits otherwise). Add one so we
    // exercise the title/description/location validation path with the
    // form fields left empty.
    await addOnePhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText(/post job/i));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please fix the errors in the form before submitting'
      );
      // Inline errors come straight from the shared `validateJobDraft`
      // Zod schema (createJobRequestSchema). Title is the required field
      // (min 5 chars); description and location are optional in the
      // current schema, so an empty form surfaces the title error.
      expect(queryByText('Title must be at least 5 characters')).toBeTruthy();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('should set job location', async () => {
    const { getByTestId, getByText } = render(
      <JobPostingScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(getByTestId('job-location-input'), 'New York, NY');
    fireEvent.changeText(getByTestId('job-title-input'), 'Test Job Title');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Detailed job description for testing'
    );
    // Photos required since 2026-05-22 — budget input was removed.
    await addOnePhoto(getByTestId);

    await act(async () => {
      fireEvent.press(getByText(/post job/i));
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'New York, NY' })
      );
    });
  });
});
