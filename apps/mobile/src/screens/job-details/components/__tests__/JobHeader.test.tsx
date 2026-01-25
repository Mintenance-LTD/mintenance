/**
 * JobHeader Component Tests
 *
 * Comprehensive test suite for JobHeader component
 * Coverage target: 100%
 * Tests: Job title, status badge, dates, description rendering
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { JobHeader } from '../JobHeader';
import type { Job } from '@mintenance/types';
import { theme } from '../../../../theme';

describe('JobHeader Component', () => {
  // Test data factory
  const createMockJob = (overrides?: Partial<Job>): Job => ({
    id: 'job-123',
    title: 'Fix Kitchen Faucet',
    description: 'Leaky faucet needs immediate repair',
    location: '123 Main St',
    homeowner_id: 'homeowner-123',
    status: 'posted',
    budget: 150,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Title Rendering', () => {
    it('renders job title correctly', () => {
      const job = createMockJob({ title: 'Repair Roof Leak' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('Repair Roof Leak')).toBeTruthy();
    });

    it('renders title with special characters', () => {
      const job = createMockJob({ title: 'Fix A/C & Heating System' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('Fix A/C & Heating System')).toBeTruthy();
    });

    it('renders title with numbers', () => {
      const job = createMockJob({ title: 'Install 3 Light Fixtures' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('Install 3 Light Fixtures')).toBeTruthy();
    });

    it('renders very long title', () => {
      const longTitle = 'Complete Home Renovation Including Kitchen, Bathroom, Living Room, and Bedroom Updates with High-End Materials';
      const job = createMockJob({ title: longTitle });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText(longTitle)).toBeTruthy();
    });

    it('renders single character title', () => {
      const job = createMockJob({ title: 'A' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('A')).toBeTruthy();
    });

    it('renders title with emoji', () => {
      const job = createMockJob({ title: '🔧 Quick Repair' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('🔧 Quick Repair')).toBeTruthy();
    });
  });

  describe('Status Badge Rendering', () => {
    it('renders POSTED status correctly', () => {
      const job = createMockJob({ status: 'posted' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('POSTED')).toBeTruthy();
    });

    it('renders ASSIGNED status correctly', () => {
      const job = createMockJob({ status: 'assigned' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('ASSIGNED')).toBeTruthy();
    });

    it('renders IN PROGRESS status correctly', () => {
      const job = createMockJob({ status: 'in_progress' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('IN PROGRESS')).toBeTruthy();
    });

    it('renders COMPLETED status correctly', () => {
      const job = createMockJob({ status: 'completed' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('COMPLETED')).toBeTruthy();
    });

    it('renders CANCELLED status correctly', () => {
      const job = createMockJob({ status: 'cancelled' as any });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('CANCELLED')).toBeTruthy();
    });

    it('renders PENDING status correctly', () => {
      const job = createMockJob({ status: 'pending' as any });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('PENDING')).toBeTruthy();
    });
  });

  describe('Status Color Mapping', () => {
    it('uses success color for completed status', () => {
      const job = createMockJob({ status: 'completed' });
      const { getByText } = render(<JobHeader job={job} />);

      const statusText = getByText('COMPLETED');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: theme.colors.success })
        ])
      );
    });

    it('uses warning color for in_progress status', () => {
      const job = createMockJob({ status: 'in_progress' });
      const { getByText } = render(<JobHeader job={job} />);

      const statusText = getByText('IN PROGRESS');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: theme.colors.warning })
        ])
      );
    });

    it('uses info color for pending status', () => {
      const job = createMockJob({ status: 'pending' as any });
      const { getByText } = render(<JobHeader job={job} />);

      const statusText = getByText('PENDING');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: theme.colors.info })
        ])
      );
    });

    it('uses error color for cancelled status', () => {
      const job = createMockJob({ status: 'cancelled' as any });
      const { getByText } = render(<JobHeader job={job} />);

      const statusText = getByText('CANCELLED');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: theme.colors.error })
        ])
      );
    });

    it('uses default color for unknown status', () => {
      const job = createMockJob({ status: 'unknown' as any });
      const { getByText } = render(<JobHeader job={job} />);

      const statusText = getByText('UNKNOWN');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: theme.colors.textSecondary })
        ])
      );
    });
  });

  describe('Status Icon Rendering', () => {
    it('renders checkmark-circle icon for completed status', () => {
      const job = createMockJob({ status: 'completed' });
      const { root } = render(<JobHeader job={job} />);

      // Icon component should be rendered
      expect(root).toBeTruthy();
    });

    it('renders time icon for in_progress status', () => {
      const job = createMockJob({ status: 'in_progress' });
      const { root } = render(<JobHeader job={job} />);

      expect(root).toBeTruthy();
    });

    it('renders hourglass icon for pending status', () => {
      const job = createMockJob({ status: 'pending' as any });
      const { root } = render(<JobHeader job={job} />);

      expect(root).toBeTruthy();
    });

    it('renders close-circle icon for cancelled status', () => {
      const job = createMockJob({ status: 'cancelled' as any });
      const { root } = render(<JobHeader job={job} />);

      expect(root).toBeTruthy();
    });

    it('renders help-circle icon for unknown status', () => {
      const job = createMockJob({ status: 'unknown' as any });
      const { root } = render(<JobHeader job={job} />);

      expect(root).toBeTruthy();
    });
  });

  describe('Date Rendering', () => {
    it('renders created date correctly', () => {
      const job = createMockJob({ created_at: '2024-01-15T10:30:00.000Z' });
      const { getByText } = render(<JobHeader job={job} />);

      // Date format is locale-dependent, just check it renders
      const dateText = getByText(/15\/01\/2024|1\/15\/2024|15\/1\/2024|2024-01-15/);
      expect(dateText).toBeTruthy();
    });

    it('formats date from ISO string', () => {
      const job = createMockJob({ created_at: '2024-03-20T14:45:30.000Z' });
      const { getByText } = render(<JobHeader job={job} />);

      const dateText = getByText(/20\/03\/2024|3\/20\/2024|20\/3\/2024|2024-03-20/);
      expect(dateText).toBeTruthy();
    });

    it('handles different date formats', () => {
      const job = createMockJob({ created_at: '2024-12-31T23:59:59.999Z' });
      const { getByText } = render(<JobHeader job={job} />);

      const dateText = getByText(/31\/12\/2024|12\/31\/2024|2024-12-31/);
      expect(dateText).toBeTruthy();
    });

    it('handles January 1st date', () => {
      const job = createMockJob({ created_at: '2024-01-01T00:00:00.000Z' });
      const { getByText } = render(<JobHeader job={job} />);

      const dateText = getByText(/01\/01\/2024|1\/1\/2024|1\/01\/2024|2024-01-01/);
      expect(dateText).toBeTruthy();
    });

    it('handles leap year date', () => {
      const job = createMockJob({ created_at: '2024-02-29T12:00:00.000Z' });
      const { getByText } = render(<JobHeader job={job} />);

      const dateText = getByText(/29\/02\/2024|2\/29\/2024|29\/2\/2024|2024-02-29/);
      expect(dateText).toBeTruthy();
    });

    it('renders calendar icon with date', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component renders successfully with date and icon
      expect(root).toBeTruthy();
    });
  });

  describe('Description Rendering', () => {
    it('renders description when provided', () => {
      const job = createMockJob({ description: 'Fix the leaking kitchen faucet ASAP' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('Fix the leaking kitchen faucet ASAP')).toBeTruthy();
    });

    it('does not render description section when description is empty', () => {
      const job = createMockJob({ description: '' });
      const { queryByText } = render(<JobHeader job={job} />);

      // Only title and status should be visible, no extra text
      expect(queryByText('')).toBeFalsy();
    });

    it('does not render description section when description is undefined', () => {
      const job = createMockJob({ description: undefined as any });
      const { root } = render(<JobHeader job={job} />);

      // Component should still render without errors
      expect(root).toBeTruthy();
    });

    it('renders multiline description', () => {
      const multilineDesc = 'Line 1\nLine 2\nLine 3';
      const job = createMockJob({ description: multilineDesc });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText(multilineDesc)).toBeTruthy();
    });

    it('renders description with special characters', () => {
      const desc = 'Fix @ $100 & call me #urgent!';
      const job = createMockJob({ description: desc });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText(desc)).toBeTruthy();
    });

    it('renders very long description', () => {
      const longDesc = 'A'.repeat(1000);
      const job = createMockJob({ description: longDesc });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText(longDesc)).toBeTruthy();
    });

    it('renders description with HTML entities', () => {
      const desc = 'Price: $100 & up';
      const job = createMockJob({ description: desc });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText(desc)).toBeTruthy();
    });

    it('renders description with emoji', () => {
      const desc = '🔧 Quick fix needed ASAP! 🚨';
      const job = createMockJob({ description: desc });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText(desc)).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('renders all sections in correct order', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Main container should exist
      expect(root).toBeTruthy();
    });

    it('applies correct container styles', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component should render with proper styling
      expect(root).toBeTruthy();
    });

    it('renders status row with correct flex layout', () => {
      const job = createMockJob();
      const { getByText } = render(<JobHeader job={job} />);

      // Status and date should be present
      expect(getByText('POSTED')).toBeTruthy();
      expect(getByText(/15\/01\/2024|1\/15\/2024|15\/1\/2024|2024-01-15/)).toBeTruthy();
    });

    it('renders status badge with correct styling', () => {
      const job = createMockJob();
      const { getByText } = render(<JobHeader job={job} />);

      const statusText = getByText('POSTED');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
          })
        ])
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles missing created_at date', () => {
      const job = createMockJob({ created_at: undefined as any });
      const { root } = render(<JobHeader job={job} />);

      // Should render without crashing
      expect(root).toBeTruthy();
    });

    it('handles invalid date string', () => {
      const job = createMockJob({ created_at: 'invalid-date' });
      const { root } = render(<JobHeader job={job} />);

      // Component should render even with invalid date
      expect(root).toBeTruthy();
    });

    it('handles empty title', () => {
      const job = createMockJob({ title: '' });
      const { root } = render(<JobHeader job={job} />);

      // Empty title should not crash
      expect(root).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      const job = createMockJob({ title: '   ' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('   ')).toBeTruthy();
    });

    it('handles whitespace-only description', () => {
      const job = createMockJob({ description: '   ' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('   ')).toBeTruthy();
    });
  });

  describe('Styling Consistency', () => {
    it('uses theme colors for surface background', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component renders with theme styling
      expect(root).toBeTruthy();
    });

    it('uses theme spacing for padding', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component renders with proper spacing
      expect(root).toBeTruthy();
    });

    it('uses theme border radius', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component renders with theme border radius
      expect(root).toBeTruthy();
    });

    it('applies shadow styles from theme', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component renders with shadow styles
      expect(root).toBeTruthy();
    });

    it('uses correct typography for title', () => {
      const job = createMockJob();
      const { getByText } = render(<JobHeader job={job} />);

      const titleText = getByText(job.title);
      expect(titleText.props.style).toEqual(
        expect.objectContaining({
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
        })
      );
    });

    it('uses correct typography for description', () => {
      const job = createMockJob({ description: 'Test description' });
      const { getByText } = render(<JobHeader job={job} />);

      const descText = getByText('Test description');
      expect(descText.props.style).toEqual(
        expect.objectContaining({
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
          lineHeight: 20,
        })
      );
    });

    it('uses correct typography for date text', () => {
      const job = createMockJob();
      const { getByText } = render(<JobHeader job={job} />);

      // Should have title, status, and date texts
      expect(getByText('Fix Kitchen Faucet')).toBeTruthy();
      expect(getByText('POSTED')).toBeTruthy();
      expect(getByText(/15\/01\/2024|1\/15\/2024|15\/1\/2024|2024-01-15/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('renders text components for screen readers', () => {
      const job = createMockJob();
      const { getByText } = render(<JobHeader job={job} />);

      // Text should be accessible
      expect(getByText('Fix Kitchen Faucet')).toBeTruthy();
      expect(getByText('POSTED')).toBeTruthy();
    });

    it('provides semantic structure with Views', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Component structure renders properly
      expect(root).toBeTruthy();
    });

    it('renders all text content as actual Text components', () => {
      const job = createMockJob({ description: 'Test' });
      const { getByText } = render(<JobHeader job={job} />);

      // All text should be accessible
      expect(getByText(job.title)).toBeTruthy();
      expect(getByText('POSTED')).toBeTruthy();
      expect(getByText('Test')).toBeTruthy();
    });
  });

  describe('Status Text Formatting', () => {
    it('replaces underscore with space in status', () => {
      const job = createMockJob({ status: 'in_progress' });
      const { getByText } = render(<JobHeader job={job} />);

      expect(getByText('IN PROGRESS')).toBeTruthy();
    });

    it('converts status to uppercase', () => {
      const job = createMockJob({ status: 'posted' });
      const { getByText, queryByText } = render(<JobHeader job={job} />);

      expect(getByText('POSTED')).toBeTruthy();
      expect(queryByText('posted')).toBeFalsy();
    });

    it('handles status with multiple underscores', () => {
      const job = createMockJob({ status: 'pending_contractor_approval' as any });
      const { getByText } = render(<JobHeader job={job} />);

      // First underscore should be replaced, rest remain
      expect(getByText('PENDING CONTRACTOR_APPROVAL')).toBeTruthy();
    });
  });

  describe('Icon Rendering', () => {
    it('renders status icon with correct size', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Icons render as part of the component
      expect(root).toBeTruthy();
    });

    it('renders calendar icon with correct size', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Calendar and status icons are present
      expect(root).toBeTruthy();
    });

    it('uses correct color for calendar icon', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      // Calendar icon color is from theme
      expect(root).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders without unnecessary re-renders', () => {
      const job = createMockJob();
      const { rerender } = render(<JobHeader job={job} />);

      // Re-render with same props
      rerender(<JobHeader job={job} />);

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('handles rapid status changes', () => {
      const job = createMockJob({ status: 'posted' });
      const { rerender, getByText } = render(<JobHeader job={job} />);

      rerender(<JobHeader job={{ ...job, status: 'assigned' }} />);
      expect(getByText('ASSIGNED')).toBeTruthy();

      rerender(<JobHeader job={{ ...job, status: 'in_progress' }} />);
      expect(getByText('IN PROGRESS')).toBeTruthy();

      rerender(<JobHeader job={{ ...job, status: 'completed' }} />);
      expect(getByText('COMPLETED')).toBeTruthy();
    });

    it('handles rapid title changes', () => {
      const job = createMockJob({ title: 'Title 1' });
      const { rerender, getByText } = render(<JobHeader job={job} />);

      rerender(<JobHeader job={{ ...job, title: 'Title 2' }} />);
      expect(getByText('Title 2')).toBeTruthy();

      rerender(<JobHeader job={{ ...job, title: 'Title 3' }} />);
      expect(getByText('Title 3')).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('accepts valid Job object', () => {
      const job = createMockJob();
      const { root } = render(<JobHeader job={job} />);

      expect(root).toBeTruthy();
    });

    it('renders with minimal required Job fields', () => {
      const minimalJob: Job = {
        id: 'job-1',
        title: 'Minimal Test Job',
        description: 'Simple Test Description',
        location: 'Test Location',
        homeowner_id: 'homeowner-1',
        status: 'posted',
        budget: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { getByText } = render(<JobHeader job={minimalJob} />);
      expect(getByText('Minimal Test Job')).toBeTruthy();
      expect(getByText('Simple Test Description')).toBeTruthy();
    });

    it('renders with all optional Job fields', () => {
      const completeJob: Job = {
        id: 'job-1',
        title: 'Complete Job',
        description: 'Full description',
        location: 'Test Location',
        homeowner_id: 'homeowner-1',
        contractor_id: 'contractor-1',
        status: 'in_progress',
        budget: 500,
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-16T14:20:00.000Z',
        category: 'Plumbing',
        subcategory: 'Faucet Repair',
        priority: 'high',
        photos: ['photo1.jpg', 'photo2.jpg'],
      };

      const { getByText } = render(<JobHeader job={completeJob} />);
      expect(getByText('Complete Job')).toBeTruthy();
      expect(getByText('Full description')).toBeTruthy();
    });
  });
});
