import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

vi.mock('@mintenance/shared-ui', () => ({
  Input: React.forwardRef(({ label, error, errorText, helperText, id, ...props }: any, ref: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input ref={ref} id={id} aria-invalid={error} {...props} />
      {errorText && <span role="alert">{errorText}</span>}
      {helperText && <span>{helperText}</span>}
    </div>
  )),
}));

describe('Input', () => {
  it('should render without crashing', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Input label="Username" id="username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('should render with string error', () => {
    render(<Input error="Required field" id="test" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('should render with helper text', () => {
    render(<Input helperText="Enter a value" />);
    expect(screen.getByText('Enter a value')).toBeInTheDocument();
  });
});
