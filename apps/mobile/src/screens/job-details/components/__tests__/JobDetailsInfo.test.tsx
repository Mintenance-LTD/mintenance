/**
 * JobDetailsInfo Component Tests
 *
 * Comprehensive test suite for JobDetailsInfo component
 * Target: 100% coverage with deterministic tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { JobDetailsInfo } from '../JobDetailsInfo';
import type { Job } from '@mintenance/types';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Deterministic date for consistent testing
const FIXED_DATE = '2024-01-15T10:30:00.000Z';
const FIXED_DATE_FORMATTED = 'January 15, 2024';

describe('JobDetailsInfo Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== RENDERING TESTS ====================

  describe('Rendering', () => {
    it('should render without crashing with complete job data', () => {
      const mockJob: Job = {
        id: 'job-1',
        title: 'Kitchen Renovation',
        description: 'Full kitchen remodel',
        location: '123 Main Street, New York, NY 10001',
        homeowner_id: 'user-1',
        status: 'posted',
        budget: 5000,
        budget_min: 4000,
        budget_max: 6000,
        timeline: '2-3 weeks',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Job Details')).toBeTruthy();
    });

    it('should render with minimal job data', () => {
      const mockJob: Job = {
        id: 'job-2',
        title: 'Simple Fix',
        description: 'Quick repair',
        location: 'Unknown',
        homeowner_id: 'user-2',
        status: 'posted',
        budget: 100,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Job Details')).toBeTruthy();
    });

    it('should render all section labels correctly', () => {
      const mockJob: Job = {
        id: 'job-3',
        title: 'Test Job',
        description: 'Test description',
        location: 'Test Location',
        homeowner_id: 'user-3',
        status: 'posted',
        budget: 1000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Location')).toBeTruthy();
      expect(getByText('Budget Range')).toBeTruthy();
      expect(getByText('Timeline')).toBeTruthy();
      expect(getByText('Created')).toBeTruthy();
    });
  });

  // ==================== LOCATION TESTS ====================

  describe('Location Display', () => {
    it('should display location when provided', () => {
      const mockJob: Job = {
        id: 'job-4',
        title: 'Test',
        description: 'Test',
        location: '456 Oak Avenue, Los Angeles, CA 90001',
        homeowner_id: 'user-4',
        status: 'posted',
        budget: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('456 Oak Avenue, Los Angeles, CA 90001')).toBeTruthy();
    });

    it('should display "Not specified" when location is empty string', () => {
      const mockJob: Job = {
        id: 'job-5',
        title: 'Test',
        description: 'Test',
        location: '',
        homeowner_id: 'user-5',
        status: 'posted',
        budget: 1500,
        budget_min: 1000,
        budget_max: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getAllByText } = render(<JobDetailsInfo job={mockJob} />);

      // "Not specified" should appear for empty location
      const notSpecifiedElements = getAllByText('Not specified');
      expect(notSpecifiedElements.length).toBeGreaterThan(0);
    });

    it('should handle very long location addresses', () => {
      const longLocation = '1234 Very Long Street Name Avenue Boulevard, Apartment 567, Building C, New York City, New York State, United States of America 10001-5678';

      const mockJob: Job = {
        id: 'job-6',
        title: 'Test',
        description: 'Test',
        location: longLocation,
        homeowner_id: 'user-6',
        status: 'posted',
        budget: 3000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText(longLocation)).toBeTruthy();
    });

    it('should handle location with special characters', () => {
      const specialLocation = "123 O'Brien St., Apt #4-B, São Paulo, Brazil";

      const mockJob: Job = {
        id: 'job-7',
        title: 'Test',
        description: 'Test',
        location: specialLocation,
        homeowner_id: 'user-7',
        status: 'posted',
        budget: 2500,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText(specialLocation)).toBeTruthy();
    });
  });

  // ==================== BUDGET TESTS ====================

  describe('Budget Display', () => {
    it('should display budget range when both min and max are provided', () => {
      const mockJob: Job = {
        id: 'job-8',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-8',
        status: 'posted',
        budget: 5000,
        budget_min: 4000,
        budget_max: 6000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$4,000.00 - $6,000.00')).toBeTruthy();
    });

    it('should display "Not specified" when budget_min is missing', () => {
      const mockJob: Job = {
        id: 'job-9',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-9',
        status: 'posted',
        budget: 5000,
        budget_max: 6000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should display "Not specified" when budget_max is missing', () => {
      const mockJob: Job = {
        id: 'job-10',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-10',
        status: 'posted',
        budget: 5000,
        budget_min: 4000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should display "Not specified" when both budget_min and budget_max are missing', () => {
      const mockJob: Job = {
        id: 'job-11',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-11',
        status: 'posted',
        budget: 5000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should format small budget amounts correctly', () => {
      const mockJob: Job = {
        id: 'job-12',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-12',
        status: 'posted',
        budget: 50,
        budget_min: 25,
        budget_max: 75,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$25.00 - $75.00')).toBeTruthy();
    });

    it('should format large budget amounts correctly', () => {
      const mockJob: Job = {
        id: 'job-13',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-13',
        status: 'posted',
        budget: 50000,
        budget_min: 45000,
        budget_max: 55000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$45,000.00 - $55,000.00')).toBeTruthy();
    });

    it('should format very large budget amounts with proper separators', () => {
      const mockJob: Job = {
        id: 'job-14',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-14',
        status: 'posted',
        budget: 1000000,
        budget_min: 950000,
        budget_max: 1050000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$950,000.00 - $1,050,000.00')).toBeTruthy();
    });

    it('should format decimal budget amounts correctly', () => {
      const mockJob: Job = {
        id: 'job-15',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-15',
        status: 'posted',
        budget: 1234.56,
        budget_min: 1000.50,
        budget_max: 1500.75,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$1,000.50 - $1,500.75')).toBeTruthy();
    });

    it('should handle zero budget amounts', () => {
      const mockJob: Job = {
        id: 'job-16',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-16',
        status: 'posted',
        budget: 0,
        budget_min: 0,
        budget_max: 0,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // Zero is treated as falsy by the component logic, so "Not specified" is shown
      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should handle budget range where min equals max', () => {
      const mockJob: Job = {
        id: 'job-17',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-17',
        status: 'posted',
        budget: 3000,
        budget_min: 3000,
        budget_max: 3000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$3,000.00 - $3,000.00')).toBeTruthy();
    });

    it('should handle budget_min of 0 and budget_max with value', () => {
      const mockJob: Job = {
        id: 'job-18',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-18',
        status: 'posted',
        budget: 2500,
        budget_min: 0,
        budget_max: 5000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // Zero budget_min is treated as falsy, so "Not specified" is shown
      expect(getByText('Not specified')).toBeTruthy();
    });
  });

  // ==================== TIMELINE TESTS ====================

  describe('Timeline Display', () => {
    it('should display timeline when provided', () => {
      const mockJob: Job = {
        id: 'job-19',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-19',
        status: 'posted',
        budget: 2000,
        timeline: '2-3 weeks',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('2-3 weeks')).toBeTruthy();
    });

    it('should display "Flexible" when timeline is not provided', () => {
      const mockJob: Job = {
        id: 'job-20',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-20',
        status: 'posted',
        budget: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Flexible')).toBeTruthy();
    });

    it('should display "Flexible" when timeline is empty string', () => {
      const mockJob: Job = {
        id: 'job-21',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-21',
        status: 'posted',
        budget: 2000,
        timeline: '',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Flexible')).toBeTruthy();
    });

    it('should handle timeline with "ASAP"', () => {
      const mockJob: Job = {
        id: 'job-22',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-22',
        status: 'posted',
        budget: 2000,
        timeline: 'ASAP',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('ASAP')).toBeTruthy();
    });

    it('should handle timeline with specific dates', () => {
      const mockJob: Job = {
        id: 'job-23',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-23',
        status: 'posted',
        budget: 2000,
        timeline: 'March 1 - March 15, 2024',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('March 1 - March 15, 2024')).toBeTruthy();
    });

    it('should handle timeline with long description', () => {
      const longTimeline = 'Flexible schedule, can work around homeowner availability, prefer weekdays between 9 AM and 5 PM';

      const mockJob: Job = {
        id: 'job-24',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-24',
        status: 'posted',
        budget: 2000,
        timeline: longTimeline,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText(longTimeline)).toBeTruthy();
    });
  });

  // ==================== DATE FORMATTING TESTS ====================

  describe('Created Date Display', () => {
    it('should format created_at date correctly', () => {
      const mockJob: Job = {
        id: 'job-25',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-25',
        status: 'posted',
        budget: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText(FIXED_DATE_FORMATTED)).toBeTruthy();
    });

    it('should format different date correctly - early year', () => {
      const earlyDate = '2024-01-01T00:00:00.000Z';

      const mockJob: Job = {
        id: 'job-26',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-26',
        status: 'posted',
        budget: 2000,
        created_at: earlyDate,
        updated_at: earlyDate,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('January 1, 2024')).toBeTruthy();
    });

    it('should format different date correctly - mid year', () => {
      const midDate = '2024-06-15T12:00:00.000Z';

      const mockJob: Job = {
        id: 'job-27',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-27',
        status: 'posted',
        budget: 2000,
        created_at: midDate,
        updated_at: midDate,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('June 15, 2024')).toBeTruthy();
    });

    it('should format different date correctly - end of year', () => {
      const endDate = '2024-12-31T23:59:59.999Z';

      const mockJob: Job = {
        id: 'job-28',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-28',
        status: 'posted',
        budget: 2000,
        created_at: endDate,
        updated_at: endDate,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('December 31, 2024')).toBeTruthy();
    });

    it('should handle date from different year', () => {
      const pastDate = '2023-03-20T10:30:00.000Z';

      const mockJob: Job = {
        id: 'job-29',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-29',
        status: 'posted',
        budget: 2000,
        created_at: pastDate,
        updated_at: pastDate,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('March 20, 2023')).toBeTruthy();
    });

    it('should handle date from future year', () => {
      const futureDate = '2025-08-10T14:20:00.000Z';

      const mockJob: Job = {
        id: 'job-30',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-30',
        status: 'posted',
        budget: 2000,
        created_at: futureDate,
        updated_at: futureDate,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('August 10, 2025')).toBeTruthy();
    });
  });

  // ==================== ICON RENDERING TESTS ====================

  describe('Icon Rendering', () => {
    it('should render location icon', () => {
      const mockJob: Job = {
        id: 'job-31',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-31',
        status: 'posted',
        budget: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { UNSAFE_getAllByType } = render(<JobDetailsInfo job={mockJob} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);

      // Should have 4 icons (location, cash, calendar, time)
      expect(icons).toHaveLength(4);
    });

    it('should render all four icons for info items', () => {
      const mockJob: Job = {
        id: 'job-32',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-32',
        status: 'posted',
        budget: 2000,
        budget_min: 1500,
        budget_max: 2500,
        timeline: '1 week',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { UNSAFE_getAllByType } = render(<JobDetailsInfo job={mockJob} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);

      expect(icons).toHaveLength(4);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle null values gracefully', () => {
      const mockJob: Job = {
        id: 'job-33',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-33',
        status: 'posted',
        budget: 2000,
        budget_min: null as any,
        budget_max: null as any,
        timeline: null as any,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('Not specified')).toBeTruthy();
      expect(getByText('Flexible')).toBeTruthy();
    });

    it('should handle undefined budget range values', () => {
      const mockJob: Job = {
        id: 'job-34',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-34',
        status: 'posted',
        budget: 2000,
        budget_min: undefined,
        budget_max: undefined,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should handle negative budget values', () => {
      const mockJob: Job = {
        id: 'job-35',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-35',
        status: 'posted',
        budget: -1000,
        budget_min: -1500,
        budget_max: -500,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // Negative values are truthy, so they should be formatted and displayed
      expect(getByText('-$1,500.00 - -$500.00')).toBeTruthy();
    });

    it('should handle very small decimal budget values', () => {
      const mockJob: Job = {
        id: 'job-36',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-36',
        status: 'posted',
        budget: 0.50,
        budget_min: 0.25,
        budget_max: 0.75,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$0.25 - $0.75')).toBeTruthy();
    });

    it('should handle whitespace-only location', () => {
      const mockJob: Job = {
        id: 'job-37',
        title: 'Test',
        description: 'Test',
        location: '   ',
        homeowner_id: 'user-37',
        status: 'posted',
        budget: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // Whitespace is truthy, so it should display the whitespace
      expect(getByText('   ')).toBeTruthy();
    });

    it('should handle whitespace-only timeline', () => {
      const mockJob: Job = {
        id: 'job-38',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-38',
        status: 'posted',
        budget: 2000,
        timeline: '   ',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // Whitespace is truthy, so it should display the whitespace
      expect(getByText('   ')).toBeTruthy();
    });
  });

  // ==================== CURRENCY FORMATTING TESTS ====================

  describe('Currency Formatting Function', () => {
    it('should format integer amounts with two decimal places', () => {
      const mockJob: Job = {
        id: 'job-39',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-39',
        status: 'posted',
        budget: 1000,
        budget_min: 1000,
        budget_max: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$1,000.00 - $2,000.00')).toBeTruthy();
    });

    it('should format amounts with one decimal place', () => {
      const mockJob: Job = {
        id: 'job-40',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-40',
        status: 'posted',
        budget: 1234.5,
        budget_min: 1234.5,
        budget_max: 5678.9,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('$1,234.50 - $5,678.90')).toBeTruthy();
    });

    it('should use USD currency symbol', () => {
      const mockJob: Job = {
        id: 'job-41',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-41',
        status: 'posted',
        budget: 500,
        budget_min: 400,
        budget_max: 600,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      const budgetText = getByText('$400.00 - $600.00');
      expect(budgetText).toBeTruthy();
      expect(budgetText.props.children.toString()).toContain('$');
    });

    it('should use en-US locale formatting', () => {
      const mockJob: Job = {
        id: 'job-42',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-42',
        status: 'posted',
        budget: 12345.67,
        budget_min: 10000,
        budget_max: 15000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // en-US uses comma as thousand separator
      expect(getByText('$10,000.00 - $15,000.00')).toBeTruthy();
    });
  });

  // ==================== DATE FORMATTING TESTS ====================

  describe('Date Formatting Function', () => {
    it('should use en-US locale for date formatting', () => {
      const mockJob: Job = {
        id: 'job-43',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-43',
        status: 'posted',
        budget: 2000,
        created_at: '2024-02-14T10:00:00.000Z',
        updated_at: '2024-02-14T10:00:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('February 14, 2024')).toBeTruthy();
    });

    it('should include full month name', () => {
      const mockJob: Job = {
        id: 'job-44',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-44',
        status: 'posted',
        budget: 2000,
        created_at: '2024-09-05T15:30:00.000Z',
        updated_at: '2024-09-05T15:30:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('September 5, 2024')).toBeTruthy();
    });

    it('should include 4-digit year', () => {
      const mockJob: Job = {
        id: 'job-45',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-45',
        status: 'posted',
        budget: 2000,
        created_at: '2024-11-22T08:00:00.000Z',
        updated_at: '2024-11-22T08:00:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      const dateText = getByText('November 22, 2024');
      expect(dateText.props.children.toString()).toContain('2024');
    });

    it('should handle leap year dates', () => {
      const mockJob: Job = {
        id: 'job-46',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-46',
        status: 'posted',
        budget: 2000,
        created_at: '2024-02-29T12:00:00.000Z',
        updated_at: '2024-02-29T12:00:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('February 29, 2024')).toBeTruthy();
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    it('should display all fields together correctly', () => {
      const mockJob: Job = {
        id: 'job-47',
        title: 'Complete Bathroom Remodel',
        description: 'Full bathroom renovation including fixtures, tiles, and plumbing',
        location: '789 Pine Street, Chicago, IL 60601',
        homeowner_id: 'user-47',
        status: 'posted',
        budget: 8000,
        budget_min: 7000,
        budget_max: 9000,
        timeline: '3-4 weeks',
        created_at: '2024-03-10T09:00:00.000Z',
        updated_at: '2024-03-10T09:00:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      // Verify all fields are present
      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('789 Pine Street, Chicago, IL 60601')).toBeTruthy();
      expect(getByText('$7,000.00 - $9,000.00')).toBeTruthy();
      expect(getByText('3-4 weeks')).toBeTruthy();
      expect(getByText('March 10, 2024')).toBeTruthy();
    });

    it('should handle real-world job with all optional fields', () => {
      const mockJob: Job = {
        id: 'job-48',
        title: 'Roof Repair',
        description: 'Fix leaking roof and replace damaged shingles',
        location: '321 Elm Drive, Austin, TX 78701',
        homeowner_id: 'user-48',
        contractor_id: 'contractor-1',
        status: 'in_progress',
        budget: 4500,
        budget_min: 4000,
        budget_max: 5000,
        timeline: '1-2 weeks',
        category: 'Roofing',
        subcategory: 'Repair',
        priority: 'high',
        photos: ['photo1.jpg', 'photo2.jpg'],
        created_at: '2024-04-20T14:30:00.000Z',
        updated_at: '2024-04-21T10:15:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('321 Elm Drive, Austin, TX 78701')).toBeTruthy();
      expect(getByText('$4,000.00 - $5,000.00')).toBeTruthy();
      expect(getByText('1-2 weeks')).toBeTruthy();
      expect(getByText('April 20, 2024')).toBeTruthy();
    });

    it('should handle minimal real-world job data', () => {
      const mockJob: Job = {
        id: 'job-49',
        title: 'Quick Plumbing Fix',
        description: 'Small leak under sink',
        location: 'Downtown',
        homeowner_id: 'user-49',
        status: 'posted',
        budget: 150,
        created_at: '2024-05-01T08:00:00.000Z',
        updated_at: '2024-05-01T08:00:00.000Z',
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('Downtown')).toBeTruthy();
      expect(getByText('Not specified')).toBeTruthy(); // budget range
      expect(getByText('Flexible')).toBeTruthy(); // timeline
      expect(getByText('May 1, 2024')).toBeTruthy();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  describe('Accessibility', () => {
    it('should render all text content as accessible Text components', () => {
      const mockJob: Job = {
        id: 'job-50',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-50',
        status: 'posted',
        budget: 2000,
        budget_min: 1500,
        budget_max: 2500,
        timeline: '2 weeks',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { UNSAFE_getAllByType } = render(<JobDetailsInfo job={mockJob} />);
      const textComponents = UNSAFE_getAllByType('Text' as any);

      // Should have multiple Text components for labels and values
      expect(textComponents.length).toBeGreaterThan(0);
    });

    it('should have proper semantic structure with View containers', () => {
      const mockJob: Job = {
        id: 'job-51',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-51',
        status: 'posted',
        budget: 2000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { UNSAFE_getAllByType } = render(<JobDetailsInfo job={mockJob} />);
      const viewComponents = UNSAFE_getAllByType('View' as any);

      // Should have multiple View containers for layout structure
      expect(viewComponents.length).toBeGreaterThan(0);
    });
  });

  // ==================== SNAPSHOT CONSISTENCY ====================

  describe('Rendering Consistency', () => {
    it('should render consistently with same props', () => {
      const mockJob: Job = {
        id: 'job-52',
        title: 'Consistency Test',
        description: 'Testing consistent rendering',
        location: '999 Test St',
        homeowner_id: 'user-52',
        status: 'posted',
        budget: 3000,
        budget_min: 2500,
        budget_max: 3500,
        timeline: '1 week',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText, rerender } = render(<JobDetailsInfo job={mockJob} />);

      // Initial render should show correct data
      expect(getByText('999 Test St')).toBeTruthy();
      expect(getByText('$2,500.00 - $3,500.00')).toBeTruthy();

      // Re-render with same props should be consistent
      rerender(<JobDetailsInfo job={mockJob} />);
      expect(getByText('999 Test St')).toBeTruthy();
      expect(getByText('$2,500.00 - $3,500.00')).toBeTruthy();
    });
  });
});
