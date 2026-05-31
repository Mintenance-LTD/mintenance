// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import CreateJobPage from '@/app/jobs/create/page';
import QuickJobPage from '@/app/jobs/quick-create/page';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { submitJob } from '@/app/jobs/create/utils/submitJob';
import toast from 'react-hot-toast';

/**
 * Unit Tests: Job Creation Components
 * Tests the job creation forms and validation logic
 */

// Mock dependencies
// A single stable URLSearchParams instance — returning a fresh object on
// every render makes `searchParams` an unstable effect/useCallback dep,
// which sends the property-fetch effect into an infinite re-render loop
// ("Maximum update depth exceeded"). The real next/navigation hook returns
// a referentially-stable object per navigation, so this mirrors prod.
const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: new URLSearchParams(),
}));
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useRouter: vi.fn(),
    useSearchParams: vi.fn(() => mockSearchParams),
  };
});
vi.mock('@/hooks/useCurrentUser');
vi.mock('@/lib/hooks/useCSRF');
vi.mock('@/app/jobs/create/utils/submitJob');
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: mockToast,
  toast: mockToast,
}));

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
};

const mockUser = {
  id: 'user-123',
  email: 'homeowner@test.com',
  role: 'homeowner',
  first_name: 'John',
  last_name: 'Doe',
};

// Property IDs must be valid UUIDs: the canonical createJobRequestSchema
// in @mintenance/api-contracts validates `propertyId` with z.uuid() (the
// submit-time safety net added to validation.ts on 2026-05-01). The old
// 'prop-123' placeholders failed that check, so the form never submitted.
const PROP_HOUSE_ID = '11111111-1111-4111-8111-111111111111';
const PROP_RENTAL_ID = '22222222-2222-4222-8222-222222222222';

const mockProperties = [
  {
    id: PROP_HOUSE_ID,
    property_name: 'My House',
    address: '123 Main St, London',
    property_type: 'house',
    photos: ['/house.jpg'],
  },
  {
    id: PROP_RENTAL_ID,
    property_name: 'Rental Property',
    address: '456 Oak Ave, London',
    property_type: 'apartment',
    photos: ['/apartment.jpg'],
  },
];

describe('CreateJobPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser,
      loading: false,
    });
    vi.mocked(useCSRF).mockReturnValue({ csrfToken: 'test-token' });

    // Mock fetch for properties - must include ok/status for Response checks
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ properties: mockProperties }),
      })
    ) as any;
  });

  describe('Step 1: Property and Details', () => {
    it('should render property selection', async () => {
      render(<CreateJobPage />);

      await waitFor(() => {
        expect(screen.getByText('My House')).toBeInTheDocument();
        expect(screen.getByText('Rental Property')).toBeInTheDocument();
      });
    });

    it('should select a property when clicked', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await waitFor(() => {
        expect(screen.getByText('My House')).toBeInTheDocument();
      });

      const propertyButton = screen.getByText('My House').closest('button');
      await user.click(propertyButton!);

      // Property should be selected. The Mint Editorial redesign (2026-05)
      // dropped Tailwind `border-teal-600` for inline `--me-*` tokens; the
      // active state is the brand-soft background fill.
      expect(propertyButton!.getAttribute('style')).toContain(
        'background: var(--me-brand-soft)'
      );
    });

    it('should select service category', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      const plumbingButton = await screen.findByText('Plumbing');
      await user.click(plumbingButton.closest('button')!);

      // Active category uses the Mint Editorial brand-soft fill (no Tailwind).
      expect(plumbingButton.closest('button')!.getAttribute('style')).toContain(
        'background: var(--me-brand-soft)'
      );
    });

    it('should validate required fields before proceeding', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Should not proceed without required fields
      expect(screen.getByText('What do you need done?')).toBeInTheDocument();
    });

    it('should fill in job title and description', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      const titleInput = screen.getByPlaceholderText(/Fix leaking/i);
      const descriptionTextarea =
        screen.getByPlaceholderText(/provide details/i);

      await user.type(titleInput, 'Fix bathroom leak');
      await user.type(descriptionTextarea, 'The tap is leaking constantly');

      expect(titleInput).toHaveValue('Fix bathroom leak');
      expect(descriptionTextarea).toHaveValue('The tap is leaking constantly');
    });
  });

  describe('Step 2: Photos', () => {
    it('should handle file upload', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      // Navigate to step 2
      await completeStep1(user);

      const file = new File(['photo'], 'leak.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(
          screen.getByText(/Uploaded photos \(1\/10\)/)
        ).toBeInTheDocument();
      });
    });

    it('should remove uploaded photo', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);

      const file = new File(['photo'], 'leak.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await user.upload(input, file);

      // The remove button now carries an accessible name ("Remove photo 1").
      const removeButton = screen.getByRole('button', {
        name: /remove photo/i,
      });
      await user.click(removeButton);

      expect(screen.queryByText(/Uploaded photos/)).not.toBeInTheDocument();
    });
  });

  describe('Step 3: Budget and Timeline', () => {
    it('should reach the timeline step (budget input removed 2026-05-22)', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      await completeStep2(user);

      // The homeowner-facing budget field was removed 2026-05-22 — contractors
      // now bid their own price. Step 3 is purely the timeline step.
      expect(
        screen.queryByPlaceholderText(/Enter maximum budget/i)
      ).not.toBeInTheDocument();
      expect(screen.getByText('Set your timeline')).toBeInTheDocument();
      expect(
        screen.getByText('When do you need this done?')
      ).toBeInTheDocument();
    });

    it('should select urgency level', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      await completeStep2(user);

      const urgentButton = screen.getByText('Urgent');
      await user.click(urgentButton.closest('button')!);

      // Active urgency uses the Mint Editorial brand-soft fill (no Tailwind).
      expect(urgentButton.closest('button')!.getAttribute('style')).toContain(
        'background: var(--me-brand-soft)'
      );
    });

    it('should set preferred date', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      await completeStep2(user);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      // Label not associated via htmlFor, find the input by type within the date section
      const dateLabel = screen.getByText(/Preferred start date/i);
      const dateInput = dateLabel.parentElement!.querySelector(
        'input[type="date"]'
      ) as HTMLInputElement;
      await fireEvent.change(dateInput, { target: { value: dateString } });

      expect(dateInput).toHaveValue(dateString);
    });
  });

  describe('Step 4: Review and Submit', () => {
    it('should display job summary', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeAllSteps(user);

      // Check summary displays entered information. Budget was removed from
      // the review summary 2026-05-22; the summary now shows the selected
      // urgency in the Timeline section instead.
      expect(screen.getByText('Fix bathroom leak')).toBeInTheDocument();
      expect(screen.getByText('My House')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('should submit job successfully', async () => {
      const user = userEvent.setup();
      vi.mocked(submitJob).mockResolvedValue({
        success: true,
        jobId: 'job-123',
      });

      render(<CreateJobPage />);

      await completeAllSteps(user);

      // Submit button copy is "Post job" in the Mint Editorial redesign.
      const postButton = screen.getByText('Post job');
      await user.click(postButton);

      await waitFor(() => {
        // `budget` was removed from JobFormData 2026-05-22 — contractors bid
        // their own price, so it is no longer part of the submit payload.
        expect(submitJob).toHaveBeenCalledWith(
          expect.objectContaining({
            formData: expect.objectContaining({
              title: 'Fix bathroom leak',
              category: 'plumbing',
              property_id: PROP_HOUSE_ID,
            }),
            photoUrls: [],
            csrfToken: 'test-token',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith(
          'Job posted successfully!'
        );
        expect(mockRouter.push).toHaveBeenCalledWith('/jobs/job-123');
      });
    });

    it('should handle submission error', async () => {
      const user = userEvent.setup();
      vi.mocked(submitJob).mockRejectedValue(new Error('Network error'));

      render(<CreateJobPage />);

      await completeAllSteps(user);

      const postButton = screen.getByText('Post job');
      await user.click(postButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate between steps', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      expect(
        screen.getByText('Add photos of your project')
      ).toBeInTheDocument();

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(screen.getByText('What do you need done?')).toBeInTheDocument();
    });

    it('should cancel and go back', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});

describe('QuickJobPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser,
      loading: false,
    });
    vi.mocked(useCSRF).mockReturnValue({ csrfToken: 'test-token' });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ properties: mockProperties }),
      })
    ) as any;
  });

  it('should render repair templates', () => {
    render(<QuickJobPage />);

    expect(screen.getByText('Leaky Tap/Pipe')).toBeInTheDocument();
    expect(screen.getByText('Electrical Issue')).toBeInTheDocument();
    expect(screen.getByText('Painting/Touch-up')).toBeInTheDocument();
    expect(screen.getByText('General Repair')).toBeInTheDocument();
  });

  it('should select template and pre-fill form', async () => {
    const user = userEvent.setup();
    render(<QuickJobPage />);

    const template = screen.getByText('Leaky Tap/Pipe');
    await user.click(template.closest('button')!);

    const titleInput = screen.getByPlaceholderText(/Leaking kitchen tap/i);
    expect(titleInput).toHaveValue('Leaky Tap/Pipe');
  });

  it('should not show budget range (removed 2026-05-22)', () => {
    render(<QuickJobPage />);

    // The quick-create budget-range selector was removed 2026-05-22 —
    // contractors now bid their own price. The form should still render its
    // title input and have no budget option.
    expect(screen.queryByText('£100-200')).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Leaking kitchen tap/i)
    ).toBeInTheDocument();
  });

  it('should select urgency', async () => {
    const user = userEvent.setup();
    render(<QuickJobPage />);

    const urgencyButton = screen.getByText('Today');
    await user.click(urgencyButton);

    expect(urgencyButton).toHaveClass('border-teal-600');
  });

  it('should submit quick job', async () => {
    const user = userEvent.setup();
    vi.mocked(submitJob).mockResolvedValue({
      success: true,
      jobId: 'quick-job-123',
    });

    render(<QuickJobPage />);

    // Select template
    await user.click(screen.getByText('Leaky Tap/Pipe').closest('button')!);

    // Wait for properties to load and submit button to show "Post Job"
    const submitButton = await screen.findByText('Post Job');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitJob).toHaveBeenCalledWith(
        expect.objectContaining({
          formData: expect.objectContaining({
            title: 'Leaky Tap/Pipe',
            category: 'plumbing',
          }),
          photoUrls: [],
          csrfToken: expect.any(String),
        })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/jobs/quick-job-123');
    });
  });

  it('should show link to detailed form', () => {
    render(<QuickJobPage />);

    const detailedFormLink = screen.getByText('Use detailed form');
    expect(detailedFormLink).toBeInTheDocument();
  });
});

// Helper functions for testing
async function completeStep1(user: ReturnType<typeof userEvent.setup>) {
  // Select property
  const propertyButton = await screen.findByText('My House');
  await user.click(propertyButton.closest('button')!);

  // Select category
  const categoryButton = screen.getByText('Plumbing');
  await user.click(categoryButton.closest('button')!);

  // Fill title and description
  const titleInput = screen.getByPlaceholderText(/Fix leaking/i);
  await user.type(titleInput, 'Fix bathroom leak');

  const descriptionTextarea = screen.getByPlaceholderText(/provide details/i);
  await user.type(
    descriptionTextarea,
    'The bathroom tap has been leaking for a week and needs repair'
  );

  // Click Next
  const nextButton = screen.getByText('Next');
  await user.click(nextButton);
}

async function completeStep2(user: ReturnType<typeof userEvent.setup>) {
  // Photos are required on every job (2026-05-22) — the Next button on the
  // photos step stays disabled until at least one image is added, so we must
  // upload one before advancing.
  const file = new File(['photo'], 'leak.jpg', { type: 'image/jpeg' });
  const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
  await user.upload(input, file);

  await waitFor(() => {
    expect(screen.getByText(/Uploaded photos/)).toBeInTheDocument();
  });

  const nextButton = screen.getByText('Next');
  await user.click(nextButton);
}

async function completeStep3(user: ReturnType<typeof userEvent.setup>) {
  // Budget input was removed 2026-05-22 (contractors now bid their own
  // price). Step 3 is the timeline step — selecting an urgency is what
  // unlocks the Next button (canProceedStep3 === !!formData.urgency).
  const urgencyButton = screen.getByText('Urgent');
  await user.click(urgencyButton.closest('button')!);

  // Click Next
  const nextButton = screen.getByText('Next');
  await user.click(nextButton);
}

async function completeAllSteps(user: ReturnType<typeof userEvent.setup>) {
  await completeStep1(user);
  await completeStep2(user);
  await completeStep3(user);
}
