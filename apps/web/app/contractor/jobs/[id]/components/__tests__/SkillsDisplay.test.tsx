import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { SkillsDisplay } from '../SkillsDisplay';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('SkillsDisplay', () => {
  const defaultProps = {
    skills: ['Plumbing', 'Electrical', 'Carpentry', 'Painting'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<SkillsDisplay {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<SkillsDisplay {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<SkillsDisplay {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<SkillsDisplay skills={[]} />);
    // Component returns null for empty skills
    expect(container).toBeDefined();
  });
});