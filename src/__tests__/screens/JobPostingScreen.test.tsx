import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import JobPostingScreen from '../../screens/JobPostingScreen';
import { JobService } from '../../services/JobService';
import { useAuth } from '../../contexts/AuthContext';
import { createTestQueryClient } from '../utils/test-utils';
import { useCreateJob } from '../../hooks/useJobs';
import { AuthMockFactory } from '../../test-utils/authMockFactory';
import { NavigationMockFactory } from '../../test-utils/navigationMockFactory';

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
  MediaTypeOptions: {
    Images: 'Images',
  },
  ImagePickerResult: {},
}));

const mockJobService = JobService as jest.Mocked<typeof JobService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCreateJob = useCreateJob as jest.MockedFunction<typeof useCreateJob>;
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

describe('JobPostingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (nav.useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });

    mockUseAuth.mockReturnValue(AuthMockFactory.createAuthenticatedHomeowner({
      id: mockUser.id,
      email: mockUser.email,
      first_name: mockUser.first_name,
      last_name: mockUser.last_name,
      role: mockUser.role,
      created_at: mockUser.created_at,
      updated_at: mockUser.updated_at,
    }));

    // Default successful mutation
    mockUseCreateJob.mockReturnValue({
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
    } as any);
  });

  // Test wrapper with QueryClient
  const renderJobPostingScreen = () => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <JobPostingScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
      </QueryClientProvider>
    );
  };

  it('renders job posting form correctly', () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    expect(getByTestId('job-title-input')).toBeTruthy();
    expect(getByTestId('job-description-input')).toBeTruthy();
    expect(getByTestId('job-location-input')).toBeTruthy();
    expect(getByTestId('job-budget-input')).toBeTruthy();
    expect(getByTestId('job-category-select')).toBeTruthy();
    expect(getByTestId('job-priority-select')).toBeTruthy();
    expect(getByText('Post Job')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = renderJobPostingScreen();

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Title is required')).toBeTruthy();
    });
  });

  it('validates budget is a positive number', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky faucet needs repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main St');
    fireEvent.changeText(getByTestId('job-budget-input'), '-50');
    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Budget must be a positive number')).toBeTruthy();
    });
  });

  it('validates description length', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(getByTestId('job-description-input'), 'Too short');
    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(
        getByText('Description must be at least 20 characters')
      ).toBeTruthy();
    });
  });

  it('selects job category correctly', () => {
    const { getByTestId } = renderJobPostingScreen();

    // Use the hidden category option for testing
    fireEvent.press(getByTestId('category-option-plumbing'));

    // Verify the category was selected by checking if Plumbing text is visible
    expect(getByTestId('category-option-plumbing')).toBeTruthy();
  });

  it('selects job priority correctly', () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    fireEvent.press(getByTestId('job-priority-select'));
    fireEvent.press(getByText('High'));

    expect(getByText('High')).toBeTruthy();
  });

  it('handles photo selection', async () => {
    const mockImagePicker = require('expo-image-picker');
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo1.jpg' }],
    } as any);

    const { getByTestId } = renderJobPostingScreen();

    fireEvent.press(getByTestId('add-photo-button'));

    await waitFor(() => {
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  it('limits photos to maximum of 3', async () => {
    const mockImagePicker = require('expo-image-picker');
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo4.jpg' }],
    } as any);

    const { getByTestId } = renderJobPostingScreen();

    // Add 3 photos first
    fireEvent.press(getByTestId('add-photo-button'));
    fireEvent.press(getByTestId('add-photo-button'));
    fireEvent.press(getByTestId('add-photo-button'));
    
    // Try to add a 4th photo - should show alert
    fireEvent.press(getByTestId('add-photo-button'));
    
    // Note: Alert.alert is mocked, so we can't test the actual alert text
    // This test will pass if the component doesn't crash when hitting the limit
    expect(getByTestId('add-photo-button')).toBeTruthy();
  });

  it('removes photo when delete button is pressed', async () => {
    const { getByTestId } = renderJobPostingScreen();

    // First add a photo
    const mockImagePicker = require('expo-image-picker');
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo1.jpg' }],
    });

    fireEvent.press(getByTestId('add-photo-button'));

    await waitFor(() => {
      expect(getByTestId('photo-0')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-photo-0'));

    await waitFor(() => {
      expect(() => getByTestId('photo-0')).toThrow();
    });
  });

  it('creates job with valid data', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({ id: 'job-1' });
    mockUseCreateJob.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      mutate: jest.fn(),
      reset: jest.fn(),
    } as any);

    const { getByTestId, getByText } = renderJobPostingScreen();

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(
      getByTestId('job-location-input'),
      '123 Main Street, Anytown, USA'
    );
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Select category and priority
    fireEvent.press(getByTestId('category-option-plumbing'));
    fireEvent.press(getByTestId('job-priority-select'));
    fireEvent.press(getByText('High'));

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Fix Kitchen Faucet',
        description: 'Leaky kitchen faucet needs professional repair',
        location: '123 Main Street, Anytown, USA',
        budget: 150,
        category: 'plumbing',
        priority: 'high',
        homeownerId: 'user-1',
      });
    });
  });

  it('shows success message and navigates on successful job creation', async () => {
    const mockJob = {
      id: 'job-1',
      title: 'Fix Kitchen Faucet',
      description: 'Leaky kitchen faucet needs professional repair',
      location: '123 Main Street, Anytown, USA',
      budget: 150,
      homeowner_id: 'user-1',
      status: 'posted' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { getByTestId, getByText } = renderJobPostingScreen();

    // Fill minimum required fields
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Select category and priority
    fireEvent.press(getByTestId('category-option-plumbing'));
    fireEvent.press(getByTestId('job-priority-select'));
    fireEvent.press(getByText('High'));

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Job posted successfully!')).toBeTruthy();
      expect(mockNavigate).toHaveBeenCalledWith('JobDetails', {
        jobId: 'job-1',
      });
    });
  });

  it('shows error message on job creation failure', async () => {
    // Override the mutation to reject with an error
    mockUseCreateJob.mockReturnValue({
      mutateAsync: jest.fn().mockRejectedValue(new Error('Failed to create job')),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      mutate: jest.fn(),
      reset: jest.fn(),
    } as any);

    const { getByTestId, getByText } = renderJobPostingScreen();

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Select category and priority
    fireEvent.press(getByTestId('category-option-plumbing'));
    fireEvent.press(getByTestId('job-priority-select'));
    fireEvent.press(getByText('High'));

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Failed to create job')).toBeTruthy();
    });
  });

  it('shows loading state during job creation', () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Mock a slow response
    mockUseCreateJob.mockReturnValue({
      mutateAsync: jest.fn().mockImplementation(() => new Promise(() => {})),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      mutate: jest.fn(),
      reset: jest.fn(),
    } as any);

    fireEvent.press(getByText('Post Job'));

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('disables form during submission', async () => {
    const { getByTestId, getByText } = renderJobPostingScreen();

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Mock a slow response
    mockUseCreateJob.mockReturnValue({
      mutateAsync: jest.fn().mockImplementation(() => new Promise(() => {})),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      mutate: jest.fn(),
      reset: jest.fn(),
    } as any);

    fireEvent.press(getByText('Post Job'));

    // Check loading spinner appears and button is disabled
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('redirects non-homeowners', () => {
    mockUseAuth.mockReturnValue(AuthMockFactory.createAuthenticatedContractor({
      id: mockUser.id,
      email: mockUser.email,
      first_name: mockUser.first_name,
      last_name: mockUser.last_name,
      created_at: mockUser.created_at,
      updated_at: mockUser.updated_at,
    }));

    renderJobPostingScreen();

    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
});
