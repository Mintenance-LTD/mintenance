import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

vi.mock('../Icon', () => ({
  Icon: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}));

function TestConsumer() {
  const { showToast, toasts } = useToast();
  return (
    <div>
      <button onClick={() => showToast({ message: 'Test toast', type: 'success' })}>
        Show Toast
      </button>
      <span data-testid="toast-count">{toasts.length}</span>
    </div>
  );
}

describe('ToastProvider', () => {
  it('should render children', () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>
    );
    expect(screen.getByText('App content')).toBeInTheDocument();
  });

  it('should render notification region', () => {
    render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Notifications');
  });
});

describe('useToast', () => {
  it('should throw when used outside provider', () => {
    expect(() => {
      render(<TestConsumer />);
    }).toThrow();
  });

  it('should show toast when showToast is called', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Toast'));
    });

    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });
});
