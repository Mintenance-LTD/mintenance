import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

vi.mock('@mintenance/shared-ui', () => ({
  Input: React.forwardRef(({ label, error, errorText, helperText, id, ...props }: any, ref: any) => {
    // The wrapper component maps string `error` to `errorText` and boolean `error`
    // so the mock must render errorText from the shared-ui side
    const errorMessage = errorText || (typeof error === 'string' ? error : undefined);
    const isInvalid = !!error || !!errorText;
    return (
      <div>
        {label && <label htmlFor={id}>{label}</label>}
        <input ref={ref} id={id} aria-invalid={isInvalid} aria-describedby={helperText ? `${id}-helper` : undefined} {...props} />
        {errorMessage && <span role="alert">{errorMessage}</span>}
        {helperText && <span id={`${id}-helper`}>{helperText}</span>}
      </div>
    );
  }),
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
    // The shared-ui Input renders error text in a <p> element (not role="alert")
    // Verify the error text appears in the rendered output
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('should render with helper text', () => {
    render(<Input helperText="Enter a value" />);
    expect(screen.getByText('Enter a value')).toBeInTheDocument();
  });
});
