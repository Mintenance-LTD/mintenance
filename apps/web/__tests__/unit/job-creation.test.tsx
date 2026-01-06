import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
jest.mock('next/navigation');
jest.mock('@/hooks/useCurrentUser');
jest.mock('@/lib/hooks/useCSRF');
jest.mock('@/app/jobs/create/utils/submitJob');
jest.mock('react-hot-toast');

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
};

const mockUser = {
  id: 'user-123',
  email: 'homeowner@test.com',
  role: 'homeowner',
  first_name: 'John',
  last_name: 'Doe',
};

const mockProperties = [
  {
    id: 'prop-123',
    property_name: 'My House',
    address: '123 Main St, London',
    property_type: 'house',
    photos: ['/house.jpg'],
  },
  {
    id: 'prop-456',
    property_name: 'Rental Property',
    address: '456 Oak Ave, London',
    property_type: 'apartment',
    photos: ['/apartment.jpg'],
  },
];

describe('CreateJobPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });
    (useCSRF as jest.Mock).mockReturnValue({ csrfToken: 'test-token' });

    // Mock fetch for properties
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ properties: mockProperties }),
      })
    ) as jest.Mock;
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

      // Property should be selected (check for visual indicator)
      expect(propertyButton).toHaveClass('border-teal-600');
    });

    it('should select service category', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      const plumbingButton = await screen.findByText('Plumbing');
      await user.click(plumbingButton.closest('button')!);

      expect(plumbingButton.closest('button')).toHaveClass('border-teal-600');
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
      const descriptionTextarea = screen.getByPlaceholderText(/provide details/i);

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
        expect(screen.getByText(/Uploaded Photos \(1\/10\)/)).toBeInTheDocument();
      });
    });

    it('should remove uploaded photo', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);

      const file = new File(['photo'], 'leak.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await user.upload(input, file);

      const removeButton = await screen.findByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(screen.queryByText(/Uploaded Photos/)).not.toBeInTheDocument();
    });
  });

  describe('Step 3: Budget and Timeline', () => {
    it('should set budget amount', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      await completeStep2(user);

      const budgetInput = screen.getByPlaceholderText(/Enter your budget/i);
      await user.type(budgetInput, '250');

      expect(budgetInput).toHaveValue(250);
      expect(screen.getByText('£250')).toBeInTheDocument();
    });

    it('should select urgency level', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      await completeStep2(user);

      const urgentButton = screen.getByText('Urgent');
      await user.click(urgentButton.closest('button')!);

      expect(urgentButton.closest('button')).toHaveClass('border-teal-600');
    });

    it('should set preferred date', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      await completeStep2(user);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const dateInput = screen.getByLabelText(/Preferred start date/i);
      await user.type(dateInput, dateString);

      expect(dateInput).toHaveValue(dateString);
    });
  });

  describe('Step 4: Review and Submit', () => {
    it('should display job summary', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeAllSteps(user);

      // Check summary displays entered information
      expect(screen.getByText('Fix bathroom leak')).toBeInTheDocument();
      expect(screen.getByText('£250')).toBeInTheDocument();
      expect(screen.getByText('My House')).toBeInTheDocument();
    });

    it('should submit job successfully', async () => {
      const user = userEvent.setup();
      (submitJob as jest.Mock).mockResolvedValue({ jobId: 'job-123' });

      render(<CreateJobPage />);

      await completeAllSteps(user);

      const postButton = screen.getByText('Post Job');
      await user.click(postButton);

      await waitFor(() => {
        expect(submitJob).toHaveBeenCalledWith({
          formData: expect.objectContaining({
            title: 'Fix bathroom leak',
            category: 'plumbing',
            budget: '250',
            property_id: 'prop-123',
          }),
          photoUrls: [],
          csrfToken: 'test-token',
        });
        expect(toast.success).toHaveBeenCalledWith('Job posted successfully!');
        expect(mockRouter.push).toHaveBeenCalledWith('/jobs/job-123');
      });
    });

    it('should handle submission error', async () => {
      const user = userEvent.setup();
      (submitJob as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<CreateJobPage />);

      await completeAllSteps(user);

      const postButton = screen.getByText('Post Job');
      await user.click(postButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate between steps', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await completeStep1(user);
      expect(screen.getByText('Add photos of your project')).toBeInTheDocument();

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
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ properties: mockProperties }),
      })
    ) as jest.Mock;
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

    const titleInput = screen.getByLabelText(/What needs fixing/i);
    expect(titleInput).toHaveValue('Leaky Tap/Pipe');
  });

  it('should select budget range', async () => {
    const user = userEvent.setup();
    render(<QuickJobPage />);

    const budgetButton = screen.getByText('£100-200');
    await user.click(budgetButton);

    expect(budgetButton).toHaveClass('border-teal-600');
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
    (submitJob as jest.Mock).mockResolvedValue({ jobId: 'quick-job-123' });

    render(<QuickJobPage />);

    // Select template
    await user.click(screen.getByText('Leaky Tap/Pipe').closest('button')!);

    // Submit
    const submitButton = screen.getByText('Post Job');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitJob).toHaveBeenCalledWith({
        formData: expect.objectContaining({
          title: 'Leaky Tap/Pipe',
          category: 'plumbing',
        }),
        photoUrls: [],
        csrfToken: expect.any(String),
      });
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
  await user.type(descriptionTextarea, 'The bathroom tap has been leaking for a week and needs repair');

  // Click Next
  const nextButton = screen.getByText('Next');
  await user.click(nextButton);
}

async function completeStep2(user: ReturnType<typeof userEvent.setup>) {
  // Skip photos - they're optional
  const nextButton = screen.getByText('Next');
  await user.click(nextButton);
}

async function completeStep3(user: ReturnType<typeof userEvent.setup>) {
  // Set budget
  const budgetInput = screen.getByPlaceholderText(/Enter your budget/i);
  await user.type(budgetInput, '250');

  // Select urgency
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