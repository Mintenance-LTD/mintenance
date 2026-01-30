import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractorCard } from '../ContractorCard';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: {
      surface: '#ffffff',
      border: '#e5e7eb',
      primary: '#4f46e5',
      primaryLight: '#818cf8',
      text: '#111827',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      success: '#10b981',
    },
    typography: {
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
  },
}));

describe('ContractorCard', () => {
  const mockContractor = {
    first_name: 'John',
    last_name: 'Doe',
    company_name: 'Doe Construction',
    bio: 'Experienced contractor with 10 years experience',
    profile_image_url: '/profile.jpg',
    email_verified: true,
    rating: 4.8,
    total_jobs_completed: 50,
    city: 'London',
    is_available: true,
    contractor_skills: [
      { skill_name: 'Plumbing' },
      { skill_name: 'Electrical' },
    ],
  };

  it('should handle normal cases', () => {
    const { container } = render(<ContractorCard contractor={mockContractor} />);
    expect(container).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('should handle edge cases', () => {
    // Test with minimal contractor data
    const minimalContractor = {
      first_name: 'Jane',
      last_name: 'Smith',
    };
    const { container } = render(<ContractorCard contractor={minimalContractor} />);
    expect(container).toBeDefined();
  });

  it('should handle error cases', () => {
    // Test with missing optional fields
    const partialContractor = {
      first_name: 'Test',
      last_name: 'User',
      rating: undefined,
      contractor_skills: undefined,
    };
    const { container } = render(<ContractorCard contractor={partialContractor} />);
    expect(container).toBeDefined();
  });
});
