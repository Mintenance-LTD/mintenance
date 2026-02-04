import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveGrid } from '../ResponsiveGrid';

describe('ResponsiveGrid', () => {
  it('should render children', () => {
    render(
      <ResponsiveGrid areas={{ mobile: [['main']] }}>
        <div style={{ gridArea: 'main' }}>Main content</div>
      </ResponsiveGrid>
    );
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <ResponsiveGrid areas={{ mobile: [['header'], ['main']] }}>
        <div style={{ gridArea: 'header' }}>Header</div>
        <div style={{ gridArea: 'main' }}>Main</div>
      </ResponsiveGrid>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ResponsiveGrid areas={{ mobile: [['main']] }} className="custom-grid">
        <div>Content</div>
      </ResponsiveGrid>
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
