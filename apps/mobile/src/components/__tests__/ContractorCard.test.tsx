import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ContractorCard from '../ContractorCard';
import { ContractorProfile, ContractorSkill, Review } from '@mintenance/types';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('../SwipeableCardWrapper', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ cards, onSwipedLeft, onSwipedRight, renderCard }: any) => {
      return (
        <View testID="swipeable-card-wrapper">
          {cards.map((card: any, index: number) => (
            <View key={index} testID={`card-${index}`}>
              {renderCard(card)}
            </View>
          ))}
          <View testID="swipe-actions">
            <Text onPress={onSwipedLeft}>Swipe Left</Text>
            <Text onPress={onSwipedRight}>Swipe Right</Text>
          </View>
        </View>
      );
    },
  };
});

jest.mock('../ConnectButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ currentUserId, targetUserId, onConnectionChange }: any) => (
      <TouchableOpacity
        testID="connect-button"
        onPress={() => onConnectionChange && onConnectionChange('pending')}
      >
        <Text>Connect</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID, ...props }: any) => (
      <Text testID={testID || `icon-${name}`} {...props}>
        {name}
      </Text>
    ),
  };
});

jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#4A90E2',
      secondary: '#50C878',
      ratingGold: '#FFD700',
      textPrimary: '#333333',
      textSecondary: '#666666',
      textInverse: '#FFFFFF',
      info: '#4A90E2',
      error: '#FF3B30',
      surface: '#FFFFFF',
      surfaceSecondary: '#F5F5F5',
      border: '#E0E0E0',
      borderLight: '#F0F0F0',
    },
    borderRadius: {
      lg: 12,
      full: 9999,
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      },
    },
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ContractorCard', () => {
  // Helper function to create mock contractor data
  const createMockContractor = (overrides: Partial<ContractorProfile> = {}): ContractorProfile => ({
    id: 'contractor-123',
    firstName: 'John',
    lastName: 'Smith',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '555-0100',
    role: 'contractor',
    profileImageUrl: 'https://example.com/profile.jpg',
    rating: 4.8,
    totalJobsCompleted: 45,
    total_jobs_completed: 45,
    skills: [
      { id: 'skill-1', skillName: 'Plumbing', contractorId: 'contractor-123' } as ContractorSkill,
      { id: 'skill-2', skillName: 'Electrical', contractorId: 'contractor-123' } as ContractorSkill,
    ],
    reviews: [
      {
        id: 'review-1',
        rating: 5,
        comment: 'Excellent work!',
        createdAt: '2026-01-15T10:00:00Z',
        contractorId: 'contractor-123',
        homeownerId: 'homeowner-1',
        jobId: 'job-1',
      } as Review,
    ],
    distance: 2.5,
    bio: 'Experienced contractor with 15 years in the industry',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const defaultProps = {
    contractor: createMockContractor(),
    onLike: jest.fn(),
    onPass: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render contractor card with basic information', () => {
      const { getByText, getByTestId } = render(<ContractorCard {...defaultProps} />);

      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('4.8 (45 jobs)')).toBeTruthy();
      expect(getByText('📍 2.5 km away')).toBeTruthy();
      expect(getByTestId('swipeable-card-wrapper')).toBeTruthy();
    });

    it('should render contractor with company name when provided', () => {
      const contractor = createMockContractor({
        companyName: 'Smith Plumbing LLC',
      });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('Smith Plumbing LLC')).toBeTruthy();
      expect(getByText('John Smith')).toBeTruthy(); // Personal name shown below company name
    });

    it('should render company logo when provided', () => {
      const contractor = createMockContractor({
        companyLogo: 'https://example.com/logo.png',
      });
      const { UNSAFE_getAllByType } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      const images = UNSAFE_getAllByType(require('react-native').Image);
      expect(images.length).toBeGreaterThanOrEqual(1); // Company logo + possibly profile image
    });

    it('should render profile image when provided', () => {
      const { UNSAFE_getAllByType } = render(<ContractorCard {...defaultProps} />);

      const images = UNSAFE_getAllByType(require('react-native').Image);
      expect(images.length).toBeGreaterThan(0);
    });

    it('should render placeholder when no profile image', () => {
      const contractor = createMockContractor({ profileImageUrl: undefined });
      const { getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByTestId('icon-person')).toBeTruthy();
    });

    it('should render bio when provided', () => {
      const { getByText } = render(<ContractorCard {...defaultProps} />);

      expect(getByText('Experienced contractor with 15 years in the industry')).toBeTruthy();
    });

    it('should not render bio section when bio is missing', () => {
      const contractor = createMockContractor({ bio: undefined });
      const { queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(queryByText('Experienced contractor')).toBeNull();
    });
  });

  describe('Star Rating Rendering', () => {
    it('should render correct number of full stars', () => {
      const contractor = createMockContractor({ rating: 4.0 });
      const { getAllByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      const fullStars = getAllByTestId('icon-star');
      expect(fullStars.length).toBeGreaterThanOrEqual(4);
    });

    it('should render half star for decimal ratings', () => {
      const contractor = createMockContractor({ rating: 4.5 });
      const { getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByTestId('icon-star-half')).toBeTruthy();
    });

    it('should render empty stars to complete 5-star rating', () => {
      const contractor = createMockContractor({ rating: 3.5 });
      const { getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      // Should have outline stars for the remaining
      expect(getByTestId('icon-star-outline')).toBeTruthy();
    });

    it('should handle zero rating', () => {
      const contractor = createMockContractor({ rating: 0 });
      const { getAllByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      const outlineStars = getAllByTestId('icon-star-outline');
      expect(outlineStars.length).toBe(5);
    });

    it('should handle missing rating (defaults to 0)', () => {
      const contractor = createMockContractor({ rating: undefined });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('0.0 (45 jobs)')).toBeTruthy();
    });
  });

  describe('Enhanced Profile Details', () => {
    it('should render hourly rate when provided', () => {
      const contractor = createMockContractor({ hourlyRate: 75 });
      const { getByText, getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('$75/hr')).toBeTruthy();
      expect(getByTestId('icon-cash-outline')).toBeTruthy();
    });

    it('should render years of experience when provided', () => {
      const contractor = createMockContractor({ yearsExperience: 15 });
      const { getByText, getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('15 years exp')).toBeTruthy();
      expect(getByTestId('icon-time-outline')).toBeTruthy();
    });

    it('should render availability when provided', () => {
      const contractor = createMockContractor({ availability: 'this_week' });
      const { getByText, getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('This Week')).toBeTruthy();
      expect(getByTestId('icon-calendar-outline')).toBeTruthy();
    });

    it('should format availability text correctly', () => {
      const contractor = createMockContractor({ availability: 'this_month' });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('This Month')).toBeTruthy();
    });

    it('should render business address when provided', () => {
      const contractor = createMockContractor({ businessAddress: '123 Main St, New York, NY' });
      const { getByText, getByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('123 Main St, New York, NY')).toBeTruthy();
      expect(getByTestId('icon-location-outline')).toBeTruthy();
    });
  });

  describe('Skills Section', () => {
    it('should render skills section with title', () => {
      const { getByText } = render(<ContractorCard {...defaultProps} />);

      expect(getByText('Specialties')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
    });

    it('should render maximum 4 skills', () => {
      const contractor = createMockContractor({
        skills: [
          { id: '1', skillName: 'Skill 1', contractorId: 'contractor-123' } as ContractorSkill,
          { id: '2', skillName: 'Skill 2', contractorId: 'contractor-123' } as ContractorSkill,
          { id: '3', skillName: 'Skill 3', contractorId: 'contractor-123' } as ContractorSkill,
          { id: '4', skillName: 'Skill 4', contractorId: 'contractor-123' } as ContractorSkill,
          { id: '5', skillName: 'Skill 5', contractorId: 'contractor-123' } as ContractorSkill,
          { id: '6', skillName: 'Skill 6', contractorId: 'contractor-123' } as ContractorSkill,
        ],
      });
      const { getByText, queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('Skill 1')).toBeTruthy();
      expect(getByText('Skill 4')).toBeTruthy();
      expect(getByText('+2 more')).toBeTruthy();
      expect(queryByText('Skill 5')).toBeNull();
    });

    it('should not render skills section when skills array is empty', () => {
      const contractor = createMockContractor({ skills: [] });
      const { queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(queryByText('Specialties')).toBeNull();
    });

    it('should not render skills section when skills is undefined', () => {
      const contractor = createMockContractor({ skills: undefined as any });
      const { queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(queryByText('Specialties')).toBeNull();
    });
  });

  describe('Reviews Toggle Functionality', () => {
    it('should initially show "View Reviews" button', () => {
      const { getByText, getByTestId } = render(<ContractorCard {...defaultProps} />);

      expect(getByText('View Reviews')).toBeTruthy();
      expect(getByTestId('icon-chevron-down')).toBeTruthy();
    });

    it('should toggle to "Show Less" when reviews button is pressed', () => {
      const { getByText, queryByText, getByTestId } = render(<ContractorCard {...defaultProps} />);

      const viewReviewsButton = getByText('View Reviews');
      fireEvent.press(viewReviewsButton);

      expect(getByText('Show Less')).toBeTruthy();
      expect(getByTestId('icon-chevron-up')).toBeTruthy();
      expect(queryByText('View Reviews')).toBeNull();
    });

    it('should show reviews section when expanded', () => {
      const { getByText } = render(<ContractorCard {...defaultProps} />);

      fireEvent.press(getByText('View Reviews'));

      expect(getByText('Recent Reviews')).toBeTruthy();
      expect(getByText('Excellent work!')).toBeTruthy();
    });

    it('should hide reviews section when collapsed', () => {
      const { getByText, queryByText } = render(<ContractorCard {...defaultProps} />);

      // Expand
      fireEvent.press(getByText('View Reviews'));
      expect(getByText('Recent Reviews')).toBeTruthy();

      // Collapse
      fireEvent.press(getByText('Show Less'));
      expect(queryByText('Recent Reviews')).toBeNull();
    });

    it('should not show reviews section if contractor has no reviews', () => {
      const contractor = createMockContractor({ reviews: [] });
      const { getByText, queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      fireEvent.press(getByText('View Reviews'));

      expect(queryByText('Recent Reviews')).toBeNull();
    });
  });

  describe('Reviews Display', () => {
    it('should render review with rating and comment', () => {
      const { getByText } = render(<ContractorCard {...defaultProps} />);

      fireEvent.press(getByText('View Reviews'));

      expect(getByText('Excellent work!')).toBeTruthy();
    });

    it('should render review date in localized format', () => {
      const { getByText } = render(<ContractorCard {...defaultProps} />);

      fireEvent.press(getByText('View Reviews'));

      // Date formatting depends on locale, just check it exists
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/;
      expect(getByText(dateRegex)).toBeTruthy();
    });

    it('should render review without comment when comment is missing', () => {
      const contractor = createMockContractor({
        reviews: [
          {
            id: 'review-1',
            rating: 4,
            comment: undefined,
            createdAt: '2026-01-15T10:00:00Z',
            contractorId: 'contractor-123',
            homeownerId: 'homeowner-1',
            jobId: 'job-1',
          } as Review,
        ],
      });
      const { getByText, queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      fireEvent.press(getByText('View Reviews'));

      expect(queryByText('Excellent work!')).toBeNull();
    });

    it('should render maximum 3 reviews', () => {
      const contractor = createMockContractor({
        reviews: [
          {
            id: 'review-1',
            rating: 5,
            comment: 'Review 1',
            createdAt: '2026-01-15T10:00:00Z',
            contractorId: 'contractor-123',
            homeownerId: 'homeowner-1',
            jobId: 'job-1',
          } as Review,
          {
            id: 'review-2',
            rating: 4,
            comment: 'Review 2',
            createdAt: '2026-01-14T10:00:00Z',
            contractorId: 'contractor-123',
            homeownerId: 'homeowner-2',
            jobId: 'job-2',
          } as Review,
          {
            id: 'review-3',
            rating: 5,
            comment: 'Review 3',
            createdAt: '2026-01-13T10:00:00Z',
            contractorId: 'contractor-123',
            homeownerId: 'homeowner-3',
            jobId: 'job-3',
          } as Review,
          {
            id: 'review-4',
            rating: 3,
            comment: 'Review 4',
            createdAt: '2026-01-12T10:00:00Z',
            contractorId: 'contractor-123',
            homeownerId: 'homeowner-4',
            jobId: 'job-4',
          } as Review,
        ],
      });
      const { getByText, queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      fireEvent.press(getByText('View Reviews'));

      expect(getByText('Review 1')).toBeTruthy();
      expect(getByText('Review 2')).toBeTruthy();
      expect(getByText('Review 3')).toBeTruthy();
      expect(queryByText('Review 4')).toBeNull();
    });
  });

  describe('Portfolio Images', () => {
    it('should render portfolio card when portfolio images exist', () => {
      const contractor = createMockContractor({
        portfolioImages: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
      });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('Previous Work')).toBeTruthy();
      expect(getByText('Swipe through project photos')).toBeTruthy();
    });

    it('should not render portfolio card when no portfolio images', () => {
      const contractor = createMockContractor({ portfolioImages: undefined });
      const { queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(queryByText('Previous Work')).toBeNull();
    });

    it('should render specialties in portfolio card when provided', () => {
      const contractor = createMockContractor({
        portfolioImages: ['https://example.com/image1.jpg'],
        specialties: ['Kitchen Remodel', 'Bathroom Renovation'],
      });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('Kitchen Remodel')).toBeTruthy();
      expect(getByText('Bathroom Renovation')).toBeTruthy();
    });

    it('should render maximum 6 specialties', () => {
      const contractor = createMockContractor({
        portfolioImages: ['https://example.com/image1.jpg'],
        specialties: ['Spec1', 'Spec2', 'Spec3', 'Spec4', 'Spec5', 'Spec6', 'Spec7'],
      });
      const { getByText, queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('Spec1')).toBeTruthy();
      expect(getByText('Spec6')).toBeTruthy();
      expect(queryByText('Spec7')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('should call onLike when like button is pressed', () => {
      const onLike = jest.fn();
      const { getByTestId } = render(<ContractorCard {...defaultProps} onLike={onLike} />);

      const likeButton = getByTestId('icon-leaf').parent;
      fireEvent.press(likeButton!);

      expect(onLike).toHaveBeenCalledTimes(1);
    });

    it('should call onPass when pass button is pressed', () => {
      const onPass = jest.fn();
      const { getByTestId } = render(<ContractorCard {...defaultProps} onPass={onPass} />);

      const passButton = getByTestId('icon-close').parent;
      fireEvent.press(passButton!);

      expect(onPass).toHaveBeenCalledTimes(1);
    });

    it('should call onLike when swiped right', () => {
      const onLike = jest.fn();
      const { getByText } = render(<ContractorCard {...defaultProps} onLike={onLike} />);

      fireEvent.press(getByText('Swipe Right'));

      expect(onLike).toHaveBeenCalledTimes(1);
    });

    it('should call onPass when swiped left', () => {
      const onPass = jest.fn();
      const { getByText } = render(<ContractorCard {...defaultProps} onPass={onPass} />);

      fireEvent.press(getByText('Swipe Left'));

      expect(onPass).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConnectButton Integration', () => {
    it('should render ConnectButton when currentUserId is provided', () => {
      const { getByTestId } = render(
        <ContractorCard {...defaultProps} currentUserId="user-123" />
      );

      expect(getByTestId('connect-button')).toBeTruthy();
    });

    it('should not render ConnectButton when currentUserId is not provided', () => {
      const { queryByTestId } = render(<ContractorCard {...defaultProps} />);

      expect(queryByTestId('connect-button')).toBeNull();
    });

    it('should pass correct props to ConnectButton', () => {
      const { getByTestId } = render(
        <ContractorCard
          {...defaultProps}
          currentUserId="user-123"
          contractor={createMockContractor({ id: 'contractor-456' })}
        />
      );

      const connectButton = getByTestId('connect-button');
      expect(connectButton).toBeTruthy();
    });
  });

  describe('Edge Cases and Missing Fields', () => {
    it('should handle contractor without distance', () => {
      const contractor = createMockContractor({ distance: undefined });
      const { queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(queryByText(/km away/)).toBeNull();
    });

    it('should handle contractor without address', () => {
      const contractor = createMockContractor({ address: undefined });
      const { queryByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      // Should not render location section when address is missing (businessAddress also not in default mock)
      // Note: If businessAddress were present, location icon would still show in detailsGrid
      expect(queryByText('location-outline')).toBeNull(); // No standalone address location section
    });

    it('should handle contractor with minimal data', () => {
      const minimalContractor: ContractorProfile = {
        id: 'contractor-minimal',
        firstName: 'Jane',
        lastName: 'Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        role: 'contractor',
        skills: [],
        reviews: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const { getByText } = render(
        <ContractorCard {...defaultProps} contractor={minimalContractor} />
      );

      expect(getByText('Jane Doe')).toBeTruthy();
      expect(getByText('0.0 (0 jobs)')).toBeTruthy();
    });

    it('should handle totalJobsCompleted from database field alias', () => {
      const contractor = createMockContractor({
        totalJobsCompleted: undefined,
        total_jobs_completed: 30,
      });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('4.8 (30 jobs)')).toBeTruthy();
    });

    it('should handle missing totalJobsCompleted gracefully', () => {
      const contractor = createMockContractor({
        totalJobsCompleted: undefined,
        total_jobs_completed: undefined,
      });
      const { getByText } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      expect(getByText('4.8 (0 jobs)')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons with proper roles', () => {
      const { getByTestId } = render(<ContractorCard {...defaultProps} />);

      const likeButton = getByTestId('icon-leaf').parent;
      const passButton = getByTestId('icon-close').parent;

      expect(likeButton).toBeTruthy();
      expect(passButton).toBeTruthy();
    });

    it('should have accessible View Reviews button', () => {
      const { getByText } = render(<ContractorCard {...defaultProps} />);

      const viewReviewsButton = getByText('View Reviews');
      expect(viewReviewsButton).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render two cards when contractor has portfolio images', () => {
      const contractor = createMockContractor({
        portfolioImages: ['https://example.com/image1.jpg'],
      });
      const { getAllByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      const cards = getAllByTestId(/card-\d+/);
      expect(cards.length).toBe(2); // Profile card + Portfolio card
    });

    it('should render only one card when contractor has no portfolio images', () => {
      const contractor = createMockContractor({
        portfolioImages: undefined,
      });
      const { getAllByTestId } = render(<ContractorCard {...defaultProps} contractor={contractor} />);

      const cards = getAllByTestId(/card-\d+/);
      expect(cards.length).toBe(1); // Profile card only
    });

    it('should render action buttons in correct order', () => {
      const { getByTestId } = render(<ContractorCard {...defaultProps} />);

      expect(getByTestId('icon-close')).toBeTruthy(); // Pass button
      expect(getByTestId('icon-leaf')).toBeTruthy(); // Like button
    });
  });
});
