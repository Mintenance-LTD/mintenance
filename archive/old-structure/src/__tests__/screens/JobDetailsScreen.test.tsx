import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import JobDetailsScreen from '../../screens/JobDetailsScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useJob } from '../../hooks/useJobs';
import { AIAnalysisService } from '../../services/AIAnalysisService';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../hooks/useJobs');
jest.mock('../../services/AIAnalysisService', () => ({
  AIAnalysisService: {
    analyzeJob: jest.fn(),
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../components/JobStatusTracker', () => {
  return function MockJobStatusTracker() {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'job-status-tracker' }, 'Job Status Tracker');
  };
});

jest.mock('../../components/ContractorAssignment', () => {
  return function MockContractorAssignment() {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'contractor-assignment' }, 'Contractor Assignment');
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {
    jobId: 'job123',
  },
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseJob = useJob as jest.MockedFunction<typeof useJob>;
const { AIAnalysisService: mockAIAnalysisService } = require('../../services/AIAnalysisService');

const mockJob = {
  id: 'job123',
  title: 'Kitchen Renovation',
  description: 'Complete kitchen remodel with new cabinets, countertops, and appliances',
  homeownerId: 'homeowner123',
  contractorId: null,
  status: 'posted',
  budget: 25000,
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Main St, New York, NY 10001',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
  },
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  skills: ['plumbing', 'electrical', 'carpentry'],
  urgency: 'medium',
  photos: ['photo1.jpg', 'photo2.jpg'],
};

const mockAIAnalysis = {
  complexity: 'medium',
  estimatedDuration: '2-3 weeks',
  skillsRequired: ['plumbing', 'electrical', 'carpentry'],
  riskFactors: ['Electrical work requires permits'],
  recommendations: ['Consider professional electrical inspection'],
  costBreakdown: {
    materials: 15000,
    labor: 8000,
    permits: 2000,
  },
  confidence: 0.85,
};

describe('JobDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'homeowner123',
        email: 'homeowner@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    mockUseJob.mockReturnValue({
      data: mockJob,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockAIAnalysisService.analyzeJob.mockResolvedValue(mockAIAnalysis);
  });

  it('should render job details correctly', () => {
    const { getByText, getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('Kitchen Renovation')).toBeTruthy();
    expect(getByText('Complete kitchen remodel with new cabinets, countertops, and appliances')).toBeTruthy();
    expect(getByText('$25,000')).toBeTruthy();
    expect(getByText('123 Main St, New York, NY 10001')).toBeTruthy();
    expect(getByTestId('job-status-tracker')).toBeTruthy();
  });

  it('should display loading state while fetching job', () => {
    mockUseJob.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should handle job not found error', () => {
    mockUseJob.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Job not found'),
      refetch: jest.fn(),
    });

    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('Job not found')).toBeTruthy();
  });

  it('should load and display AI analysis', async () => {
    const { getByText, getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    // Click AI analysis button
    const aiButton = getByTestId('ai-analysis-button');
    fireEvent.press(aiButton);

    await waitFor(() => {
      expect(getByText('medium')).toBeTruthy(); // complexity
      expect(getByText('2-3 weeks')).toBeTruthy(); // duration
      expect(getByText('85%')).toBeTruthy(); // confidence
    });

    expect(mockAIAnalysisService.analyzeJob).toHaveBeenCalledWith(mockJob);
  });

  it('should handle AI analysis loading state', async () => {
    mockAIAnalysisService.analyzeJob.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const aiButton = getByTestId('ai-analysis-button');
    fireEvent.press(aiButton);

    await waitFor(() => {
      expect(getByTestId('ai-loading-indicator')).toBeTruthy();
    });
  });

  it('should handle AI analysis error', async () => {
    mockAIAnalysisService.analyzeJob.mockRejectedValue(new Error('AI service unavailable'));

    const { getByText, getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const aiButton = getByTestId('ai-analysis-button');
    fireEvent.press(aiButton);

    await waitFor(() => {
      expect(getByText('Failed to load AI analysis')).toBeTruthy();
    });
  });

  it('should display skills correctly', () => {
    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('plumbing')).toBeTruthy();
    expect(getByText('electrical')).toBeTruthy();
    expect(getByText('carpentry')).toBeTruthy();
  });

  it('should show urgency level', () => {
    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('Medium Priority')).toBeTruthy();
  });

  it('should handle different urgency levels', () => {
    mockUseJob.mockReturnValue({
      data: { ...mockJob, urgency: 'high' },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('High Priority')).toBeTruthy();
  });

  it('should show contractor assignment for homeowner', () => {
    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByTestId('contractor-assignment')).toBeTruthy();
  });

  it('should handle contractor view', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'contractor123',
        email: 'contractor@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'contractor',
        phone: '555-5678',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    // Contractor should see different options
    expect(getByText('Submit Bid')).toBeTruthy();
  });

  it('should navigate to edit job for homeowner', () => {
    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const editButton = getByTestId('edit-job-button');
    fireEvent.press(editButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditJob', { jobId: 'job123' });
  });

  it('should navigate to bid submission for contractor', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'contractor123',
        email: 'contractor@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'contractor',
        phone: '555-5678',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const bidButton = getByText('Submit Bid');
    fireEvent.press(bidButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('BidSubmission', { jobId: 'job123' });
  });

  it('should display photos when available', () => {
    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByTestId('job-photos')).toBeTruthy();
  });

  it('should handle job with no photos', () => {
    mockUseJob.mockReturnValue({
      data: { ...mockJob, photos: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(queryByTestId('job-photos')).toBeNull();
  });

  it('should show job creation date', () => {
    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText(/Posted on/)).toBeTruthy();
  });

  it('should refresh job data when refetch is called', () => {
    const mockRefetch = jest.fn();
    mockUseJob.mockReturnValue({
      data: mockJob,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const refreshButton = getByTestId('refresh-button');
    fireEvent.press(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should handle assigned job status', () => {
    mockUseJob.mockReturnValue({
      data: { ...mockJob, status: 'assigned', contractorId: 'contractor123' },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('Assigned')).toBeTruthy();
  });

  it('should navigate back when back button is pressed', () => {
    const { getByTestId } = render(
      <JobDetailsScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});