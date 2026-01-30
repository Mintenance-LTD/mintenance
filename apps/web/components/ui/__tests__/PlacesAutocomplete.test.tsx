import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacesAutocomplete } from '../PlacesAutocomplete';

vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('PlacesAutocomplete', () => {
  it('should render an input', () => {
    render(<PlacesAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument();
  });

  it('should render custom placeholder', () => {
    render(<PlacesAutocomplete value="" onChange={vi.fn()} placeholder="Search location" />);
    expect(screen.getByPlaceholderText('Search location')).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    const onChange = vi.fn();
    render(<PlacesAutocomplete value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Enter address'), { target: { value: 'London' } });
    expect(onChange).toHaveBeenCalledWith('London');
  });

  it('should display value', () => {
    render(<PlacesAutocomplete value="123 Main St" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
  });
});
