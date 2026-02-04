import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '../Textarea';

describe('Textarea', () => {
  it('should render without crashing', () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector('textarea')).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should show required indicator', () => {
    render(<Textarea label="Notes" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should render error text', () => {
    render(<Textarea errorText="Too short" id="test" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('should render helper text', () => {
    render(<Textarea helperText="Max 500 chars" id="test" />);
    expect(screen.getByText('Max 500 chars')).toBeInTheDocument();
  });

  it('should set aria-invalid when error is present', () => {
    const { container } = render(<Textarea errorText="Error" />);
    expect(container.querySelector('textarea')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should handle focus and blur', () => {
    const { container } = render(<Textarea />);
    const textarea = container.querySelector('textarea')!;
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);
    expect(textarea).toBeInTheDocument();
  });
});
