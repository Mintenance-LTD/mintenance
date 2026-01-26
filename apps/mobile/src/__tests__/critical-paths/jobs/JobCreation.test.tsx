
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

import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { Alert } from 'react-native';

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
  },
}));

const JobPostingScreen = require('../../../screens/JobPostingScreen').default;


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
    fireEvent.changeText(getByTestId('job-budget-input'), '500');
    fireEvent.press(getByTestId('category-option-plumbing'));
    fireEvent.press(getByText('High'));

    fireEvent.press(getByText(/post job/i));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plumbing Repair',
          description: 'Fix leaky faucet in the upstairs bathroom',
          location: 'Central London',
          budget: 500,
          homeownerId: 'homeowner_1',
          category: 'plumbing',
          priority: 'high',
        })
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('JobDetails', {
        jobId: 'job_new',
      });
    });
  });

  it('should validate required fields', async () => {
    const { getByText, queryByText } = render(
      <JobPostingScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.press(getByText(/post job/i));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please fix the errors in the form before submitting'
      );
      expect(queryByText('Description is required')).toBeTruthy();
      expect(queryByText('Location is required')).toBeTruthy();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('should set job location', async () => {
    const { getByTestId, getByText } = render(
      <JobPostingScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.changeText(getByTestId('job-location-input'), 'New York, NY');
    fireEvent.changeText(getByTestId('job-title-input'), 'Test Job Title');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Detailed job description for testing'
    );
    fireEvent.changeText(getByTestId('job-budget-input'), '150');
    fireEvent.press(getByText(/post job/i));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'New York, NY' })
      );
    });
  });
});
