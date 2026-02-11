// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchFilters } from '../SearchFilters';

// Mock theme to avoid import issues
vi.mock('@/lib/theme', () => ({
  theme: {
    colors: {
      surface: '#ffffff',
      border: '#e5e7eb',
      text: '#1f2937',
      backgroundSecondary: '#f9fafb',
    },
    borderRadius: {
      lg: '12px',
      md: '8px',
    },
    spacing: {
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
    },
    typography: {
      fontSize: {
        sm: '14px',
        base: '16px',
      },
      fontWeight: {
        medium: 500,
      },
    },
  },
}));

describe('SearchFilters', () => {
  const defaultSkills = ['Plumbing', 'Electrical', 'HVAC', 'Carpentry'];
  const defaultCities = ['New York', 'Los Angeles', 'Chicago', 'Houston'];

  const defaultProps = {
    skills: defaultSkills,
    cities: defaultCities,
    currentFilters: {},
  };

  // Helper to get selects by name attribute
  const getSelectByName = (container: HTMLElement, name: string) => {
    return container.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should render as a form with correct action', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form');
      expect(form).toHaveAttribute('action', '/contractors');
      expect(form).toHaveAttribute('method', 'get');
    });

    it('should render all three filter sections', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByText('Skill')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    });

    it('should render skill select with correct name', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const skillSelect = getSelectByName(container, 'skill');
      expect(skillSelect).toBeInTheDocument();
      expect(skillSelect).toHaveAttribute('name', 'skill');
    });

    it('should render location select with correct name', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const locationSelect = getSelectByName(container, 'location');
      expect(locationSelect).toBeInTheDocument();
      expect(locationSelect).toHaveAttribute('name', 'location');
    });

    it('should render min rating select with correct name', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const ratingSelect = getSelectByName(container, 'minRating');
      expect(ratingSelect).toBeInTheDocument();
      expect(ratingSelect).toHaveAttribute('name', 'minRating');
    });
  });

  describe('Skills Filter', () => {
    it('should display all skills in the dropdown', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const skillSelect = getSelectByName(container, 'skill');

      defaultSkills.forEach((skill) => {
        expect(within(skillSelect).getByText(skill)).toBeInTheDocument();
      });
    });

    it('should include "All Skills" option', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const skillSelect = getSelectByName(container, 'skill');
      expect(within(skillSelect).getByText('All Skills')).toBeInTheDocument();
    });

    it('should set default value when currentFilters.skill is provided', () => {
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ skill: 'Plumbing' }}
        />
      );
      const skillSelect = getSelectByName(container, 'skill');
      expect(skillSelect.value).toBe('Plumbing');
    });

    it('should default to empty string when no filter is provided', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const skillSelect = getSelectByName(container, 'skill');
      expect(skillSelect.value).toBe('');
    });

    it('should handle empty skills array', () => {
      const { container } = render(<SearchFilters {...defaultProps} skills={[]} />);
      const skillSelect = getSelectByName(container, 'skill');
      const options = within(skillSelect).getAllByRole('option');
      expect(options).toHaveLength(1); // Only "All Skills" option
    });

    it('should submit form on skill change', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form');
      const submitSpy = vi.spyOn(form as HTMLFormElement, 'requestSubmit');

      const skillSelect = getSelectByName(container, 'skill');
      fireEvent.change(skillSelect, { target: { value: 'Plumbing' } });

      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe('Location Filter', () => {
    it('should display all cities in the dropdown', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const locationSelect = getSelectByName(container, 'location');

      defaultCities.forEach((city) => {
        expect(within(locationSelect).getByText(city)).toBeInTheDocument();
      });
    });

    it('should include "All Locations" option', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const locationSelect = getSelectByName(container, 'location');
      expect(within(locationSelect).getByText('All Locations')).toBeInTheDocument();
    });

    it('should set default value when currentFilters.location is provided', () => {
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ location: 'New York' }}
        />
      );
      const locationSelect = getSelectByName(container, 'location');
      expect(locationSelect.value).toBe('New York');
    });

    it('should default to empty string when no filter is provided', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const locationSelect = getSelectByName(container, 'location');
      expect(locationSelect.value).toBe('');
    });

    it('should handle empty cities array', () => {
      const { container } = render(<SearchFilters {...defaultProps} cities={[]} />);
      const locationSelect = getSelectByName(container, 'location');
      const options = within(locationSelect).getAllByRole('option');
      expect(options).toHaveLength(1); // Only "All Locations" option
    });

    it('should submit form on location change', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form');
      const submitSpy = vi.spyOn(form as HTMLFormElement, 'requestSubmit');

      const locationSelect = getSelectByName(container, 'location');
      fireEvent.change(locationSelect, { target: { value: 'New York' } });

      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe('Rating Filter', () => {
    it('should display all rating options', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const ratingSelect = getSelectByName(container, 'minRating');

      expect(within(ratingSelect).getByText('Any Rating')).toBeInTheDocument();
      expect(within(ratingSelect).getByText('4.5+ Stars')).toBeInTheDocument();
      expect(within(ratingSelect).getByText('4.0+ Stars')).toBeInTheDocument();
      expect(within(ratingSelect).getByText('3.5+ Stars')).toBeInTheDocument();
      expect(within(ratingSelect).getByText('3.0+ Stars')).toBeInTheDocument();
    });

    it('should set default value when currentFilters.minRating is provided', () => {
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ minRating: '4.5' }}
        />
      );
      const ratingSelect = getSelectByName(container, 'minRating');
      expect(ratingSelect.value).toBe('4.5');
    });

    it('should default to empty string when no filter is provided', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const ratingSelect = getSelectByName(container, 'minRating');
      expect(ratingSelect.value).toBe('');
    });

    it('should have correct values for rating options', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const ratingSelect = getSelectByName(container, 'minRating');

      const option45 = within(ratingSelect).getByText('4.5+ Stars') as HTMLOptionElement;
      expect(option45.value).toBe('4.5');

      const option40 = within(ratingSelect).getByText('4.0+ Stars') as HTMLOptionElement;
      expect(option40.value).toBe('4.0');

      const option35 = within(ratingSelect).getByText('3.5+ Stars') as HTMLOptionElement;
      expect(option35.value).toBe('3.5');

      const option30 = within(ratingSelect).getByText('3.0+ Stars') as HTMLOptionElement;
      expect(option30.value).toBe('3.0');
    });

    it('should submit form on rating change', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form');
      const submitSpy = vi.spyOn(form as HTMLFormElement, 'requestSubmit');

      const ratingSelect = getSelectByName(container, 'minRating');
      fireEvent.change(ratingSelect, { target: { value: '4.5' } });

      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe('Clear Filters Button', () => {
    it('should not show clear button when no filters are active', () => {
      render(<SearchFilters {...defaultProps} />);
      expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
    });

    it('should show clear button when skill filter is active', () => {
      render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ skill: 'Plumbing' }}
        />
      );
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('should show clear button when location filter is active', () => {
      render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ location: 'New York' }}
        />
      );
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('should show clear button when rating filter is active', () => {
      render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ minRating: '4.5' }}
        />
      );
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('should show clear button when multiple filters are active', () => {
      render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{
            skill: 'Plumbing',
            location: 'New York',
            minRating: '4.5',
          }}
        />
      );
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('should link to /contractors when clicked', () => {
      render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ skill: 'Plumbing' }}
        />
      );
      const clearButton = screen.getByText('Clear All Filters');
      expect(clearButton).toHaveAttribute('href', '/contractors');
    });
  });

  describe('Multiple Filter Combinations', () => {
    it('should handle all filters being set simultaneously', () => {
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{
            skill: 'Electrical',
            location: 'Chicago',
            minRating: '4.0',
          }}
        />
      );

      const skillSelect = getSelectByName(container, 'skill');
      const locationSelect = getSelectByName(container, 'location');
      const ratingSelect = getSelectByName(container, 'minRating');

      expect(skillSelect.value).toBe('Electrical');
      expect(locationSelect.value).toBe('Chicago');
      expect(ratingSelect.value).toBe('4.0');
    });

    it('should handle partial filter combinations', () => {
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{
            skill: 'HVAC',
            minRating: '3.5',
          }}
        />
      );

      const skillSelect = getSelectByName(container, 'skill');
      const locationSelect = getSelectByName(container, 'location');
      const ratingSelect = getSelectByName(container, 'minRating');

      expect(skillSelect.value).toBe('HVAC');
      expect(locationSelect.value).toBe('');
      expect(ratingSelect.value).toBe('3.5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate skills in array', () => {
      const duplicateSkills = ['Plumbing', 'Plumbing', 'Electrical'];
      const { container } = render(<SearchFilters {...defaultProps} skills={duplicateSkills} />);

      const skillSelect = getSelectByName(container, 'skill');
      const plumbingOptions = within(skillSelect).getAllByText('Plumbing');
      expect(plumbingOptions).toHaveLength(2);
    });

    it('should handle duplicate cities in array', () => {
      const duplicateCities = ['New York', 'New York', 'Chicago'];
      const { container } = render(<SearchFilters {...defaultProps} cities={duplicateCities} />);

      const locationSelect = getSelectByName(container, 'location');
      const nyOptions = within(locationSelect).getAllByText('New York');
      expect(nyOptions).toHaveLength(2);
    });

    it('should handle special characters in skill names', () => {
      const specialSkills = ['A/C Repair', 'Plumbing & Heating', 'Electrical > 100V'];
      const { container } = render(<SearchFilters {...defaultProps} skills={specialSkills} />);

      const skillSelect = getSelectByName(container, 'skill');
      expect(within(skillSelect).getByText('A/C Repair')).toBeInTheDocument();
      expect(within(skillSelect).getByText('Plumbing & Heating')).toBeInTheDocument();
      expect(within(skillSelect).getByText('Electrical > 100V')).toBeInTheDocument();
    });

    it('should handle special characters in city names', () => {
      const specialCities = ['St. John\'s', 'O\'Fallon', 'São Paulo'];
      const { container } = render(<SearchFilters {...defaultProps} cities={specialCities} />);

      const locationSelect = getSelectByName(container, 'location');
      expect(within(locationSelect).getByText('St. John\'s')).toBeInTheDocument();
      expect(within(locationSelect).getByText('O\'Fallon')).toBeInTheDocument();
      expect(within(locationSelect).getByText('São Paulo')).toBeInTheDocument();
    });

    it('should handle very long skill names', () => {
      const longSkillName = 'A'.repeat(100);
      const { container } = render(<SearchFilters {...defaultProps} skills={[longSkillName]} />);

      const skillSelect = getSelectByName(container, 'skill');
      expect(within(skillSelect).getByText(longSkillName)).toBeInTheDocument();
    });

    it('should handle very long city names', () => {
      const longCityName = 'B'.repeat(100);
      const { container } = render(<SearchFilters {...defaultProps} cities={[longCityName]} />);

      const locationSelect = getSelectByName(container, 'location');
      expect(within(locationSelect).getByText(longCityName)).toBeInTheDocument();
    });

    it('should handle undefined currentFilters properties gracefully', () => {
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{}}
        />
      );

      const skillSelect = getSelectByName(container, 'skill');
      const locationSelect = getSelectByName(container, 'location');
      const ratingSelect = getSelectByName(container, 'minRating');

      expect(skillSelect.value).toBe('');
      expect(locationSelect.value).toBe('');
      expect(ratingSelect.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label text visible', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByText('Skill')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    });

    it('should have proper form semantics', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form');

      expect(form).toBeInTheDocument();
      expect(form?.tagName).toBe('FORM');
    });

    it('should have all selects be focusable', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);

      const skillSelect = getSelectByName(container, 'skill');
      const locationSelect = getSelectByName(container, 'location');
      const ratingSelect = getSelectByName(container, 'minRating');

      skillSelect.focus();
      expect(document.activeElement).toBe(skillSelect);

      locationSelect.focus();
      expect(document.activeElement).toBe(locationSelect);

      ratingSelect.focus();
      expect(document.activeElement).toBe(ratingSelect);
    });
  });

  describe('User Interactions', () => {
    it('should allow changing skill filter', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchFilters {...defaultProps} />);

      const skillSelect = getSelectByName(container, 'skill');
      await user.selectOptions(skillSelect, 'Plumbing');

      expect(skillSelect.value).toBe('Plumbing');
    });

    it('should allow changing location filter', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchFilters {...defaultProps} />);

      const locationSelect = getSelectByName(container, 'location');
      await user.selectOptions(locationSelect, 'Chicago');

      expect(locationSelect.value).toBe('Chicago');
    });

    it('should allow changing rating filter', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchFilters {...defaultProps} />);

      const ratingSelect = getSelectByName(container, 'minRating');
      await user.selectOptions(ratingSelect, '4.5');

      expect(ratingSelect.value).toBe('4.5');
    });

    it('should allow resetting to default option', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SearchFilters
          {...defaultProps}
          currentFilters={{ skill: 'Plumbing' }}
        />
      );

      const skillSelect = getSelectByName(container, 'skill');
      await user.selectOptions(skillSelect, '');

      expect(skillSelect.value).toBe('');
    });
  });

  describe('Form Submission', () => {
    it('should trigger form submit on skill change', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form') as HTMLFormElement;
      const submitSpy = vi.spyOn(form, 'requestSubmit');

      const skillSelect = getSelectByName(container, 'skill');
      fireEvent.change(skillSelect, { target: { value: 'Electrical' } });

      expect(submitSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger form submit on location change', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form') as HTMLFormElement;
      const submitSpy = vi.spyOn(form, 'requestSubmit');

      const locationSelect = getSelectByName(container, 'location');
      fireEvent.change(locationSelect, { target: { value: 'Houston' } });

      expect(submitSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger form submit on rating change', () => {
      const { container } = render(<SearchFilters {...defaultProps} />);
      const form = container.querySelector('form') as HTMLFormElement;
      const submitSpy = vi.spyOn(form, 'requestSubmit');

      const ratingSelect = getSelectByName(container, 'minRating');
      fireEvent.change(ratingSelect, { target: { value: '3.0' } });

      expect(submitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
