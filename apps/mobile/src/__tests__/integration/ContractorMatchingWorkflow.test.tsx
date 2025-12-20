import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/AuthService';
import { JobService } from '../../services/JobService';
import { ContractorService } from '../../services/ContractorService';
import { MessagingService } from '../../services/MessagingService';

// Mock all necessary services
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
    getCurrentSession: jest.fn(),
  },
}));

jest.mock('../../services/JobService', () => ({
  JobService: {
    getJobById: jest.fn(),
    submitBid: jest.fn(),
    getBidsByJob: jest.fn(),
    getBidsByContractor: jest.fn(),
    acceptBid: jest.fn(),
    updateJobStatus: jest.fn(),
    startJob: jest.fn(),
    completeJob: jest.fn(),
  },
}));

jest.mock('../../services/ContractorService', () => ({
  ContractorService: {
    getNearbyContractors: jest.fn(),
    findNearbyContractors: jest.fn(),
    searchContractors: jest.fn(),
    getContractorProfile: jest.fn(),
    recordContractorMatch: jest.fn(),
    swipeContractor: jest.fn(),
    getMatches: jest.fn(),
    getContractorMatches: jest.fn(),
  },
}));

jest.mock('../../services/MessagingService', () => ({
  MessagingService: {
    sendMessage: jest.fn(),
    getConversations: jest.fn(),
    createThread: jest.fn(),
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
const mockContractorService = ContractorService as jest.Mocked<
  typeof ContractorService
>;
const mockMessagingService = MessagingService as jest.Mocked<
  typeof MessagingService
>;

// Mock Contractor Discovery Screen (Swipe Interface)
const MockContractorDiscoveryScreen = ({
  onMatch,
}: {
  onMatch?: (contractor: any, action: string) => void;
}) => {
  const [contractors, setContractors] = React.useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const loadContractors = async () => {
      try {
        const loadedContractors = await ContractorService.findNearbyContractors(
          { latitude: 0, longitude: 0 },
          50,
          []
        );
        setContractors(loadedContractors);
      } catch (error) {
        // Error handling would show error message in real app
      }
    };

    loadContractors();
  }, []);

  const handleSwipe = async (action: 'like' | 'pass') => {
    const contractor = contractors[currentIndex];
    if (contractor) {
      try {
        await ContractorService.swipeContractor(
          'homeowner-123',
          contractor.id,
          action
        );
        onMatch?.(contractor, action);
        setCurrentIndex((prev) => prev + 1);
      } catch (error) {
        // Error handling would show error message in real app
      }
    }
  };

  const currentContractor = contractors[currentIndex];

  if (!currentContractor) {
    return (
      <View testID='contractor-discovery-screen'>
        <Text testID='no-more-contractors'>No more contractors to review</Text>
      </View>
    );
  }

  return (
    <View testID='contractor-discovery-screen'>
      <Text testID='discovery-title'>Discover Contractors</Text>
      <View testID='contractor-card'>
        <Text testID='contractor-name'>{currentContractor.name}</Text>
        <Text testID='contractor-skills'>
          {currentContractor.skills?.join(', ')}
        </Text>
        <Text testID='contractor-rating'>
          Rating: {currentContractor.rating}/5
        </Text>
        <Text testID='contractor-bio'>{currentContractor.bio}</Text>
      </View>
      <TouchableOpacity
        testID='pass-button'
        onPress={() => handleSwipe('pass')}
      >
        <Text>Pass</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='like-button'
        onPress={() => handleSwipe('like')}
      >
        <Text>Like</Text>
      </TouchableOpacity>
    </View>
  );
};

// Mock Matches Screen
const MockMatchesScreen = ({
  userRole,
}: {
  userRole: 'homeowner' | 'contractor';
}) => {
  const [matches, setMatches] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadMatches = async () => {
      try {
        const loadedMatches = await ContractorService.getMatches('user-123');
        setMatches(loadedMatches);
      } catch (error) {
        // Error handling would show error message in real app
      }
    };

    loadMatches();
  }, []);

  const handleStartChat = async (matchId: string) => {
    try {
      await MessagingService.createConversation({
        jobId: 'job-123',
        participants: ['user-123', 'other-user-456'],
      });
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  return (
    <View testID='matches-screen'>
      <Text testID='matches-title'>
        {userRole === 'homeowner' ? 'Contractor Matches' : 'Homeowner Matches'}
      </Text>
      {matches.map((match, index) => (
        <View key={match.id || index} testID={`match-item-${index}`}>
          <Text testID={`match-name-${index}`}>
            {userRole === 'homeowner'
              ? match.contractorName
              : match.homeownerName}
          </Text>
          <Text testID={`match-status-${index}`}>{match.status}</Text>
          {match.status === 'mutual' && (
            <TouchableOpacity
              testID={`chat-button-${index}`}
              onPress={() => handleStartChat(match.id)}
            >
              <Text>Start Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {matches.length === 0 && <Text testID='no-matches'>No matches yet</Text>}
    </View>
  );
};

// Mock Bidding Dashboard
const MockBiddingDashboard = ({
  userRole,
}: {
  userRole: 'homeowner' | 'contractor';
}) => {
  const [bids, setBids] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadBids = async () => {
      try {
        let loadedBids;
        if (userRole === 'contractor') {
          loadedBids = await JobService.getBidsByContractor('contractor-123');
        } else {
          // For homeowner, load bids for their jobs
          loadedBids = await JobService.getBidsByJob('job-123');
        }
        setBids(loadedBids);
      } catch (error) {
        // Error handling would show error message in real app
      }
    };

    loadBids();
  }, [userRole]);

  const handleAcceptBid = async (bidId: string) => {
    try {
      await JobService.acceptBid(bidId);
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  const handleJobAction = async (
    jobId: string,
    action: 'start' | 'complete'
  ) => {
    try {
      if (action === 'start') {
        await JobService.startJob(jobId);
      } else {
        await JobService.completeJob(jobId);
      }
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  return (
    <View testID='bidding-dashboard'>
      <Text testID='dashboard-title'>
        {userRole === 'contractor' ? 'My Bids' : 'Received Bids'}
      </Text>
      {bids.map((bid, index) => (
        <View key={bid.id || index} testID={`bid-dashboard-item-${index}`}>
          <Text testID={`bid-job-title-${index}`}>{bid.jobTitle || 'Job'}</Text>
          <Text testID={`bid-amount-${index}`}>${bid.amount}</Text>
          <Text testID={`bid-status-${index}`}>{bid.status}</Text>

          {userRole === 'homeowner' && bid.status === 'pending' && (
            <TouchableOpacity
              testID={`accept-bid-dashboard-${index}`}
              onPress={() => handleAcceptBid(bid.id)}
            >
              <Text>Accept</Text>
            </TouchableOpacity>
          )}

          {userRole === 'contractor' && bid.status === 'accepted' && (
            <View>
              <TouchableOpacity
                testID={`start-job-${index}`}
                onPress={() => handleJobAction(bid.jobId, 'start')}
              >
                <Text>Start Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`complete-job-${index}`}
                onPress={() => handleJobAction(bid.jobId, 'complete')}
              >
                <Text>Mark Complete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      {bids.length === 0 && (
        <Text testID='no-bids'>
          {userRole === 'contractor'
            ? 'No bids submitted yet'
            : 'No bids received yet'}
        </Text>
      )}
    </View>
  );
};

// Test Navigator Component
const TestNavigator = ({
  screen,
  userRole,
  onMatch,
}: {
  screen: 'discovery' | 'matches' | 'bidding';
  userRole: 'homeowner' | 'contractor';
  onMatch?: (contractor: any, action: string) => void;
}) => {
  if (screen === 'discovery') {
    return <MockContractorDiscoveryScreen onMatch={onMatch} />;
  }

  if (screen === 'matches') {
    return <MockMatchesScreen userRole={userRole} />;
  }

  return <MockBiddingDashboard userRole={userRole} />;
};

const TestWrapper = (props: any) => (
  <AuthProvider>
    <TestNavigator {...props} />
  </AuthProvider>
);

describe('Contractor Matching and Bidding Workflow Integration', () => {
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

  describe('Contractor Discovery Flow', () => {
    it('should complete the contractor discovery workflow', async () => {
      const mockContractors = [
        {
          id: 'contractor-1',
          name: 'Mike Johnson',
          skills: ['Plumbing', 'Electrical'],
          rating: 4.8,
          bio: 'Experienced plumber with 10 years experience',
        },
        {
          id: 'contractor-2',
          name: 'Sarah Wilson',
          skills: ['Carpentry', 'Painting'],
          rating: 4.9,
          bio: 'Professional carpenter and painter',
        },
      ];

      mockContractorService.getContractors.mockResolvedValue(mockContractors);
      mockContractorService.createMatch.mockResolvedValue({
        id: 'match-123',
        homeownerId: 'homeowner-123',
        contractorId: 'contractor-1',
        action: 'like',
        status: 'pending',
      });

      let matchedContractor: any;
      let matchAction: string;

      const { getByTestId } = render(
        <TestWrapper
          screen='discovery'
          userRole='homeowner'
          onMatch={(contractor: any, action: string) => {
            matchedContractor = contractor;
            matchAction = action;
          }}
        />
      );

      // Should load contractors
      await waitFor(() => {
        expect(mockContractorService.getContractors).toHaveBeenCalled();
      });

      // Should display first contractor
      await waitFor(() => {
        expect(getByTestId('contractor-discovery-screen')).toBeTruthy();
        expect(getByTestId('contractor-card')).toBeTruthy();
      });

      // Check contractor details
      const contractorName = getByTestId('contractor-name');
      const contractorSkills = getByTestId('contractor-skills');
      const contractorRating = getByTestId('contractor-rating');

      expect(contractorName.props.children).toBe('Mike Johnson');
      expect(contractorSkills.props.children).toBe('Plumbing, Electrical');
      expect(contractorRating.props.children).toEqual(['Rating: ', 4.8, '/5']);

      // Like the contractor
      const likeButton = getByTestId('like-button');
      await act(async () => {
        fireEvent.press(likeButton);
      });

      // Verify match creation
      await waitFor(() => {
        expect(mockContractorService.createMatch).toHaveBeenCalledWith({
          homeownerId: 'homeowner-123',
          contractorId: 'contractor-1',
          action: 'like',
        });
      });

      // Should trigger onMatch callback
      expect(matchedContractor).toEqual(mockContractors[0]);
      expect(matchAction).toBe('like');

      // Should show next contractor
      await waitFor(() => {
        expect(getByTestId('contractor-name').props.children).toBe(
          'Sarah Wilson'
        );
      });
    });

    it('should handle passing on contractors', async () => {
      const mockContractors = [
        {
          id: 'contractor-1',
          name: 'Mike Johnson',
          skills: ['Plumbing'],
          rating: 4.8,
          bio: 'Experienced plumber',
        },
      ];

      mockContractorService.getContractors.mockResolvedValue(mockContractors);
      mockContractorService.createMatch.mockResolvedValue({
        id: 'match-123',
        homeownerId: 'homeowner-123',
        contractorId: 'contractor-1',
        action: 'pass',
        status: 'rejected',
      });

      const { getByTestId } = render(
        <TestWrapper screen='discovery' userRole='homeowner' />
      );

      await waitFor(() => {
        expect(getByTestId('contractor-card')).toBeTruthy();
      });

      // Pass on the contractor
      const passButton = getByTestId('pass-button');
      await act(async () => {
        fireEvent.press(passButton);
      });

      // Verify match creation with pass action
      await waitFor(() => {
        expect(mockContractorService.createMatch).toHaveBeenCalledWith({
          homeownerId: 'homeowner-123',
          contractorId: 'contractor-1',
          action: 'pass',
        });
      });

      // Should show no more contractors message
      await waitFor(() => {
        expect(getByTestId('no-more-contractors')).toBeTruthy();
      });
    });
  });

  describe('Matches Management Flow', () => {
    it('should display contractor matches for homeowner', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          contractorName: 'Mike Johnson',
          homeownerName: 'John Doe',
          status: 'mutual',
          contractorId: 'contractor-1',
          homeownerId: 'homeowner-123',
        },
        {
          id: 'match-2',
          contractorName: 'Sarah Wilson',
          homeownerName: 'John Doe',
          status: 'pending',
          contractorId: 'contractor-2',
          homeownerId: 'homeowner-123',
        },
      ];

      mockContractorService.getMatches.mockResolvedValue(mockMatches);
      mockMessagingService.createConversation.mockResolvedValue({
        id: 'conversation-123',
        jobId: 'job-123',
        participants: ['user-123', 'other-user-456'],
      });

      const { getByTestId } = render(
        <TestWrapper screen='matches' userRole='homeowner' />
      );

      // Should load matches
      await waitFor(() => {
        expect(mockContractorService.getMatches).toHaveBeenCalledWith(
          'user-123'
        );
      });

      // Should display matches
      await waitFor(() => {
        expect(getByTestId('matches-screen')).toBeTruthy();
        expect(getByTestId('match-item-0')).toBeTruthy();
        expect(getByTestId('match-item-1')).toBeTruthy();
      });

      // Check match details
      const match1Name = getByTestId('match-name-0');
      const match1Status = getByTestId('match-status-0');
      expect(match1Name.props.children).toBe('Mike Johnson');
      expect(match1Status.props.children).toBe('mutual');

      // Should show chat button for mutual matches
      const chatButton = getByTestId('chat-button-0');
      expect(chatButton).toBeTruthy();

      // Start chat
      await act(async () => {
        fireEvent.press(chatButton);
      });

      // Verify conversation creation
      await waitFor(() => {
        expect(mockMessagingService.createConversation).toHaveBeenCalledWith({
          jobId: 'job-123',
          participants: ['user-123', 'other-user-456'],
        });
      });
    });

    it('should handle empty matches list', async () => {
      mockContractorService.getMatches.mockResolvedValue([]);

      const { getByTestId } = render(
        <TestWrapper screen='matches' userRole='homeowner' />
      );

      await waitFor(() => {
        expect(getByTestId('no-matches')).toBeTruthy();
      });

      const noMatchesMessage = getByTestId('no-matches');
      expect(noMatchesMessage.props.children).toBe('No matches yet');
    });
  });

  describe('Bidding Dashboard Flow', () => {
    it('should display contractor bids dashboard', async () => {
      const mockBids = [
        {
          id: 'bid-1',
          jobId: 'job-1',
          jobTitle: 'Kitchen Faucet Repair',
          amount: 150,
          status: 'accepted',
          description: 'I can fix this quickly',
        },
        {
          id: 'bid-2',
          jobId: 'job-2',
          jobTitle: 'Bathroom Renovation',
          amount: 500,
          status: 'pending',
          description: 'Full bathroom renovation service',
        },
      ];

      mockJobService.getBidsByContractor.mockResolvedValue(mockBids);
      mockJobService.startJob.mockResolvedValue(undefined);
      mockJobService.completeJob.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <TestWrapper screen='bidding' userRole='contractor' />
      );

      // Should load contractor bids
      await waitFor(() => {
        expect(mockJobService.getBidsByContractor).toHaveBeenCalledWith(
          'contractor-123'
        );
      });

      // Should display bids
      await waitFor(() => {
        expect(getByTestId('bidding-dashboard')).toBeTruthy();
        expect(getByTestId('bid-dashboard-item-0')).toBeTruthy();
        expect(getByTestId('bid-dashboard-item-1')).toBeTruthy();
      });

      // Check dashboard title
      const dashboardTitle = getByTestId('dashboard-title');
      expect(dashboardTitle.props.children).toBe('My Bids');

      // Check bid details
      const bid1Title = getByTestId('bid-job-title-0');
      const bid1Amount = getByTestId('bid-amount-0');
      const bid1Status = getByTestId('bid-status-0');

      expect(bid1Title.props.children).toBe('Kitchen Faucet Repair');
      expect(bid1Amount.props.children).toEqual(['$', 150]);
      expect(bid1Status.props.children).toBe('accepted');

      // Should show job action buttons for accepted bids
      const startJobButton = getByTestId('start-job-0');
      const completeJobButton = getByTestId('complete-job-0');
      expect(startJobButton).toBeTruthy();
      expect(completeJobButton).toBeTruthy();

      // Start job
      await act(async () => {
        fireEvent.press(startJobButton);
      });

      // Verify job start
      await waitFor(() => {
        expect(mockJobService.startJob).toHaveBeenCalledWith('job-1');
      });

      // Complete job
      await act(async () => {
        fireEvent.press(completeJobButton);
      });

      // Verify job completion
      await waitFor(() => {
        expect(mockJobService.completeJob).toHaveBeenCalledWith('job-1');
      });
    });

    it('should display homeowner bids dashboard', async () => {
      const mockBids = [
        {
          id: 'bid-1',
          jobId: 'job-123',
          contractorId: 'contractor-1',
          amount: 150,
          status: 'pending',
          description: 'I can fix this quickly',
        },
        {
          id: 'bid-2',
          jobId: 'job-123',
          contractorId: 'contractor-2',
          amount: 200,
          status: 'pending',
          description: 'Professional service',
        },
      ];

      mockJobService.getBidsByJob.mockResolvedValue(mockBids);
      mockJobService.acceptBid.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <TestWrapper screen='bidding' userRole='homeowner' />
      );

      // Should load job bids
      await waitFor(() => {
        expect(mockJobService.getBidsByJob).toHaveBeenCalledWith('job-123');
      });

      // Should display bids
      await waitFor(() => {
        expect(getByTestId('bidding-dashboard')).toBeTruthy();
        expect(getByTestId('bid-dashboard-item-0')).toBeTruthy();
        expect(getByTestId('bid-dashboard-item-1')).toBeTruthy();
      });

      // Check dashboard title
      const dashboardTitle = getByTestId('dashboard-title');
      expect(dashboardTitle.props.children).toBe('Received Bids');

      // Should show accept buttons for pending bids
      const acceptButton1 = getByTestId('accept-bid-dashboard-0');
      const acceptButton2 = getByTestId('accept-bid-dashboard-1');
      expect(acceptButton1).toBeTruthy();
      expect(acceptButton2).toBeTruthy();

      // Accept first bid
      await act(async () => {
        fireEvent.press(acceptButton1);
      });

      // Verify bid acceptance
      await waitFor(() => {
        expect(mockJobService.acceptBid).toHaveBeenCalledWith('bid-1');
      });
    });

    it('should handle empty bids dashboard', async () => {
      mockJobService.getBidsByContractor.mockResolvedValue([]);

      const { getByTestId } = render(
        <TestWrapper screen='bidding' userRole='contractor' />
      );

      await waitFor(() => {
        expect(getByTestId('no-bids')).toBeTruthy();
      });

      const noBidsMessage = getByTestId('no-bids');
      expect(noBidsMessage.props.children).toBe('No bids submitted yet');
    });
  });
});
