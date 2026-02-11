// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerRow } from '../CustomerRow';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('CustomerRow', () => {
  const mockCustomer = {
    id: 'customer-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    profile_image_url: null,
  };

  const defaultProps = {
    customer: mockCustomer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render customer information', () => {
    render(<CustomerRow {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // initials
  });

  it('should display customer email', () => {
    render(<CustomerRow {...defaultProps} />);
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('should handle customer with profile image', () => {
    const propsWithImage = {
      customer: { ...mockCustomer, profile_image_url: 'https://example.com/avatar.jpg' },
    };
    render(<CustomerRow {...propsWithImage} />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img).toBeInTheDocument();
  });

  it('should render link to customer detail page', () => {
    render(<CustomerRow {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/contractor/customers/customer-123');
  });
});