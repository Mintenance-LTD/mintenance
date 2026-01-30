import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnifiedButton, { ButtonGroup, IconButton } from '../UnifiedButton';

describe('UnifiedButton', () => {
  it('should render children', () => {
    render(<UnifiedButton>Submit</UnifiedButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Submit');
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<UnifiedButton onClick={onClick}>Click</UnifiedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is set', () => {
    render(<UnifiedButton disabled>Disabled</UnifiedButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when loading', () => {
    render(<UnifiedButton loading>Loading</UnifiedButton>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('should render loading spinner when loading', () => {
    const { container } = render(<UnifiedButton loading>Save</UnifiedButton>);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render left icon', () => {
    render(<UnifiedButton leftIcon={<span data-testid="icon">+</span>}>Add</UnifiedButton>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should have type button by default', () => {
    render(<UnifiedButton>Btn</UnifiedButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('ButtonGroup', () => {
  it('should render children', () => {
    render(
      <ButtonGroup>
        <UnifiedButton>A</UnifiedButton>
        <UnifiedButton>B</UnifiedButton>
      </ButtonGroup>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('should have group role', () => {
    render(<ButtonGroup><UnifiedButton>A</UnifiedButton></ButtonGroup>);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('should render icon', () => {
    render(<IconButton icon={<span data-testid="ico">X</span>} srOnly="Close" />);
    expect(screen.getByTestId('ico')).toBeInTheDocument();
  });

  it('should render sr-only text', () => {
    render(<IconButton icon={<span>X</span>} srOnly="Close" />);
    expect(screen.getByText('Close')).toHaveClass('sr-only');
  });
});
