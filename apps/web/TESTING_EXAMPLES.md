# Testing Examples - Mintenance

## Real-World Testing Examples

This document provides copy-paste examples for common testing scenarios in the Mintenance platform.

## Table of Contents

1. [Component Tests](#component-tests)
2. [Hook Tests](#hook-tests)
3. [API Route Tests](#api-route-tests)
4. [Form Tests](#form-tests)
5. [Authentication Tests](#authentication-tests)
6. [Payment Tests](#payment-tests)
7. [Real-time Tests](#real-time-tests)
8. [Accessibility Tests](#accessibility-tests)

---

## Component Tests

### Simple Button Component

```typescript
// components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should apply variant styles', () => {
    render(<Button variant="primary">Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-teal-600');
  });
});
```

### Job Card Component

```typescript
// components/jobs/JobCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, mockJob } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { JobCard } from './JobCard';

describe('JobCard', () => {
  const defaultProps = {
    job: mockJob({ title: 'Fix leaking tap', budget: 150 }),
    onSelect: vi.fn(),
  };

  it('should display job details', () => {
    renderWithProviders(<JobCard {...defaultProps} />);

    expect(screen.getByText('Fix leaking tap')).toBeInTheDocument();
    expect(screen.getByText('£150')).toBeInTheDocument();
    expect(screen.getByText(/plumbing/i)).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobCard {...defaultProps} />);

    await user.click(screen.getByTestId('job-card'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(defaultProps.job);
  });

  it('should show urgency badge for urgent jobs', () => {
    const urgentJob = mockJob({ urgency: 'urgent' });
    renderWithProviders(<JobCard {...defaultProps} job={urgentJob} />);

    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
  });

  it('should display contractor count when bids exist', () => {
    const jobWithBids = mockJob({ bid_count: 5 });
    renderWithProviders(<JobCard {...defaultProps} job={jobWithBids} />);

    expect(screen.getByText(/5 bids/i)).toBeInTheDocument();
  });
});
```

### Modal Dialog Component

```typescript
// components/ui/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('should render when open is true', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('should trap focus within modal', async () => {
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={vi.fn()}>
        <input data-testid="input-1" />
        <input data-testid="input-2" />
      </Modal>
    );

    const input1 = screen.getByTestId('input-1');
    const input2 = screen.getByTestId('input-2');

    input1.focus();
    expect(input1).toHaveFocus();

    await user.tab();
    expect(input2).toHaveFocus();

    // Should cycle back to first focusable element
    await user.tab();
    expect(input1).toHaveFocus();
  });
});
```

---

## Hook Tests

### useJobs Hook (React Query)

```typescript
// hooks/useJobs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobs } from './useJobs';
import { mockJob, mockApiResponse } from '@/test/utils';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch jobs successfully', async () => {
    const mockJobs = [mockJob(), mockJob()];

    global.fetch = vi.fn(() =>
      Promise.resolve(mockApiResponse.success({ jobs: mockJobs }))
    ) as any;

    const { result } = renderHook(() => useJobs(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.jobs).toEqual(mockJobs);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(mockApiResponse.error('Failed to fetch', 500))
    ) as any;

    const { result } = renderHook(() => useJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.jobs).toBeUndefined();
  });

  it('should filter jobs by category', async () => {
    const { result } = renderHook(() => useJobs({ category: 'plumbing' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('category=plumbing'),
      expect.any(Object)
    );
  });
});
```

### useDebounce Hook

```typescript
// hooks/useDebounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now it should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel debounce on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    rerender({ value: 'updated', delay: 500 });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('initial');
  });
});
```

---

## API Route Tests

### Jobs API Route

```typescript
// app/api/jobs/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './route';
import { mockJob, mockUser, mockSupabaseQuery } from '@/test/utils';

vi.mock('@/lib/api/supabaseServer');
vi.mock('@/lib/auth');

describe('Jobs API', () => {
  const createRequest = (options: any = {}) =>
    new Request(`http://localhost/api/jobs${options.path || ''}`, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('should return jobs list', async () => {
      const mockJobs = [mockJob(), mockJob()];

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSupabaseQuery.success(mockJobs)),
      });

      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobs).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(
          mockSupabaseQuery.error('Database error')
        ),
      });

      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a new job', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner());

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              mockSupabaseQuery.success({ id: 'new-job', title: 'Test' })
            ),
          }),
        }),
      });

      const body = {
        title: 'Fix leak',
        category: 'plumbing',
        budget: 150,
      };

      const request = createRequest({ method: 'POST', body });
      const response = await POST(request);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.job.id).toBeDefined();
    });

    it('should require authentication', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockRejectedValue(new Error('Unauthorized'));

      const request = createRequest({
        method: 'POST',
        body: { title: 'Test' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner());

      const request = createRequest({
        method: 'POST',
        body: { description: 'Missing title' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
```

---

## Form Tests

### Job Creation Form

```typescript
// app/jobs/create/JobCreateForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { JobCreateForm } from './JobCreateForm';

describe('JobCreateForm', () => {
  const mockOnSubmit = vi.fn();

  it('should render all form fields', () => {
    renderWithProviders(<JobCreateForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobCreateForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit valid form data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobCreateForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/title/i), 'Fix leaking tap');
    await user.type(screen.getByLabelText(/description/i), 'Kitchen tap leaks');
    await user.selectOptions(screen.getByLabelText(/category/i), 'plumbing');
    await user.type(screen.getByLabelText(/budget/i), '150');

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Fix leaking tap',
        description: 'Kitchen tap leaks',
        category: 'plumbing',
        budget: 150,
      });
    });
  });

  it('should validate budget is positive number', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobCreateForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/budget/i), '-50');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/budget must be positive/i)).toBeInTheDocument();
  });

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    renderWithProviders(<JobCreateForm onSubmit={mockOnSubmit} />);

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'Test');
    await user.selectOptions(screen.getByLabelText(/category/i), 'plumbing');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();
  });
});
```

---

## Authentication Tests

### Login Form

```typescript
// app/login/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    renderWithProviders(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it('should call login API with credentials', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { id: '123' } }),
      })
    ) as any;

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: expect.stringContaining('test@example.com'),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
    });
  });

  it('should display error message on failed login', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      })
    ) as any;

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

---

## Payment Tests

### Payment Form (Stripe)

```typescript
// components/payments/PaymentForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './PaymentForm';

// Mock Stripe
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({
    confirmPayment: vi.fn(() => Promise.resolve({ error: null })),
  }),
  useElements: () => ({
    getElement: vi.fn(),
  }),
  CardElement: () => <div data-testid="card-element">Card Input</div>,
}));

describe('PaymentForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  it('should render payment form', () => {
    renderWithProviders(
      <PaymentForm
        amount={150}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/£150/i)).toBeInTheDocument();
    expect(screen.getByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument();
  });

  it('should process payment successfully', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <PaymentForm
        amount={150}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    await user.click(screen.getByRole('button', { name: /pay now/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle payment errors', async () => {
    const user = userEvent.setup();

    // Mock Stripe error
    const { useStripe } = await import('@stripe/react-stripe-js');
    (useStripe as any).mockReturnValue({
      confirmPayment: vi.fn(() =>
        Promise.resolve({ error: { message: 'Card declined' } })
      ),
    });

    renderWithProviders(
      <PaymentForm
        amount={150}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    await user.click(screen.getByRole('button', { name: /pay now/i }));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Card declined');
    });
  });
});
```

---

## Accessibility Tests

### Check ARIA Labels and Keyboard Navigation

```typescript
// components/JobCard.a11y.test.tsx
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, mockJob } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { JobCard } from './JobCard';

expect.extend(toHaveNoViolations);

describe('JobCard Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = renderWithProviders(<JobCard job={mockJob()} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels', () => {
    renderWithProviders(<JobCard job={mockJob({ title: 'Fix tap' })} />);

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Fix tap')
    );
  });

  it('should support keyboard navigation', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<JobCard job={mockJob()} onSelect={onSelect} />);

    // Tab to focus
    await user.tab();
    expect(screen.getByTestId('job-card')).toHaveFocus();

    // Enter to select
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalled();
  });

  it('should have sufficient color contrast', () => {
    renderWithProviders(<JobCard job={mockJob()} />);

    const title = screen.getByRole('heading');
    const styles = window.getComputedStyle(title);

    // Check that text is not gray on gray
    expect(styles.color).not.toBe(styles.backgroundColor);
  });
});
```

---

## Summary

These examples cover the most common testing scenarios in the Mintenance platform:

- **Component Tests**: UI components with user interactions
- **Hook Tests**: Custom React hooks with React Query
- **API Tests**: Next.js API routes with authentication
- **Form Tests**: Form validation and submission
- **Auth Tests**: Login/signup flows
- **Payment Tests**: Stripe payment integration
- **Accessibility Tests**: ARIA labels and keyboard navigation

Copy these patterns and adapt them to your specific components!
