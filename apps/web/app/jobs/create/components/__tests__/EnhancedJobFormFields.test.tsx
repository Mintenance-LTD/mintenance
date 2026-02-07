import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedJobFormFields } from '../EnhancedJobFormFields';

vi.mock('lucide-react', () => ({
  Info: () => <span data-testid="icon-info" />,
  AlertCircle: (props: any) => <span data-testid="icon-alert" aria-label={props?.['aria-label']} aria-hidden={props?.['aria-hidden']} className={props?.className} />,
  CheckCircle: (props: any) => <span data-testid="icon-check" aria-label={props?.['aria-label']} aria-hidden={props?.['aria-hidden']} className={props?.className} />,
  TrendingUp: () => <span data-testid="icon-trending" />,
  Zap: () => <span data-testid="icon-zap" />,
}));

describe('EnhancedJobFormFields', () => {
  const defaultProps = {
    formData: {
      title: 'Kitchen Repair',
      description: 'Fix leaking sink',
      location: 'London, UK',
      budget: '500',
      category: 'Plumbing',
      urgent: false,
    },
    onFieldChange: vi.fn(),
    onFieldBlur: vi.fn(),
    errors: {},
    touchedFields: {},
    uploadedImages: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Title Field', () => {
    it('should render title input with correct label', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      expect(screen.getByText('Job Title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Fix leaking kitchen faucet/)).toBeInTheDocument();
    });

    it('should display current title value', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Fix leaking kitchen faucet/) as HTMLInputElement;
      expect(input.value).toBe('Kitchen Repair');
    });

    it('should call onFieldChange when title changes', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Fix leaking kitchen faucet/);

      fireEvent.change(input, { target: { value: 'New Title' } });

      expect(defaultProps.onFieldChange).toHaveBeenCalledWith('title', 'New Title');
    });

    it('should call onFieldBlur when title loses focus', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Fix leaking kitchen faucet/);

      fireEvent.blur(input);

      expect(defaultProps.onFieldBlur).toHaveBeenCalledWith('title');
    });

    it('should show error message when title has error and is touched', () => {
      const props = {
        ...defaultProps,
        errors: { title: 'Title is required' },
        touchedFields: { title: true },
      };
      render(<EnhancedJobFormFields {...props} />);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('should show success helper text when title is valid', () => {
      const props = {
        ...defaultProps,
        touchedFields: { title: true },
        formData: { ...defaultProps.formData, title: 'Valid Title Here' },
      };
      render(<EnhancedJobFormFields {...props} />);

      // FormField renders helper text in both a plain helper and a success section
      const matches = screen.getAllByText(/Great! Your title is clear and concise/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const charMatches = screen.getAllByText(/16\/100 characters/);
      expect(charMatches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Location Field', () => {
    it('should render location input with correct label', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter address or postcode')).toBeInTheDocument();
    });

    it('should display current location value', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter address or postcode') as HTMLInputElement;
      expect(input.value).toBe('London, UK');
    });

    it('should call onFieldChange when location changes', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter address or postcode');

      fireEvent.change(input, { target: { value: 'Manchester, UK' } });

      expect(defaultProps.onFieldChange).toHaveBeenCalledWith('location', 'Manchester, UK');
    });

    it('should show success message when location is valid', () => {
      const props = {
        ...defaultProps,
        touchedFields: { location: true },
      };
      render(<EnhancedJobFormFields {...props} />);

      // FormField renders helper text in both a plain helper and a success section
      const matches = screen.getAllByText('Location verified');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Description Field', () => {
    it('should render description textarea', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should display current description value', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const textarea = screen.getByDisplayValue('Fix leaking sink');
      expect(textarea).toBeInTheDocument();
    });

    it('should call onFieldChange when description changes', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const textarea = screen.getByDisplayValue('Fix leaking sink');

      fireEvent.change(textarea, { target: { value: 'New description text' } });

      expect(defaultProps.onFieldChange).toHaveBeenCalledWith('description', 'New description text');
    });

    it('should show error when description has error and is touched', () => {
      const props = {
        ...defaultProps,
        errors: { description: 'Description must be at least 20 characters' },
        touchedFields: { description: true },
      };
      render(<EnhancedJobFormFields {...props} />);

      expect(screen.getByText('Description must be at least 20 characters')).toBeInTheDocument();
    });
  });

  describe('Field Validation States', () => {
    it('should show multiple errors when multiple fields are invalid', () => {
      const props = {
        ...defaultProps,
        errors: {
          title: 'Title is required',
          location: 'Location is required',
          description: 'Description is required',
        },
        touchedFields: {
          title: true,
          location: true,
          description: true,
        },
      };
      render(<EnhancedJobFormFields {...props} />);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Location is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    it('should not show errors for untouched fields', () => {
      const props = {
        ...defaultProps,
        errors: {
          title: 'Title is required',
          location: 'Location is required',
        },
        touchedFields: {}, // No fields touched
      };
      render(<EnhancedJobFormFields {...props} />);

      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Location is required')).not.toBeInTheDocument();
    });

    it('should show helper text for untouched valid fields', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);

      expect(screen.getByText(/Enter a clear, descriptive title/)).toBeInTheDocument();
      expect(screen.getByText(/Enter your full address or postcode/)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should handle rapid field changes', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);
      const titleInput = screen.getByPlaceholderText(/Fix leaking kitchen faucet/);

      fireEvent.change(titleInput, { target: { value: 'A' } });
      fireEvent.change(titleInput, { target: { value: 'AB' } });
      fireEvent.change(titleInput, { target: { value: 'ABC' } });

      expect(defaultProps.onFieldChange).toHaveBeenCalledTimes(3);
      expect(defaultProps.onFieldChange).toHaveBeenLastCalledWith('title', 'ABC');
    });

    it('should handle blur events on all fields', () => {
      render(<EnhancedJobFormFields {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/Fix leaking kitchen faucet/);
      const locationInput = screen.getByPlaceholderText('Enter address or postcode');
      const descriptionInput = screen.getByDisplayValue('Fix leaking sink');

      fireEvent.blur(titleInput);
      fireEvent.blur(locationInput);
      fireEvent.blur(descriptionInput);

      expect(defaultProps.onFieldBlur).toHaveBeenCalledWith('title');
      expect(defaultProps.onFieldBlur).toHaveBeenCalledWith('location');
      expect(defaultProps.onFieldBlur).toHaveBeenCalledWith('description');
      expect(defaultProps.onFieldBlur).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty form data', () => {
      const props = {
        ...defaultProps,
        formData: {
          title: '',
          description: '',
          location: '',
          budget: '',
          category: '',
          urgent: false,
        },
      };
      const { container } = render(<EnhancedJobFormFields {...props} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(100);
      const props = {
        ...defaultProps,
        formData: { ...defaultProps.formData, title: longTitle },
      };
      render(<EnhancedJobFormFields {...props} />);

      const input = screen.getByPlaceholderText(/Fix leaking kitchen faucet/) as HTMLInputElement;
      expect(input.value).toBe(longTitle);
    });
  });
});