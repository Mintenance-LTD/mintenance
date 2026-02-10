import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent } from '@testing-library/react';
import UnifiedCard, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardGrid, StatCard, ActionCard } from '../UnifiedCard';

describe('UnifiedCard', () => {
  it('should render children', () => {
    render(<UnifiedCard>Card content</UnifiedCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply interactive role when variant is interactive', () => {
    render(<UnifiedCard variant="interactive">Click me</UnifiedCard>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should apply interactive role when onClick is provided', () => {
    const onClick = vi.fn();
    render(<UnifiedCard onClick={onClick}>Click</UnifiedCard>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header text</CardHeader>);
    expect(screen.getByText('Header text')).toBeInTheDocument();
  });

  it('should render actions', () => {
    render(<CardHeader actions={<button>Action</button>}>Title</CardHeader>);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('should render as h3 by default', () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Title');
  });
});

describe('CardDescription', () => {
  it('should render text', () => {
    render(<CardDescription>Some description</CardDescription>);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Body content</CardContent>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});

describe('CardGrid', () => {
  it('should render children in grid', () => {
    render(
      <CardGrid>
        <div>A</div>
        <div>B</div>
      </CardGrid>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('should render title and value', () => {
    render(<StatCard title="Revenue" value="$5,000" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('should render trend', () => {
    render(<StatCard title="Jobs" value={42} trend={{ value: 12, label: 'vs last month', direction: 'up' }} />);
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });
});

describe('ActionCard', () => {
  it('should render title and description', () => {
    render(
      <ActionCard
        title="Get Started"
        description="Begin your journey"
        action={{ label: 'Start', onClick: vi.fn() }}
      />
    );
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Begin your journey')).toBeInTheDocument();
  });
});
