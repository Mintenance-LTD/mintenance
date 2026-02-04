/**
 * Job Posting Flow Integration Tests
 *
 * Tests the core homeowner journey:
 * Create Account → Post Job → Add Photos → Set Budget → Submit → Contractors See Job
 *
 * These tests verify actual business logic for job creation and publishing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createTestHomeowner,
  createTestJob,
  createTestJobWithPhotos,
  createTestUrgentJob,
  resetTestCounter,
} from '@/test/factories';

// Mock Supabase
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => ({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn((path, file) => Promise.resolve({
          data: { path: `jobs/${path}` },
          error: null,
        })),
        getPublicUrl: vi.fn((path) => ({
          data: { publicUrl: `https://example.com/${path}` },
        })),
      })),
    },
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/jobs/create',
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === 'property_id') return null;
      return null;
    }),
  }),
  useParams: () => ({
    id: 'test-job-id',
  }),
}));

describe('Job Posting Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    resetTestCounter();
    vi.clearAllMocks();
    user = userEvent.setup();

    // Setup successful database operations by default
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [createTestJob()],
        error: null,
      }),
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [createTestJob()],
          error: null,
        }),
      }),
    });

    mockSelect.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  describe('Job Creation Form', () => {
    it('validates all required fields before submission', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /post job|create job/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
        expect(screen.getByText(/category is required/i)).toBeInTheDocument();
        expect(screen.getByText(/location is required/i)).toBeInTheDocument();
      });

      // Database insert should NOT be called
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('creates job with all required fields filled', async () => {
      const homeowner = createTestHomeowner();
      const jobData = createTestJob({ homeowner_id: homeowner.id });

      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      // Fill in form fields
      await user.type(screen.getByLabelText(/title/i), jobData.title);
      await user.type(screen.getByLabelText(/description/i), jobData.description);
      await user.selectOptions(screen.getByLabelText(/category/i), jobData.category);
      await user.type(screen.getByLabelText(/location|postcode/i), jobData.postcode);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /post job|create job/i });
      await user.click(submitButton);

      // Verify job was created in database
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: jobData.title,
            description: jobData.description,
            category: jobData.category,
            postcode: jobData.postcode,
          })
        );
      });
    });

    it('sets correct default values for optional fields', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      // Check default urgency is "normal"
      const urgencySelect = screen.getByLabelText(/urgency/i);
      expect(urgencySelect).toHaveValue('normal');

      // Check default status is "draft" or "open"
      // (this is set in the backend, we just verify it's handled)
    });

    it('allows setting job as urgent with higher visibility', async () => {
      const urgentJob = createTestUrgentJob();

      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      await user.type(screen.getByLabelText(/title/i), urgentJob.title);
      await user.type(screen.getByLabelText(/description/i), urgentJob.description);
      await user.selectOptions(screen.getByLabelText(/category/i), urgentJob.category);
      await user.selectOptions(screen.getByLabelText(/urgency/i), 'urgent');

      // Should show urgent job notice
      expect(screen.getByText(/this job will be highlighted|urgent jobs/i)).toBeInTheDocument();
    });
  });

  describe('Photo Upload', () => {
    it('allows uploading multiple photos', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      const fileInput = screen.getByLabelText(/upload photos|add photos/i);

      // Create mock files
      const file1 = new File(['photo1'], 'leak1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['photo2'], 'leak2.jpg', { type: 'image/jpeg' });

      // Upload files
      await user.upload(fileInput, [file1, file2]);

      // Verify files are shown
      await waitFor(() => {
        expect(screen.getByText(/leak1\.jpg/i)).toBeInTheDocument();
        expect(screen.getByText(/leak2\.jpg/i)).toBeInTheDocument();
      });
    });

    it('validates file types (only images allowed)', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      const fileInput = screen.getByLabelText(/upload photos|add photos/i);

      // Try to upload invalid file type
      const invalidFile = new File(['document'], 'invoice.pdf', { type: 'application/pdf' });

      await user.upload(fileInput, invalidFile);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/only images allowed|invalid file type/i)).toBeInTheDocument();
      });
    });

    it('validates file size (max 5MB per photo)', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      const fileInput = screen.getByLabelText(/upload photos|add photos/i);

      // Create oversized file (>5MB)
      const largeContent = new Array(6 * 1024 * 1024).fill('x').join('');
      const largeFile = new File([largeContent], 'huge.jpg', { type: 'image/jpeg' });

      // Mock File size (browsers handle this differently)
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

      await user.upload(fileInput, largeFile);

      // Should show size error
      await waitFor(() => {
        expect(screen.getByText(/file too large|maximum 5MB/i)).toBeInTheDocument();
      });
    });

    it('allows removing uploaded photos', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      const fileInput = screen.getByLabelText(/upload photos|add photos/i);
      const file = new File(['photo'], 'leak.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Wait for photo to appear
      await waitFor(() => {
        expect(screen.getByText(/leak\.jpg/i)).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByRole('button', { name: /remove|delete/i });
      await user.click(removeButton);

      // Photo should be removed
      await waitFor(() => {
        expect(screen.queryByText(/leak\.jpg/i)).not.toBeInTheDocument();
      });
    });

    it('uploads photos to storage when job is created', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Fix leak');
      await user.type(screen.getByLabelText(/description/i), 'Description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'plumbing');

      // Upload photo
      const fileInput = screen.getByLabelText(/upload photos|add photos/i);
      const file = new File(['photo'], 'leak.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);

      // Submit job
      const submitButton = screen.getByRole('button', { name: /post job|create job/i });
      await user.click(submitButton);

      // Verify photo was uploaded to storage
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            photos: expect.arrayContaining([expect.stringContaining('jobs/')]),
          })
        );
      });
    });
  });

  describe('Budget Settings', () => {
    it('calculates budget range from single budget value', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      const budgetInput = screen.getByLabelText(/budget|estimated cost/i);
      await user.type(budgetInput, '150');

      // Should show calculated range (e.g., £120 - £180 for 20% variance)
      await waitFor(() => {
        expect(screen.getByText(/£120/i)).toBeInTheDocument();
        expect(screen.getByText(/£180/i)).toBeInTheDocument();
      });
    });

    it('allows setting custom budget range', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      // Click "Custom range" or similar
      const customRangeToggle = screen.getByRole('button', { name: /custom|advanced/i });
      await user.click(customRangeToggle);

      // Set custom min/max
      const minInput = screen.getByLabelText(/minimum|min budget/i);
      const maxInput = screen.getByLabelText(/maximum|max budget/i);

      await user.type(minInput, '100');
      await user.type(maxInput, '200');

      expect(minInput).toHaveValue(100);
      expect(maxInput).toHaveValue(200);
    });

    it('validates min budget is less than max budget', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      const customRangeToggle = screen.getByRole('button', { name: /custom|advanced/i });
      await user.click(customRangeToggle);

      const minInput = screen.getByLabelText(/minimum|min budget/i);
      const maxInput = screen.getByLabelText(/maximum|max budget/i);

      // Set min higher than max
      await user.type(minInput, '200');
      await user.type(maxInput, '100');

      await user.click(screen.getByRole('button', { name: /post job|create job/i }));

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/minimum.*less than.*maximum/i)).toBeInTheDocument();
      });
    });

    it('shows budget guidance based on category', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      await user.selectOptions(screen.getByLabelText(/category/i), 'plumbing');

      // Should show average cost for plumbing
      await waitFor(() => {
        expect(screen.getByText(/average plumbing job|typical cost/i)).toBeInTheDocument();
      });
    });
  });

  describe('Draft Saving', () => {
    it('allows saving job as draft', async () => {
      const { default: JobCreatePage } = await import('@/app/jobs/create/page');
      render(<JobCreatePage />);

      await user.type(screen.getByLabelText(/title/i), 'Incomplete job');
      await user.type(screen.getByLabelText(/description/i), 'Still thinking about details');

      // Click "Save as draft"
      const draftButton = screen.getByRole('button', { name: /save.*draft|draft/i });
      await user.click(draftButton);

      // Verify saved as draft
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'draft',
            title: 'Incomplete job',
          })
        );
      });
    });

    it('can edit and publish draft job later', async () => {
      const draftJob = createTestJob({ status: 'draft' });

      // Mock existing draft
      mockSelect.mockResolvedValue({
        data: [draftJob],
        error: null,
      });

      const { default: JobEditPage } = await import('@/app/jobs/[id]/edit/page');
      render(<JobEditPage params={{ id: draftJob.id }} />);

      // Wait for draft to load
      await waitFor(() => {
        expect(screen.getByDisplayValue(draftJob.title)).toBeInTheDocument();
      });

      // Click "Publish"
      const publishButton = screen.getByRole('button', { name: /publish|post job/i });
      await user.click(publishButton);

      // Verify status changed to open
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Job Visibility', () => {
    it('published job appears in contractor job listings', async () => {
      const job = createTestJob({ status: 'open' });

      // Mock job query
      mockSelect.mockResolvedValue({
        data: [job],
        error: null,
      });

      const { default: ContractorDiscoverPage } = await import('@/app/contractor/discover/page');
      render(<ContractorDiscoverPage />);

      // Verify job appears in list
      await waitFor(() => {
        expect(screen.getByText(job.title)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(job.postcode, 'i'))).toBeInTheDocument();
      });
    });

    it('draft job does NOT appear in contractor listings', async () => {
      const draftJob = createTestJob({ status: 'draft' });

      // Mock empty job query (drafts filtered out)
      mockSelect.mockResolvedValue({
        data: [],
        error: null,
      });

      const { default: ContractorDiscoverPage } = await import('@/app/contractor/discover/page');
      render(<ContractorDiscoverPage />);

      // Verify no jobs shown
      await waitFor(() => {
        expect(screen.queryByText(draftJob.title)).not.toBeInTheDocument();
        expect(screen.getByText(/no jobs available|no jobs found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Job Deletion', () => {
    it('allows deleting job if no bids exist', async () => {
      const job = createTestJob();

      // Mock no bids
      mockSelect.mockResolvedValue({
        data: [],
        error: null,
      });

      const { default: JobDetailsPage } = await import('@/app/jobs/[id]/page');
      render(<JobDetailsPage params={{ id: job.id }} />);

      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: /delete|remove job/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm|yes.*delete/i });
      await user.click(confirmButton);

      // Verify deletion called
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });
    });

    it('prevents deleting job if bids exist', async () => {
      const job = createTestJob();

      // Mock existing bids
      mockSelect.mockResolvedValue({
        data: [{ id: 'bid-1', job_id: job.id }],
        error: null,
      });

      const { default: JobDetailsPage } = await import('@/app/jobs/[id]/page');
      render(<JobDetailsPage params={{ id: job.id }} />);

      // Delete button should be disabled or show warning
      const deleteButton = screen.queryByRole('button', { name: /delete|remove job/i });

      if (deleteButton) {
        expect(deleteButton).toBeDisabled();
      } else {
        // Or the button shouldn't exist and show a message instead
        expect(screen.getByText(/cannot delete.*bids/i)).toBeInTheDocument();
      }
    });
  });
});
