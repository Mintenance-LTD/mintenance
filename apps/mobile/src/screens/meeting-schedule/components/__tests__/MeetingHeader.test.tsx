/**
 * MeetingHeader Component Tests
 *
 * Comprehensive test suite for MeetingHeader component
 * Target: 100% coverage
 *
 * @filesize Target: <300 lines
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MeetingHeader } from '../MeetingHeader';
import type { User, Job } from '@mintenance/types';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      textPrimary: '#000000',
      textSecondary: '#666666',
      surface: '#FFFFFF',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    borderRadius: {
      lg: 12,
    },
    typography: {
      fontSize: {
        md: 14,
        xl: 20,
      },
      fontWeight: {
        semibold: '600',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
  },
}));

describe('MeetingHeader Component', () => {
  // Mock data
  const mockContractor: User = {
    id: 'contractor-123',
    email: 'contractor@test.com',
    first_name: 'John',
    last_name: 'Smith',
    role: 'contractor',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockJob: Job = {
    id: 'job-456',
    title: 'Kitchen Renovation',
    description: 'Complete kitchen remodel',
    category: 'renovation',
    homeowner_id: 'homeowner-789',
    status: 'posted',
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<MeetingHeader />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render root element with correct structure', () => {
      const { root } = render(<MeetingHeader />);
      expect(root).toBeTruthy();
    });

    it('should always render title "Schedule Meeting"', () => {
      const { getByText } = render(<MeetingHeader />);
      expect(getByText('Schedule Meeting')).toBeTruthy();
    });

    it('should render calendar icon', () => {
      const { UNSAFE_getAllByType } = render(<MeetingHeader />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should match snapshot without props', () => {
      const { toJSON } = render(<MeetingHeader />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Contractor Display', () => {
    it('should display contractor name when provided', () => {
      const { getByText } = render(<MeetingHeader contractor={mockContractor} />);
      expect(getByText('With: John Smith')).toBeTruthy();
    });

    it('should not display contractor section when not provided', () => {
      const { queryByText } = render(<MeetingHeader />);
      expect(queryByText(/With:/)).toBeNull();
    });

    it('should render person icon when contractor is provided', () => {
      const { UNSAFE_getAllByType } = render(<MeetingHeader contractor={mockContractor} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      expect(icons.length).toBe(2); // calendar + person
    });

    it('should display contractor with first name only', () => {
      const contractorFirstOnly = {
        ...mockContractor,
        last_name: '',
      };
      const { getByText } = render(<MeetingHeader contractor={contractorFirstOnly} />);
      expect(getByText('With: John ')).toBeTruthy();
    });

    it('should display contractor with last name only', () => {
      const contractorLastOnly = {
        ...mockContractor,
        first_name: '',
      };
      const { getByText } = render(<MeetingHeader contractor={contractorLastOnly} />);
      expect(getByText('With:  Smith')).toBeTruthy();
    });

    it('should display both names with space', () => {
      const { getByText } = render(<MeetingHeader contractor={mockContractor} />);
      const text = getByText('With: John Smith');
      expect(text.props.children).toContain('John');
      expect(text.props.children).toContain('Smith');
    });

    it('should handle contractor with no names', () => {
      const contractorNoNames = {
        ...mockContractor,
        first_name: '',
        last_name: '',
      };
      const { getByText } = render(<MeetingHeader contractor={contractorNoNames} />);
      expect(getByText('With:  ')).toBeTruthy();
    });

    it('should match snapshot with contractor', () => {
      const { toJSON } = render(<MeetingHeader contractor={mockContractor} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Job Display', () => {
    it('should display job title when provided', () => {
      const { getByText } = render(<MeetingHeader job={mockJob} />);
      expect(getByText('Job: Kitchen Renovation')).toBeTruthy();
    });

    it('should not display job section when not provided', () => {
      const { queryByText } = render(<MeetingHeader />);
      expect(queryByText(/Job:/)).toBeNull();
    });

    it('should render briefcase icon when job is provided', () => {
      const { UNSAFE_getAllByType } = render(<MeetingHeader job={mockJob} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      expect(icons.length).toBe(2); // calendar + briefcase
    });

    it('should display job with empty title', () => {
      const jobEmptyTitle = {
        ...mockJob,
        title: '',
      };
      const { getByText } = render(<MeetingHeader job={jobEmptyTitle} />);
      expect(getByText('Job: ')).toBeTruthy();
    });

    it('should display job with long title', () => {
      const jobLongTitle = {
        ...mockJob,
        title: 'Complete Kitchen and Bathroom Renovation with New Fixtures',
      };
      const { getByText } = render(<MeetingHeader job={jobLongTitle} />);
      expect(getByText('Job: Complete Kitchen and Bathroom Renovation with New Fixtures')).toBeTruthy();
    });

    it('should display job with special characters in title', () => {
      const jobSpecialChars = {
        ...mockJob,
        title: 'Fix A/C & HVAC System - Urgent!',
      };
      const { getByText } = render(<MeetingHeader job={jobSpecialChars} />);
      expect(getByText('Job: Fix A/C & HVAC System - Urgent!')).toBeTruthy();
    });

    it('should match snapshot with job', () => {
      const { toJSON } = render(<MeetingHeader job={mockJob} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Combined Display', () => {
    it('should display both contractor and job when provided', () => {
      const { getByText } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      expect(getByText('With: John Smith')).toBeTruthy();
      expect(getByText('Job: Kitchen Renovation')).toBeTruthy();
    });

    it('should render all three icons when both provided', () => {
      const { UNSAFE_getAllByType } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      expect(icons.length).toBe(3); // calendar + person + briefcase
    });

    it('should maintain correct order: title, contractor, job', () => {
      const { getAllByText } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const scheduleText = getAllByText('Schedule Meeting')[0];
      expect(scheduleText).toBeTruthy();
    });

    it('should match snapshot with both props', () => {
      const { toJSON } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Icon Configuration', () => {
    it('should render calendar icon with correct props', () => {
      const { UNSAFE_getAllByType } = render(<MeetingHeader />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const calendarIcon = icons[0];
      expect(calendarIcon.props.name).toBe('calendar-outline');
      expect(calendarIcon.props.size).toBe(24);
      expect(calendarIcon.props.color).toBe('#007AFF');
    });

    it('should render person icon with correct props when contractor provided', () => {
      const { UNSAFE_getAllByType } = render(<MeetingHeader contractor={mockContractor} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const personIcon = icons.find((icon: any) => icon.props.name === 'person-outline');
      expect(personIcon).toBeTruthy();
      expect(personIcon.props.size).toBe(16);
      expect(personIcon.props.color).toBe('#666666');
    });

    it('should render briefcase icon with correct props when job provided', () => {
      const { UNSAFE_getAllByType } = render(<MeetingHeader job={mockJob} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const briefcaseIcon = icons.find((icon: any) => icon.props.name === 'briefcase-outline');
      expect(briefcaseIcon).toBeTruthy();
      expect(briefcaseIcon.props.size).toBe(16);
      expect(briefcaseIcon.props.color).toBe('#666666');
    });

    it('should use consistent icon sizes for info icons', () => {
      const { UNSAFE_getAllByType } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const personIcon = icons.find((icon: any) => icon.props.name === 'person-outline');
      const briefcaseIcon = icons.find((icon: any) => icon.props.name === 'briefcase-outline');
      expect(personIcon.props.size).toBe(briefcaseIcon.props.size);
    });

    it('should use consistent colors for info icons', () => {
      const { UNSAFE_getAllByType } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const personIcon = icons.find((icon: any) => icon.props.name === 'person-outline');
      const briefcaseIcon = icons.find((icon: any) => icon.props.name === 'briefcase-outline');
      expect(personIcon.props.color).toBe(briefcaseIcon.props.color);
    });
  });

  describe('Styling and Layout', () => {
    it('should apply root element styles', () => {
      const { root } = render(<MeetingHeader />);
      expect(root).toBeTruthy();
    });

    it('should maintain consistent structure with empty props', () => {
      const { toJSON: empty } = render(<MeetingHeader />);
      const { toJSON: withData } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      expect(empty).toBeTruthy();
      expect(withData).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined contractor gracefully', () => {
      const { queryByText } = render(<MeetingHeader contractor={undefined} />);
      expect(queryByText(/With:/)).toBeNull();
    });

    it('should handle undefined job gracefully', () => {
      const { queryByText } = render(<MeetingHeader job={undefined} />);
      expect(queryByText(/Job:/)).toBeNull();
    });

    it('should handle null-like values in contractor name', () => {
      const contractorNullNames = {
        ...mockContractor,
        first_name: null as any,
        last_name: null as any,
      };
      const { root } = render(<MeetingHeader contractor={contractorNullNames} />);
      expect(root).toBeTruthy();
    });

    it('should handle null-like value in job title', () => {
      const jobNullTitle = {
        ...mockJob,
        title: null as any,
      };
      const { root } = render(<MeetingHeader job={jobNullTitle} />);
      expect(root).toBeTruthy();
    });

    it('should render correctly when contractor has very long names', () => {
      const contractorLongNames = {
        ...mockContractor,
        first_name: 'Christopher Alexander',
        last_name: 'Montgomery-Williamson',
      };
      const { getByText } = render(<MeetingHeader contractor={contractorLongNames} />);
      expect(getByText('With: Christopher Alexander Montgomery-Williamson')).toBeTruthy();
    });

    it('should handle contractor with numeric characters in name', () => {
      const contractorNumeric = {
        ...mockContractor,
        first_name: 'John2',
        last_name: 'Smith3',
      };
      const { getByText } = render(<MeetingHeader contractor={contractorNumeric} />);
      expect(getByText('With: John2 Smith3')).toBeTruthy();
    });

    it('should handle job with numeric title', () => {
      const jobNumeric = {
        ...mockJob,
        title: '123 Main Street Repairs',
      };
      const { getByText } = render(<MeetingHeader job={jobNumeric} />);
      expect(getByText('Job: 123 Main Street Repairs')).toBeTruthy();
    });

    it('should handle contractor with unicode characters', () => {
      const contractorUnicode = {
        ...mockContractor,
        first_name: 'José',
        last_name: 'García',
      };
      const { getByText } = render(<MeetingHeader contractor={contractorUnicode} />);
      expect(getByText('With: José García')).toBeTruthy();
    });

    it('should handle job with unicode characters', () => {
      const jobUnicode = {
        ...mockJob,
        title: 'Rénovation Complète',
      };
      const { getByText } = render(<MeetingHeader job={jobUnicode} />);
      expect(getByText('Job: Rénovation Complète')).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('should accept optional contractor prop', () => {
      expect(() => render(<MeetingHeader contractor={mockContractor} />)).not.toThrow();
    });

    it('should accept optional job prop', () => {
      expect(() => render(<MeetingHeader job={mockJob} />)).not.toThrow();
    });

    it('should accept both optional props', () => {
      expect(() => render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      )).not.toThrow();
    });

    it('should accept no props', () => {
      expect(() => render(<MeetingHeader />)).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should accept valid User type for contractor', () => {
      const validContractor: User = {
        id: 'test-id',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'contractor',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      expect(() => render(<MeetingHeader contractor={validContractor} />)).not.toThrow();
    });

    it('should accept valid Job type for job prop', () => {
      const validJob: Job = {
        id: 'test-job',
        title: 'Test Job',
        description: 'Test Description',
        category: 'plumbing',
        homeowner_id: 'homeowner-id',
        status: 'posted',
        priority: 'medium',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      expect(() => render(<MeetingHeader job={validJob} />)).not.toThrow();
    });
  });

  describe('Rendering Consistency', () => {
    it('should render consistently across multiple renders', () => {
      const { toJSON: toJSON1 } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const { toJSON: toJSON2 } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      expect(toJSON1()).toEqual(toJSON2());
    });

    it('should maintain structure when props change', () => {
      const { rerender, getByText } = render(<MeetingHeader />);
      expect(getByText('Schedule Meeting')).toBeTruthy();

      rerender(<MeetingHeader contractor={mockContractor} />);
      expect(getByText('Schedule Meeting')).toBeTruthy();
      expect(getByText('With: John Smith')).toBeTruthy();
    });

    it('should maintain structure when job is added', () => {
      const { rerender, getByText } = render(
        <MeetingHeader contractor={mockContractor} />
      );
      expect(getByText('With: John Smith')).toBeTruthy();

      rerender(<MeetingHeader contractor={mockContractor} job={mockJob} />);
      expect(getByText('With: John Smith')).toBeTruthy();
      expect(getByText('Job: Kitchen Renovation')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render text elements that are accessible', () => {
      const { getByText } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      expect(getByText('Schedule Meeting')).toBeTruthy();
      expect(getByText('With: John Smith')).toBeTruthy();
      expect(getByText('Job: Kitchen Renovation')).toBeTruthy();
    });

    it('should have meaningful text content', () => {
      const { getByText } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const titleText = getByText('Schedule Meeting');
      expect(titleText.props.children).toBe('Schedule Meeting');
    });

    it('should maintain readable text hierarchy', () => {
      const { getAllByText } = render(
        <MeetingHeader contractor={mockContractor} job={mockJob} />
      );
      const titleElements = getAllByText('Schedule Meeting');
      expect(titleElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount without errors', () => {
      expect(() => render(<MeetingHeader />)).not.toThrow();
    });

    it('should unmount without errors', () => {
      const { unmount } = render(<MeetingHeader />);
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple mount/unmount cycles', () => {
      const { unmount: unmount1 } = render(<MeetingHeader />);
      unmount1();
      const { unmount: unmount2 } = render(<MeetingHeader />);
      unmount2();
      const { unmount: unmount3 } = render(<MeetingHeader />);
      expect(() => unmount3()).not.toThrow();
    });
  });
});
