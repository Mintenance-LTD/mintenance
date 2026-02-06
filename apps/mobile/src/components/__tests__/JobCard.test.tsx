import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { JobCard } from '../JobCard';
import { Job } from '@mintenance/types';

// Mock theme and utility functions
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      surface: '#FFFFFF',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      textInverse: '#FFFFFF',
      primary: '#007AFF',
      surfaceSecondary: '#F2F2F7',
    },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24 },
    borderRadius: { sm: 4, base: 8, lg: 12 },
    typography: {
      fontSize: { xs: 10, sm: 12, base: 14, lg: 16, xl: 18 },
      fontWeight: { semibold: '600', bold: '700' },
      lineHeight: { normal: 1.5 },
    },
    shadows: { base: {} },
  },
  getStatusColor: jest.fn((status: string) => {
    const colors: Record<string, string> = {
      posted: '#34C759',
      assigned: '#5856D6',
      in_progress: '#FF9500',
      completed: '#007AFF',
      cancelled: '#FF3B30',
    };
    return colors[status] || '#999999';
  }),
  getPriorityColor: jest.fn((priority: string) => {
    const colors: Record<string, string> = {
      high: '#FF3B30',
      medium: '#FF9500',
      low: '#34C759',
    };
    return colors[priority] || '#999999';
  }),
}));

// Helper function to create mock Job objects
const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-123',
  title: 'Fix Leaking Faucet',
  description: 'Kitchen faucet is leaking and needs repair',
  location: '123 Main St',
  homeowner_id: 'homeowner-1',
  status: 'posted',
  budget: 150,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  priority: 'high',
  category: 'Plumbing',
  photos: ['photo1.jpg', 'photo2.jpg'],
  ...overrides,
});

describe('JobCard Component', () => {
  const mockOnPress = jest.fn();
  const mockOnBid = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // Core Rendering Tests (10 tests)
  // ========================================
  describe('Core Rendering', () => {
    it('renders job title correctly', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
    });

    it('renders job description correctly', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Kitchen faucet is leaking and needs repair')).toBeTruthy();
    });

    it('renders job budget correctly', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$150')).toBeTruthy();
    });

    it('card is touchable with TouchableOpacity', () => {
      const job = createMockJob();
      const { getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      const card = getByTestId('job-card');
      expect(card.type).toBe('TouchableOpacity');
    });

    it('applies testID="job-card" to main card', () => {
      const job = createMockJob();
      const { getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByTestId('job-card')).toBeTruthy();
    });

    it('calls onPress handler with job object when card pressed', () => {
      const job = createMockJob();
      const { getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('job-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(job);
    });

    it('renders all core elements together', () => {
      const job = createMockJob();
      const { getByText, getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
      expect(getByText('Kitchen faucet is leaking and needs repair')).toBeTruthy();
      expect(getByText('$150')).toBeTruthy();
      expect(getByTestId('job-card')).toBeTruthy();
    });

    it('title has numberOfLines={2} for truncation', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      const titleElement = getByText('Fix Leaking Faucet');
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('description has numberOfLines={3} for truncation', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      const descElement = getByText('Kitchen faucet is leaking and needs repair');
      expect(descElement.props.numberOfLines).toBe(3);
    });

    it('renders correctly with minimal required props', () => {
      const job = createMockJob({
        category: undefined,
        priority: undefined,
        photos: undefined,
      });
      const { getByText, getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByTestId('job-card')).toBeTruthy();
      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
    });
  });

  // ========================================
  // Budget Formatting Tests (5 tests)
  // ========================================
  describe('Budget Formatting', () => {
    it('formats budget with $ and commas for thousands', () => {
      const job = createMockJob({ budget: 1000 });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$1,000')).toBeTruthy();
    });

    it('rounds budget to nearest integer (1234.56 → $1,235)', () => {
      const job = createMockJob({ budget: 1234.56 });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$1,235')).toBeTruthy();
    });

    it('rounds budget down when < 0.5 (1234.49 → $1,234)', () => {
      const job = createMockJob({ budget: 1234.49 });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$1,234')).toBeTruthy();
    });

    it('handles large budgets correctly ($10,000+)', () => {
      const job = createMockJob({ budget: 12500 });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$12,500')).toBeTruthy();
    });

    it('handles small budgets correctly ($50)', () => {
      const job = createMockJob({ budget: 50 });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$50')).toBeTruthy();
    });
  });

  // ========================================
  // Status & Priority Tests (8 tests)
  // ========================================
  describe('Status Badge', () => {
    it('displays status in uppercase', () => {
      const job = createMockJob({ status: 'posted' });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('POSTED')).toBeTruthy();
    });

    it('applies correct color from getStatusColor for posted status', () => {
      const { getStatusColor } = require('../../theme');
      const job = createMockJob({ status: 'posted' });

      render(<JobCard job={job} onPress={mockOnPress} />);

      expect(getStatusColor).toHaveBeenCalledWith('posted');
    });

    it('applies correct color from getStatusColor for in_progress status', () => {
      const { getStatusColor } = require('../../theme');
      const job = createMockJob({ status: 'in_progress' });

      render(<JobCard job={job} onPress={mockOnPress} />);

      expect(getStatusColor).toHaveBeenCalledWith('in_progress');
    });

    it('applies correct color from getStatusColor for completed status', () => {
      const { getStatusColor } = require('../../theme');
      const job = createMockJob({ status: 'completed' });

      render(<JobCard job={job} onPress={mockOnPress} />);

      expect(getStatusColor).toHaveBeenCalledWith('completed');
    });
  });

  describe('Priority Badge', () => {
    it('displays priority in uppercase with " PRIORITY" suffix', () => {
      const job = createMockJob({ priority: 'high' });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('HIGH PRIORITY')).toBeTruthy();
    });

    it('applies correct color from getPriorityColor for high priority', () => {
      const { getPriorityColor } = require('../../theme');
      const job = createMockJob({ priority: 'high' });

      render(<JobCard job={job} onPress={mockOnPress} />);

      expect(getPriorityColor).toHaveBeenCalledWith('high');
    });

    it('applies correct color from getPriorityColor for medium priority', () => {
      const { getPriorityColor } = require('../../theme');
      const job = createMockJob({ priority: 'medium' });

      render(<JobCard job={job} onPress={mockOnPress} />);

      expect(getPriorityColor).toHaveBeenCalledWith('medium');
    });

    it('priority badge not rendered when priority is undefined', () => {
      const job = createMockJob({ priority: undefined });
      const { queryByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(queryByText(/PRIORITY/)).toBeNull();
    });
  });

  // ========================================
  // Category Tests (3 tests)
  // ========================================
  describe('Category Display', () => {
    it('displays category when present', () => {
      const job = createMockJob({ category: 'Plumbing' });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Plumbing')).toBeTruthy();
    });

    it('does not display category when missing', () => {
      const job = createMockJob({ category: undefined });
      const { queryByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(queryByText('Plumbing')).toBeNull();
    });

    it('displays different category values correctly', () => {
      const job = createMockJob({ category: 'Electrical' });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Electrical')).toBeTruthy();
    });
  });

  // ========================================
  // Photo Indicator Tests (5 tests)
  // ========================================
  describe('Photo Indicator', () => {
    it('shows photo indicator when photos exist', () => {
      const job = createMockJob({ photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'] });
      const { getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByTestId('photo-indicator')).toBeTruthy();
    });

    it('displays correct photo count with camera emoji', () => {
      const job = createMockJob({ photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'] });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('📷 3')).toBeTruthy();
    });

    it('applies testID="photo-indicator" to photo indicator', () => {
      const job = createMockJob({ photos: ['photo1.jpg'] });
      const { getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByTestId('photo-indicator')).toBeTruthy();
    });

    it('hides photo indicator when photos is empty array', () => {
      const job = createMockJob({ photos: [] });
      const { queryByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(queryByTestId('photo-indicator')).toBeNull();
    });

    it('hides photo indicator when photos is undefined', () => {
      const job = createMockJob({ photos: undefined });
      const { queryByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(queryByTestId('photo-indicator')).toBeNull();
    });
  });

  // ========================================
  // Bid Button Tests (6 tests)
  // ========================================
  describe('Bid Button', () => {
    it('shows bid button when showBidButton=true and onBid provided', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={true}
        />
      );

      expect(getByText('Place Bid')).toBeTruthy();
    });

    it('hides bid button when showBidButton=false', () => {
      const job = createMockJob();
      const { queryByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={false}
        />
      );

      expect(queryByText('Place Bid')).toBeNull();
    });

    it('hides bid button when onBid not provided', () => {
      const job = createMockJob();
      const { queryByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          showBidButton={true}
        />
      );

      expect(queryByText('Place Bid')).toBeNull();
    });

    it('calls onBid with job object when bid button pressed', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={true}
        />
      );

      fireEvent.press(getByText('Place Bid'));
      expect(mockOnBid).toHaveBeenCalledTimes(1);
      expect(mockOnBid).toHaveBeenCalledWith(job);
    });

    it('bid button press does not trigger onPress', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={true}
        />
      );

      fireEvent.press(getByText('Place Bid'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('bid button text is exactly "Place Bid"', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={true}
        />
      );

      expect(getByText('Place Bid')).toBeTruthy();
    });
  });

  // ========================================
  // Edge Cases Tests (5 tests)
  // ========================================
  describe('Edge Cases', () => {
    it('handles long title with numberOfLines={2}', () => {
      const longTitle = 'This is a very long job title that should be truncated to two lines maximum when displayed in the card component';
      const job = createMockJob({ title: longTitle });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      const titleElement = getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('handles long description with numberOfLines={3}', () => {
      const longDescription = 'This is a very long description that contains a lot of details about the job and should be truncated to exactly three lines when displayed in the card to maintain consistent layout and prevent overflow issues';
      const job = createMockJob({ description: longDescription });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      const descElement = getByText(longDescription);
      expect(descElement.props.numberOfLines).toBe(3);
    });

    it('renders correctly when category field is missing', () => {
      const job = createMockJob({ category: undefined });
      const { getByText, queryByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
      expect(queryByText('Plumbing')).toBeNull();
    });

    it('renders correctly when priority field is missing', () => {
      const job = createMockJob({ priority: undefined });
      const { getByText, queryByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
      expect(queryByText(/PRIORITY/)).toBeNull();
    });

    it('renders correctly with all optional fields missing', () => {
      const job = createMockJob({
        category: undefined,
        priority: undefined,
        photos: undefined,
      });
      const { getByText, queryByText, queryByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      // Core content should render
      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
      expect(getByText('Kitchen faucet is leaking and needs repair')).toBeTruthy();
      expect(getByText('$150')).toBeTruthy();
      expect(getByText('POSTED')).toBeTruthy();

      // Optional content should not render
      expect(queryByText('Plumbing')).toBeNull();
      expect(queryByText(/PRIORITY/)).toBeNull();
      expect(queryByTestId('photo-indicator')).toBeNull();
    });
  });

  // ========================================
  // Integration Tests (Additional coverage)
  // ========================================
  describe('Integration Tests', () => {
    it('renders complete job card with all features', () => {
      const job = createMockJob();
      const { getByText, getByTestId } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={true}
        />
      );

      // Verify all elements present
      expect(getByText('Fix Leaking Faucet')).toBeTruthy();
      expect(getByText('Kitchen faucet is leaking and needs repair')).toBeTruthy();
      expect(getByText('$150')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('HIGH PRIORITY')).toBeTruthy();
      expect(getByText('POSTED')).toBeTruthy();
      expect(getByTestId('photo-indicator')).toBeTruthy();
      expect(getByText('📷 2')).toBeTruthy();
      expect(getByText('Place Bid')).toBeTruthy();
    });

    it('handles multiple status values correctly', () => {
      const statuses: ('posted' | 'assigned' | 'in_progress' | 'completed')[] = [
        'posted',
        'assigned',
        'in_progress',
        'completed',
      ];

      statuses.forEach((status) => {
        const job = createMockJob({ status });
        const { getByText } = render(
          <JobCard job={job} onPress={mockOnPress} />
        );
        expect(getByText(status.toUpperCase())).toBeTruthy();
      });
    });

    it('handles multiple priority values correctly', () => {
      const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];

      priorities.forEach((priority) => {
        const job = createMockJob({ priority });
        const { getByText } = render(
          <JobCard job={job} onPress={mockOnPress} />
        );
        expect(getByText(`${priority.toUpperCase()} PRIORITY`)).toBeTruthy();
      });
    });

    it('can be pressed multiple times', () => {
      const job = createMockJob();
      const { getByTestId } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      const card = getByTestId('job-card');
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('bid button can be pressed multiple times', () => {
      const job = createMockJob();
      const { getByText } = render(
        <JobCard
          job={job}
          onPress={mockOnPress}
          onBid={mockOnBid}
          showBidButton={true}
        />
      );

      const bidButton = getByText('Place Bid');
      fireEvent.press(bidButton);
      fireEvent.press(bidButton);

      expect(mockOnBid).toHaveBeenCalledTimes(2);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('handles zero budget correctly', () => {
      const job = createMockJob({ budget: 0 });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('$0')).toBeTruthy();
    });

    it('handles single photo correctly', () => {
      const job = createMockJob({ photos: ['single-photo.jpg'] });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('📷 1')).toBeTruthy();
    });

    it('handles very large photo count', () => {
      const manyPhotos = Array(100).fill('photo.jpg');
      const job = createMockJob({ photos: manyPhotos });
      const { getByText } = render(
        <JobCard job={job} onPress={mockOnPress} />
      );

      expect(getByText('📷 100')).toBeTruthy();
    });
  });

  // ========================================
  // Props Validation Tests
  // ========================================
  describe('Props Validation', () => {
    it('accepts valid job object', () => {
      const job = createMockJob();
      expect(() => {
        render(<JobCard job={job} onPress={mockOnPress} />);
      }).not.toThrow();
    });

    it('showBidButton defaults to false', () => {
      const job = createMockJob();
      const { queryByText } = render(
        <JobCard job={job} onPress={mockOnPress} onBid={mockOnBid} />
      );

      // Without explicit showBidButton prop, should default to false
      expect(queryByText('Place Bid')).toBeNull();
    });

    it('different jobs render independently', () => {
      const job1 = createMockJob({ id: 'job-1', title: 'Job 1' });
      const job2 = createMockJob({ id: 'job-2', title: 'Job 2' });

      const { rerender, getByText } = render(
        <JobCard job={job1} onPress={mockOnPress} />
      );

      expect(getByText('Job 1')).toBeTruthy();

      rerender(<JobCard job={job2} onPress={mockOnPress} />);

      expect(getByText('Job 2')).toBeTruthy();
    });
  });
});
