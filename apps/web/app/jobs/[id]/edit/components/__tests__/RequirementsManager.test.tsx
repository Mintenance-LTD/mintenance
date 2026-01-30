import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequirementsManager } from '../RequirementsManager';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock MotionDiv
vi.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('RequirementsManager', () => {
  const mockOnRequirementsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with empty requirements', () => {
    render(
      <RequirementsManager
        requirements={[]}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    expect(screen.getByText(/No special requirements added/)).toBeInTheDocument();
    expect(screen.getByText('0/10 requirements')).toBeInTheDocument();
  });

  it('renders existing requirements', () => {
    const requirements = ['Must have insurance', 'Weekend work only'];

    render(
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    expect(screen.getByText('Must have insurance')).toBeInTheDocument();
    expect(screen.getByText('Weekend work only')).toBeInTheDocument();
    expect(screen.getByText('2/10 requirements')).toBeInTheDocument();
  });

  it('adds a new requirement', async () => {
    render(
      <RequirementsManager
        requirements={[]}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter a special requirement...');
    const addButton = screen.getByRole('button', { name: /Add/i });

    fireEvent.change(input, { target: { value: 'New requirement' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnRequirementsChange).toHaveBeenCalledWith(['New requirement']);
      expect(toast.success).toHaveBeenCalledWith('Requirement added');
    });
  });

  it('adds requirement on Enter key', async () => {
    render(
      <RequirementsManager
        requirements={[]}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter a special requirement...');

    fireEvent.change(input, { target: { value: 'Enter key requirement' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

    await waitFor(() => {
      expect(mockOnRequirementsChange).toHaveBeenCalledWith(['Enter key requirement']);
    });
  });

  it('shows error for empty requirement', async () => {
    render(
      <RequirementsManager
        requirements={[]}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please enter a requirement');
      expect(mockOnRequirementsChange).not.toHaveBeenCalled();
    });
  });

  it('prevents duplicate requirements', async () => {
    render(
      <RequirementsManager
        requirements={['Existing requirement']}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter a special requirement...');
    const addButton = screen.getByRole('button', { name: /Add/i });

    fireEvent.change(input, { target: { value: 'Existing requirement' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('This requirement already exists');
      expect(mockOnRequirementsChange).not.toHaveBeenCalled();
    });
  });

  it('enforces maximum requirements limit', async () => {
    const maxRequirements = Array.from({ length: 10 }, (_, i) => `Requirement ${i + 1}`);

    render(
      <RequirementsManager
        requirements={maxRequirements}
        onRequirementsChange={mockOnRequirementsChange}
        maxRequirements={10}
      />
    );

    expect(screen.queryByPlaceholderText('Enter a special requirement...')).not.toBeInTheDocument();
    expect(screen.getByText('10/10 requirements')).toBeInTheDocument();
  });

  it('removes a requirement', async () => {
    const requirements = ['First', 'Second', 'Third'];

    render(
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const removeButtons = screen.getAllByLabelText(/Remove requirement:/);
    fireEvent.click(removeButtons[1]); // Remove 'Second'

    await waitFor(() => {
      expect(mockOnRequirementsChange).toHaveBeenCalledWith(['First', 'Third']);
      expect(toast.success).toHaveBeenCalledWith('Requirement removed');
    });
  });

  it('shows character count warning', () => {
    render(
      <RequirementsManager
        requirements={[]}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter a special requirement...');
    const longText = 'a'.repeat(160); // Over 150 characters

    fireEvent.change(input, { target: { value: longText } });

    expect(screen.getByText(/40 characters remaining/)).toBeInTheDocument();
  });

  it('trims whitespace from requirements', async () => {
    render(
      <RequirementsManager
        requirements={[]}
        onRequirementsChange={mockOnRequirementsChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter a special requirement...');
    const addButton = screen.getByRole('button', { name: /Add/i });

    fireEvent.change(input, { target: { value: '  Trimmed requirement  ' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnRequirementsChange).toHaveBeenCalledWith(['Trimmed requirement']);
    });
  });
});