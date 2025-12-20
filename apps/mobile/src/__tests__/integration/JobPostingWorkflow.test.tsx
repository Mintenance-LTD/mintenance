import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View, TextInput } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/AuthService';
import { JobService } from '../../services/JobService';
import { createTestQueryClient } from '../utils/test-utils';
import { JobBidMockFactory } from '../../test-utils/jobBidMockFactory';

// Mock all necessary services
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
    getCurrentSession: jest.fn(),
  },
}));

jest.mock('../../services/JobService', () => ({
  JobService: {
    createJob: jest.fn(),
    getJobsByHomeowner: jest.fn(),
    getUserJobs: jest.fn(),
    getAvailableJobs: jest.fn(),
    getJobById: jest.fn(),
    updateJobStatus: jest.fn(),
    submitBid: jest.fn(),
    getBidsByJob: jest.fn(),
    acceptBid: jest.fn(),
  },
}));

jest.mock('../../services/BiometricService', () => ({
  BiometricService: {
    isAvailable: jest.fn(() => Promise.resolve(false)),
    isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
  },
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    initialize: jest.fn(() => Promise.resolve('mock-token')),
    savePushToken: jest.fn(),
  },
}));

jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../config/sentry', () => ({
  setUserContext: jest.fn(),
  trackUserAction: jest.fn(),
  addBreadcrumb: jest.fn(),
  measureAsyncPerformance: jest.fn((fn) => fn()),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockJobService = JobService as jest.Mocked<typeof JobService>;

// Mock Job Posting Screen Component
const MockJobPostingScreen = ({
  onJobPosted,
}: {
  onJobPosted?: (job: any) => void;
}) => {
  // Use mock user directly instead of auth context to avoid complexity
  const mockUser = {
    id: 'homeowner-123',
    email: 'homeowner@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'homeowner' as const,
  };
  
  const [jobData, setJobData] = React.useState({
    title: '',
    description: '',
    location: '',
    budget: '',
    category: 'Plumbing',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const handlePostJob = async () => {
    try {
      const job = await JobService.createJob({
        title: jobData.title,
        description: jobData.description,
        location: jobData.location,
        budget: parseFloat(jobData.budget),
        homeownerId: mockUser.id,
        category: jobData.category,
        priority: jobData.priority,
      });
      onJobPosted?.(job);
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  return (
    <View testID='job-posting-screen'>
      <Text>Post a Job</Text>
      <TextInput
        testID='job-title-input'
        placeholder='Job Title'
        value={jobData.title}
        onChangeText={(text) =>
          setJobData((prev) => ({ ...prev, title: text }))
        }
      />
      <TextInput
        testID='job-description-input'
        placeholder='Job Description'
        value={jobData.description}
        onChangeText={(text) =>
          setJobData((prev) => ({ ...prev, description: text }))
        }
        multiline
      />
      <TextInput
        testID='job-location-input'
        placeholder='Location'
        value={jobData.location}
        onChangeText={(text) =>
          setJobData((prev) => ({ ...prev, location: text }))
        }
      />
      <TextInput
        testID='job-budget-input'
        placeholder='Budget ($)'
        value={jobData.budget}
        onChangeText={(text) =>
          setJobData((prev) => ({ ...prev, budget: text }))
        }
        keyboardType='numeric'
      />
      <TouchableOpacity
        testID='category-plumbing'
        onPress={() =>
          setJobData((prev) => ({ ...prev, category: 'Plumbing' }))
        }
      >
        <Text>Plumbing</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='category-electrical'
        onPress={() =>
          setJobData((prev) => ({ ...prev, category: 'Electrical' }))
        }
      >
        <Text>Electrical</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='priority-low'
        onPress={() => setJobData((prev) => ({ ...prev, priority: 'low' }))}
      >
        <Text>Low Priority</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='priority-high'
        onPress={() => setJobData((prev) => ({ ...prev, priority: 'high' }))}
      >
        <Text>High Priority</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='post-job-button' onPress={handlePostJob}>
        <Text>Post Job</Text>
      </TouchableOpacity>
    </View>
  );
};

// Mock Jobs List Screen Component
const MockJobsListScreen = ({
  userRole,
  jobs,
}: {
  userRole: 'homeowner' | 'contractor';
  jobs?: any[];
}) => {
  const [jobsList, setJobsList] = React.useState(jobs || []);

  React.useEffect(() => {
    const loadJobs = async () => {
      try {
        let loadedJobs;
        if (userRole === 'homeowner') {
          loadedJobs = await JobService.getUserJobs('user-id');
        } else {
          loadedJobs = await JobService.getAvailableJobs();
        }
        setJobsList(loadedJobs);
      } catch (error) {
        // Error handling would show error message in real app
      }
    };

    loadJobs();
  }, [userRole]);

  return (
    <View testID='jobs-list-screen'>
      <Text testID='jobs-list-title'>
        {userRole === 'homeowner' ? 'My Jobs' : 'Available Jobs'}
      </Text>
      {jobsList.map((job, index) => (
        <View key={job.id || index} testID={`job-item-${index}`}>
          <Text testID={`job-title-${index}`}>{job.title}</Text>
          <Text testID={`job-budget-${index}`}>${job.budget}</Text>
          <Text testID={`job-status-${index}`}>{job.status}</Text>
          {userRole === 'contractor' && (
            <TouchableOpacity testID={`bid-button-${index}`}>
              <Text>Submit Bid</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {jobsList.length === 0 && (
        <Text testID='no-jobs-message'>
          {userRole === 'homeowner'
            ? 'No jobs posted yet'
            : 'No jobs available'}
        </Text>
      )}
    </View>
  );
};

// Mock Job Details Screen Component
const MockJobDetailsScreen = ({
  job,
  userRole,
}: {
  job: any;
  userRole: 'homeowner' | 'contractor';
}) => {
  const [bids, setBids] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadBids = async () => {
      try {
        const jobBids = await JobService.getBidsByJob(job.id);
        setBids(jobBids);
      } catch (error) {
        // Error handling would show error message in real app
      }
    };

    if (job.id) {
      loadBids();
    }
  }, [job.id]);

  const handleSubmitBid = async () => {
    try {
      await JobService.submitBid({
        jobId: job.id,
        contractorId: 'contractor-123',
        amount: 150,
        description: 'I can fix this for you',
      });
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    try {
      await JobService.acceptBid(bidId);
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  return (
    <View testID='job-details-screen'>
      <Text testID='job-details-title'>{job.title}</Text>
      <Text testID='job-details-description'>{job.description}</Text>
      <Text testID='job-details-budget'>${job.budget}</Text>
      <Text testID='job-details-location'>{job.location}</Text>
      <Text testID='job-details-status'>{job.status}</Text>

      {userRole === 'contractor' && job.status === 'posted' && (
        <TouchableOpacity testID='submit-bid-button' onPress={handleSubmitBid}>
          <Text>Submit Bid</Text>
        </TouchableOpacity>
      )}

      {userRole === 'homeowner' && bids.length > 0 && (
        <View testID='bids-section'>
          <Text testID='bids-title'>Received Bids</Text>
          {bids.map((bid, index) => (
            <View key={bid.id || index} testID={`bid-item-${index}`}>
              <Text testID={`bid-amount-${index}`}>${bid.amount}</Text>
              <Text testID={`bid-description-${index}`}>{bid.description}</Text>
              {bid.status === 'pending' && (
                <TouchableOpacity
                  testID={`accept-bid-button-${index}`}
                  onPress={() => handleAcceptBid(bid.id)}
                >
                  <Text>Accept Bid</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// Test Navigator Component
const TestNavigator = ({
  screen,
  userRole,
  job,
  jobs,
  onJobPosted,
}: {
  screen: 'posting' | 'list' | 'details';
  userRole: 'homeowner' | 'contractor';
  job?: any;
  jobs?: any[];
  onJobPosted?: (job: any) => void;
}) => {
  if (screen === 'posting') {
    return <MockJobPostingScreen onJobPosted={onJobPosted} />;
  }

  if (screen === 'details' && job) {
    return <MockJobDetailsScreen job={job} userRole={userRole} />;
  }

  return <MockJobsListScreen userRole={userRole} jobs={jobs} />;
};

const TestWrapper = (props: any) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <AuthProvider>
      <TestNavigator {...props} />
    </AuthProvider>
  </QueryClientProvider>
);

describe('Job Posting and Discovery Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default authenticated homeowner
    const mockHomeowner = {
      id: 'homeowner-123',
      email: 'homeowner@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'homeowner' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockAuthService.getCurrentUser.mockResolvedValue(mockHomeowner);
    mockAuthService.getCurrentSession.mockResolvedValue({
      user: mockHomeowner,
      access_token: 'token123',
    });
  });

  describe('Job Posting Flow (Homeowner)', () => {
    it('should complete the full job posting workflow', async () => {
      const mockJob = JobBidMockFactory.createCompleteJob({
        id: 'job-123',
        title: 'Kitchen Faucet Repair',
        description: 'My kitchen faucet is leaking and needs repair',
        location: '123 Main St, Anytown, USA',
        budget: 200,
        category: 'Plumbing',
        priority: 'high' as const,
        status: 'posted' as const,
        homeowner_id: 'homeowner-123',
      });

      mockJobService.createJob.mockResolvedValue(mockJob);

      let postedJob: any;
      const { getByTestId } = render(
        <TestWrapper
          screen='posting'
          userRole='homeowner'
          onJobPosted={(job: any) => {
            postedJob = job;
          }}
        />
      );

      // Should show job posting form
      expect(getByTestId('job-posting-screen')).toBeTruthy();

      // Fill in job details
      const titleInput = getByTestId('job-title-input');
      const descriptionInput = getByTestId('job-description-input');
      const locationInput = getByTestId('job-location-input');
      const budgetInput = getByTestId('job-budget-input');

      await act(async () => {
        fireEvent.changeText(titleInput, 'Kitchen Faucet Repair');
        fireEvent.changeText(
          descriptionInput,
          'My kitchen faucet is leaking and needs repair'
        );
        fireEvent.changeText(locationInput, '123 Main St, Anytown, USA');
        fireEvent.changeText(budgetInput, '200');
      });

      // Select category and priority
      const plumbingCategory = getByTestId('category-plumbing');
      const highPriority = getByTestId('priority-high');

      fireEvent.press(plumbingCategory);
      fireEvent.press(highPriority);

      // Submit job posting
      const postJobButton = getByTestId('post-job-button');
      await act(async () => {
        fireEvent.press(postJobButton);
      });

      // Verify job creation was called with correct data
      await waitFor(() => {
        expect(mockJobService.createJob).toHaveBeenCalledWith({
          title: 'Kitchen Faucet Repair',
          description: 'My kitchen faucet is leaking and needs repair',
          location: '123 Main St, Anytown, USA',
          budget: 200,
          homeownerId: 'homeowner-123',
          category: 'Plumbing',
          priority: 'high',
        });
      });

      // Should trigger onJobPosted callback
      expect(postedJob).toEqual(mockJob);
    });

    it('should handle job posting validation errors', async () => {
      mockJobService.createJob.mockRejectedValue(
        new Error('Title is required')
      );

      const { getByTestId } = render(
        <TestWrapper screen='posting' userRole='homeowner' />
      );

      // Try to post job without required fields
      const postJobButton = getByTestId('post-job-button');
      await act(async () => {
        fireEvent.press(postJobButton);
      });

      // Should remain on posting screen (error handling would show error message)
      expect(getByTestId('job-posting-screen')).toBeTruthy();
    });
  });

  describe('Job Discovery Flow (Contractor)', () => {
    it('should display available jobs for contractors', async () => {
      const mockJobs = [
        JobBidMockFactory.createCompleteJob({
          id: 'job-1',
          title: 'Kitchen Faucet Repair',
          budget: 200,
          status: 'posted' as const,
          homeowner_id: 'homeowner-123',
        }),
        JobBidMockFactory.createCompleteJob({
          id: 'job-2',
          title: 'Bathroom Tile Installation',
          budget: 500,
          status: 'posted' as const,
          homeowner_id: 'homeowner-456',
        }),
      ];

      mockJobService.getAvailableJobs.mockResolvedValue(mockJobs);

      const { getByTestId } = render(
        <TestWrapper screen='list' userRole='contractor' />
      );

      // Should show jobs list
      await waitFor(() => {
        expect(getByTestId('jobs-list-screen')).toBeTruthy();
        expect(getByTestId('jobs-list-title')).toBeTruthy();
      });

      // Check list title
      const listTitle = getByTestId('jobs-list-title');
      expect(listTitle.props.children).toBe('Available Jobs');

      // Should load available jobs
      expect(mockJobService.getAvailableJobs).toHaveBeenCalled();

      // Should display job items
      await waitFor(() => {
        expect(getByTestId('job-item-0')).toBeTruthy();
        expect(getByTestId('job-item-1')).toBeTruthy();
      });

      // Check job details display
      const job1Title = getByTestId('job-title-0');
      const job1Budget = getByTestId('job-budget-0');
      expect(job1Title.props.children).toBe('Kitchen Faucet Repair');
      expect(job1Budget.props.children).toEqual(['$', 200]);

      // Should show bid buttons for contractors
      expect(getByTestId('bid-button-0')).toBeTruthy();
      expect(getByTestId('bid-button-1')).toBeTruthy();
    });

    it('should handle empty jobs list', async () => {
      mockJobService.getAvailableJobs.mockResolvedValue([]);

      const { getByTestId } = render(
        <TestWrapper screen='list' userRole='contractor' />
      );

      await waitFor(() => {
        expect(getByTestId('no-jobs-message')).toBeTruthy();
      });

      const noJobsMessage = getByTestId('no-jobs-message');
      expect(noJobsMessage.props.children).toBe('No jobs available');
    });
  });

  describe('Job Management Flow (Homeowner)', () => {
    it('should display homeowner jobs', async () => {
      const mockJobs = [
        JobBidMockFactory.createCompleteJob({
          id: 'job-1',
          title: 'Kitchen Faucet Repair',
          budget: 200,
          status: 'posted' as const,
          homeowner_id: 'homeowner-123',
        }),
        JobBidMockFactory.createCompleteJob({
          id: 'job-2',
          title: 'Garden Maintenance',
          budget: 150,
          status: 'in_progress' as const,
          homeowner_id: 'homeowner-123',
        }),
      ];

      mockJobService.getUserJobs.mockResolvedValue(mockJobs);

      const { getByTestId } = render(
        <TestWrapper screen='list' userRole='homeowner' />
      );

      // Should show jobs list
      await waitFor(() => {
        expect(getByTestId('jobs-list-screen')).toBeTruthy();
      });

      // Check list title
      const listTitle = getByTestId('jobs-list-title');
      expect(listTitle.props.children).toBe('My Jobs');

      // Should load user jobs
      expect(mockJobService.getUserJobs).toHaveBeenCalledWith('user-id');

      // Should display job items
      await waitFor(() => {
        expect(getByTestId('job-item-0')).toBeTruthy();
        expect(getByTestId('job-item-1')).toBeTruthy();
      });

      // Check job status display
      const job1Status = getByTestId('job-status-0');
      const job2Status = getByTestId('job-status-1');
      expect(job1Status.props.children).toBe('posted');
      expect(job2Status.props.children).toBe('in_progress');

      // Homeowners should not see bid buttons
      expect(() => getByTestId('bid-button-0')).toThrow();
    });
  });

  describe('Bidding Flow', () => {
    it('should handle bid submission by contractor', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Kitchen Faucet Repair',
        description: 'Leaking faucet needs repair',
        budget: 200,
        location: '123 Main St',
        status: 'posted',
        homeowner_id: 'homeowner-123',
      };

      const mockBid = JobBidMockFactory.createCompleteBid({
        id: 'bid-123',
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 150,
        description: 'I can fix this for you',
        status: 'pending' as const,
      });

      mockJobService.submitBid.mockResolvedValue(mockBid);
      mockJobService.getBidsByJob.mockResolvedValue([]);

      const { getByTestId } = render(
        <TestWrapper screen='details' userRole='contractor' job={mockJob} />
      );

      // Should show job details
      expect(getByTestId('job-details-screen')).toBeTruthy();
      expect(getByTestId('job-details-title').props.children).toBe(
        'Kitchen Faucet Repair'
      );

      // Should show submit bid button for posted jobs
      const submitBidButton = getByTestId('submit-bid-button');
      expect(submitBidButton).toBeTruthy();

      // Submit bid
      await act(async () => {
        fireEvent.press(submitBidButton);
      });

      // Verify bid submission
      await waitFor(() => {
        expect(mockJobService.submitBid).toHaveBeenCalledWith({
          jobId: 'job-123',
          contractorId: 'contractor-123',
          amount: 150,
          description: 'I can fix this for you',
        });
      });
    });

    it('should handle bid acceptance by homeowner', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Kitchen Faucet Repair',
        description: 'Leaking faucet needs repair',
        budget: 200,
        location: '123 Main St',
        status: 'posted',
        homeowner_id: 'homeowner-123',
      };

      const mockBids = [
        JobBidMockFactory.createCompleteBid({
          id: 'bid-1',
          jobId: 'job-123',
          contractorId: 'contractor-1',
          amount: 150,
          description: 'I can fix this quickly',
          status: 'pending' as const,
        }),
        JobBidMockFactory.createCompleteBid({
          id: 'bid-2',
          jobId: 'job-123',
          contractorId: 'contractor-2',
          amount: 180,
          description: 'Professional service guaranteed',
          status: 'pending' as const,
        }),
      ];

      mockJobService.getBidsByJob.mockResolvedValue(mockBids);
      mockJobService.acceptBid.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <TestWrapper screen='details' userRole='homeowner' job={mockJob} />
      );

      // Should load and display bids
      await waitFor(() => {
        expect(getByTestId('bids-section')).toBeTruthy();
        expect(getByTestId('bid-item-0')).toBeTruthy();
        expect(getByTestId('bid-item-1')).toBeTruthy();
      });

      // Check bid details
      const bid1Amount = getByTestId('bid-amount-0');
      const bid1Description = getByTestId('bid-description-0');
      expect(bid1Amount.props.children).toEqual(['$', 150]);
      expect(bid1Description.props.children).toBe('I can fix this quickly');

      // Accept first bid
      const acceptBidButton = getByTestId('accept-bid-button-0');
      await act(async () => {
        fireEvent.press(acceptBidButton);
      });

      // Verify bid acceptance
      await waitFor(() => {
        expect(mockJobService.acceptBid).toHaveBeenCalledWith('bid-1');
      });
    });
  });
});
