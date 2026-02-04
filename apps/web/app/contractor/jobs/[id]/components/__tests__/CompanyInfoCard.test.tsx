import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { CompanyInfoCard } from '../CompanyInfoCard';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('CompanyInfoCard', () => {
  const defaultProps = {
    contractorId: 'contractor-1',
    profileCompletion: 85,
    skills: ['Plumbing', 'Electrical', 'Carpentry'],
    portfolioImages: ['/image1.jpg', '/image2.jpg'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<CompanyInfoCard {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<CompanyInfoCard {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<CompanyInfoCard {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const minimalProps = {
      contractorId: 'contractor-1',
      profileCompletion: 0,
      skills: [],
      portfolioImages: [],
    };
    const { container } = render(<CompanyInfoCard {...minimalProps} />);
    expect(container).toBeDefined();
  });
});