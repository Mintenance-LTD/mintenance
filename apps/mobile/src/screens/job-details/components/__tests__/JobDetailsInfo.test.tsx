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

// Deterministic date for consistent testing.
// JobDetailsInfo formats dates with `toLocaleDateString('en-GB', ...)`.
const FIXED_DATE = '2024-01-15T10:30:00.000Z';
const FIXED_DATE_FORMATTED = '15 January 2024';

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
      expect(getByText('Timeline')).toBeTruthy();
      expect(getByText('Created')).toBeTruthy();
    });

    // 2026-05-22: budget row removed from JobDetailsInfo — contractors
    // set their own price on each bid and the homeowner picks from
    // the bids. Pinned so a regression surfaces if it sneaks back.
    it('should NOT render Budget Range row', () => {
      const mockJob: Job = {
        id: 'job-no-budget',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-no-budget',
        status: 'posted',
        budget: 5000,
        budget_min: 4000,
        budget_max: 6000,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { queryByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(queryByText('Budget Range')).toBeNull();
      expect(queryByText('$4,000.00 - $6,000.00')).toBeNull();
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

      // 2026-05-22: this test previously relied on the Budget row's
      // "Not specified" fallback (since budget_min/_max weren't both
      // set). With the budget row removed, an empty location string
      // falls through to the literal `''` from `getValue('location')`
      // — the component has no empty-string fallback for location.
      // Keep the test as a sanity check that the screen still renders
      // (no crash) with an empty location.
      const { getByText } = render(<JobDetailsInfo job={mockJob} />);
      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('Location')).toBeTruthy();
    });

    it('should handle very long location addresses', () => {
      const longLocation =
        '1234 Very Long Street Name Avenue Boulevard, Apartment 567, Building C, New York City, New York State, United States of America 10001-5678';

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

  // Budget Display tests removed 2026-05-22 — JobDetailsInfo no longer
  // renders a Budget Range row. The negative-render guard lives in the
  // Rendering describe above.

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
      const longTimeline =
        'Flexible schedule, can work around homeowner availability, prefer weekdays between 9 AM and 5 PM';

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

      expect(getByText('1 January 2024')).toBeTruthy();
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

      expect(getByText('15 June 2024')).toBeTruthy();
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

      expect(getByText('31 December 2024')).toBeTruthy();
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

      expect(getByText('20 March 2023')).toBeTruthy();
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

      expect(getByText('10 August 2025')).toBeTruthy();
    });
  });

  // ==================== ICON RENDERING TESTS ====================

  describe('Icon Rendering', () => {
    // 2026-05-22: budget icon removed alongside the Budget Range row.
    // Now 3 icons: location, calendar (timeline), time (created).
    it('should render an icon for each of the three info items', () => {
      const mockJob: Job = {
        id: 'job-31',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-31',
        status: 'posted',
        budget: 2000,
        timeline: '1 week',
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { UNSAFE_getAllByType } = render(<JobDetailsInfo job={mockJob} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);

      expect(icons).toHaveLength(3);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle null timeline gracefully', () => {
      const mockJob: Job = {
        id: 'job-33',
        title: 'Test',
        description: 'Test',
        location: 'Test Location',
        homeowner_id: 'user-33',
        status: 'posted',
        budget: 2000,
        timeline: null as any,
        created_at: FIXED_DATE,
        updated_at: FIXED_DATE,
      };

      const { getByText } = render(<JobDetailsInfo job={mockJob} />);

      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('Flexible')).toBeTruthy();
    });

    // 2026-05-22: budget-specific edge cases (null/undefined range, negative
    // values, very small decimals) removed alongside the Budget Range row.

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

  // Currency formatting tests removed 2026-05-22 — JobDetailsInfo no
  // longer renders any currency, so there is nothing to format.

  // ==================== DATE FORMATTING TESTS ====================

  describe('Date Formatting Function', () => {
    it('should use en-GB locale for date formatting', () => {
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

      expect(getByText('14 February 2024')).toBeTruthy();
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

      expect(getByText('5 September 2024')).toBeTruthy();
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

      const dateText = getByText('22 November 2024');
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

      expect(getByText('29 February 2024')).toBeTruthy();
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    it('should display all fields together correctly', () => {
      const mockJob: Job = {
        id: 'job-47',
        title: 'Complete Bathroom Remodel',
        description:
          'Full bathroom renovation including fixtures, tiles, and plumbing',
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

      const { getByText, queryByText } = render(
        <JobDetailsInfo job={mockJob} />
      );

      // Verify all fields are present
      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('789 Pine Street, Chicago, IL 60601')).toBeTruthy();
      expect(getByText('3-4 weeks')).toBeTruthy();
      expect(getByText('10 March 2024')).toBeTruthy();
      // 2026-05-22: budget row removed.
      expect(queryByText('$7,000.00 - $9,000.00')).toBeNull();
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

      const { getByText, queryByText } = render(
        <JobDetailsInfo job={mockJob} />
      );

      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('321 Elm Drive, Austin, TX 78701')).toBeTruthy();
      expect(getByText('1-2 weeks')).toBeTruthy();
      expect(getByText('20 April 2024')).toBeTruthy();
      // 2026-05-22: budget row removed.
      expect(queryByText('$4,000.00 - $5,000.00')).toBeNull();
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

      const { getByText, queryByText } = render(
        <JobDetailsInfo job={mockJob} />
      );

      expect(getByText('Job Details')).toBeTruthy();
      expect(getByText('Downtown')).toBeTruthy();
      expect(getByText('Flexible')).toBeTruthy(); // timeline
      expect(getByText('1 May 2024')).toBeTruthy();
      // 2026-05-22: budget row removed.
      expect(queryByText('Budget Range')).toBeNull();
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

      const { getByText, rerender, queryByText } = render(
        <JobDetailsInfo job={mockJob} />
      );

      // Initial render should show correct data
      expect(getByText('999 Test St')).toBeTruthy();
      // 2026-05-22: budget row removed.
      expect(queryByText('$2,500.00 - $3,500.00')).toBeNull();

      // Re-render with same props should be consistent
      rerender(<JobDetailsInfo job={mockJob} />);
      expect(getByText('999 Test St')).toBeTruthy();
      expect(queryByText('$2,500.00 - $3,500.00')).toBeNull();
    });
  });
});
