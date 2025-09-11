import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import JobPostingScreen from '../../screens/JobPostingScreen';
import { JobService } from '../../services/JobService';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
jest.mock('../../services/JobService');
jest.mock('../../hooks/useAuth');
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

    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  it('renders job posting form correctly', () => {
    const { getByTestId, getByText } = render(<JobPostingScreen />);

    expect(getByTestId('job-title-input')).toBeTruthy();
    expect(getByTestId('job-description-input')).toBeTruthy();
    expect(getByTestId('job-location-input')).toBeTruthy();
    expect(getByTestId('job-budget-input')).toBeTruthy();
    expect(getByTestId('job-category-select')).toBeTruthy();
    expect(getByTestId('job-priority-select')).toBeTruthy();
    expect(getByText('Post Job')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = render(<JobPostingScreen />);

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Title is required')).toBeTruthy();
    });
  });

  it('validates budget is a positive number', async () => {
    const { getByTestId, getByText } = render(<JobPostingScreen />);

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
    const { getByTestId, getByText } = render(<JobPostingScreen />);

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
    const { getByTestId, getByText } = render(<JobPostingScreen />);

    fireEvent.press(getByTestId('job-category-select'));
    fireEvent.press(getByText('Plumbing'));

    expect(getByText('Plumbing')).toBeTruthy();
  });

  it('selects job priority correctly', () => {
    const { getByTestId, getByText } = render(<JobPostingScreen />);

    fireEvent.press(getByTestId('job-priority-select'));
    fireEvent.press(getByText('High'));

    expect(getByText('High')).toBeTruthy();
  });

  it('handles photo selection', async () => {
    const mockImagePicker = require('expo-image-picker');
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo1.jpg' }],
    });

    const { getByTestId } = render(<JobPostingScreen />);

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
    });

    const { getByTestId, getByText } = render(<JobPostingScreen />);

    // Mock having 3 photos already selected
    const screen = render(<JobPostingScreen />);
    // screen.update();

    // fireEvent.press(getByTestId('add-photo-button'));

    await waitFor(() => {
      expect(getByText('Maximum 3 photos allowed')).toBeTruthy();
    });
  });

  it('removes photo when delete button is pressed', async () => {
    const { getByTestId } = render(<JobPostingScreen />);

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
    const mockJob = {
      id: 'job-1',
      title: 'Fix Kitchen Faucet',
      description: 'Leaky kitchen faucet needs professional repair',
      location: '123 Main Street, Anytown, USA',
      budget: 150,
      category: 'Plumbing',
      priority: 'high' as const,
      homeowner_id: 'user-1',
      status: 'posted' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockJobService.createJob.mockResolvedValue(mockJob);

    const { getByTestId, getByText } = render(<JobPostingScreen />);

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
    fireEvent.press(getByTestId('job-category-select'));
    fireEvent.press(getByText('Plumbing'));
    fireEvent.press(getByTestId('job-priority-select'));
    fireEvent.press(getByText('High'));

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(mockJobService.createJob).toHaveBeenCalledWith({
        title: 'Fix Kitchen Faucet',
        description: 'Leaky kitchen faucet needs professional repair',
        location: '123 Main Street, Anytown, USA',
        budget: 150,
        category: 'Plumbing',
        priority: 'high',
        homeowner_id: 'user-1',
        photos: [],
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

    mockJobService.createJob.mockResolvedValue(mockJob);

    const { getByTestId, getByText } = render(<JobPostingScreen />);

    // Fill minimum required fields
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Job posted successfully!')).toBeTruthy();
      expect(mockNavigate).toHaveBeenCalledWith('JobDetails', {
        jobId: 'job-1',
      });
    });
  });

  it('shows error message on job creation failure', async () => {
    mockJobService.createJob.mockRejectedValue(
      new Error('Failed to create job')
    );

    const { getByTestId, getByText } = render(<JobPostingScreen />);

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    fireEvent.press(getByText('Post Job'));

    await waitFor(() => {
      expect(getByText('Failed to create job')).toBeTruthy();
    });
  });

  it('shows loading state during job creation', () => {
    const { getByTestId, getByText } = render(<JobPostingScreen />);

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Mock a slow response
    mockJobService.createJob.mockImplementation(() => new Promise(() => {}));

    fireEvent.press(getByText('Post Job'));

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('disables form during submission', async () => {
    const { getByTestId, getByText } = render(<JobPostingScreen />);

    // Fill form
    fireEvent.changeText(getByTestId('job-title-input'), 'Fix Kitchen Faucet');
    fireEvent.changeText(
      getByTestId('job-description-input'),
      'Leaky kitchen faucet needs professional repair'
    );
    fireEvent.changeText(getByTestId('job-location-input'), '123 Main Street');
    fireEvent.changeText(getByTestId('job-budget-input'), '150');

    // Mock a slow response
    mockJobService.createJob.mockImplementation(() => new Promise(() => {}));

    fireEvent.press(getByText('Post Job'));

    // Button should be disabled during submission
    expect(getByText('Post Job').props.accessibilityState.disabled).toBe(true);
  });

  it('redirects non-homeowners', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'contractor' },
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    render(<JobPostingScreen />);

    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
});
