import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibleInput, AccessibleTextarea, AccessibleSelect } from '../AccessibleInput';

describe('AccessibleInput', () => {
  it('should render with required label prop', () => {
    render(<AccessibleInput label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<AccessibleInput label="Email" error="Invalid email" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('should show helper text when no error', () => {
    render(<AccessibleInput label="Email" helperText="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('should hide helper text when error is present', () => {
    render(<AccessibleInput label="Email" helperText="Enter your email" error="Required" />);
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('should show required indicator', () => {
    render(<AccessibleInput label="Email" required showRequiredIndicator />);
    expect(screen.getByLabelText('required')).toHaveTextContent('*');
  });

  it('should show character count', () => {
    render(<AccessibleInput label="Name" characterCount={{ current: 5, max: 20 }} />);
    expect(screen.getByText('5/20 characters')).toBeInTheDocument();
  });

  it('should set aria-invalid when error is present', () => {
    render(<AccessibleInput label="Email" error="Bad" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('AccessibleTextarea', () => {
  it('should render with required label prop', () => {
    render(<AccessibleTextarea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<AccessibleTextarea label="Description" error="Too short" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });
});

describe('AccessibleSelect', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('should render with label and options', () => {
    render(<AccessibleSelect label="Category" options={options} />);
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('should show placeholder', () => {
    render(<AccessibleSelect label="Category" options={options} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('should display error', () => {
    render(<AccessibleSelect label="Category" options={options} error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});
