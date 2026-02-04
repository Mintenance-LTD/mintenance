import { render, screen } from '@testing-library/react';
import { MilestoneEditor } from '../MilestoneEditor';
import type { ProjectTimeline } from '@mintenance/types';

// Mock UI components
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/Input', () => ({
  Input: ({ value, onChange }: { value: string; onChange?: (e: any) => void }) => (
    <input value={value} onChange={onChange} />
  ),
}));

const mockTimeline: ProjectTimeline = {
  id: 'timeline-1',
  title: 'Project Timeline',
  startDate: '2026-01-01',
  estimatedEndDate: '2026-12-31',
  status: 'active',
  priority: 'high',
  milestones: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  job_id: 'job-1',
};

describe('MilestoneEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('should not render when isVisible is false', () => {
    const { container } = render(
      <MilestoneEditor
        timeline={mockTimeline}
        isVisible={false}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render when isVisible is true', () => {
    render(
      <MilestoneEditor
        timeline={mockTimeline}
        isVisible={true}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('should render with new milestone defaults', () => {
    const { container } = render(
      <MilestoneEditor
        timeline={mockTimeline}
        isVisible={true}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Should render the form
    expect(container.querySelector('input')).toBeInTheDocument();
  });
});