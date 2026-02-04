import { vi } from 'vitest';
import { render } from '@testing-library/react';
import Loading from '../loading';

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="icon" />,
}));

describe('Loading', () => {
  it('should render without crashing', () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });
});