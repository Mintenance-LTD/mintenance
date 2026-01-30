import { render, screen, fireEvent } from '@testing-library/react';
import { AccordionItem } from '../AccordionItem';

// Mock lucide-react ChevronDown icon
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className: string }) => <span data-testid="chevron-icon" className={className} />,
}));

describe('AccordionItem', () => {
  it('should render accordion with title and content', () => {
    render(<AccordionItem title="Test Title" content="Test Content" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    // Content is hidden by default with max-h-0 opacity-0
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should toggle content visibility on click', () => {
    render(<AccordionItem title="Click Me" content="Hidden Content" defaultOpen={false} />);

    const button = screen.getByRole('button');

    // Initially closed (aria-expanded should be false)
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Click to close
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should start open when defaultOpen is true', () => {
    render(<AccordionItem title="Open Title" content="Open Content" defaultOpen={true} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should call onToggle callback when toggled', () => {
    const onToggle = vi.fn();
    render(<AccordionItem title="Toggle Test" content="Content" onToggle={onToggle} />);

    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});