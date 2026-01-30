import { render, screen } from '@testing-library/react';
import { TimelineView } from '../TimelineView';
import type { ProjectTimeline, ProjectProgress } from '@mintenance/types';

// Mock Card and Button components
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div data-testid="card" style={style}>{children}</div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

const mockTimeline: ProjectTimeline = {
  id: 'timeline-1',
  title: 'Project Alpha Timeline',
  description: 'Timeline for Project Alpha',
  startDate: '2026-01-01',
  estimatedEndDate: '2026-06-30',
  status: 'active',
  priority: 'high',
  milestones: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  job_id: 'job-1',
};

const mockProgress: ProjectProgress = {
  progressPercentage: 45.5,
  totalMilestones: 10,
  completedMilestones: 5,
  upcomingMilestones: 3,
  overdueMilestones: 2,
  isOnTrack: false,
};

describe('TimelineView', () => {
  it('should render timeline with title and status', () => {
    render(<TimelineView timeline={mockTimeline} progress={mockProgress} />);

    expect(screen.getByText('Project Alpha Timeline')).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
  });

  it('should display progress information', () => {
    render(<TimelineView timeline={mockTimeline} progress={mockProgress} />);

    expect(screen.getByText(/Progress: 45.5%/)).toBeInTheDocument();
    expect(screen.getByText(/5 of 10 milestones/)).toBeInTheDocument();
  });

  it('should show no milestones message when milestones array is empty', () => {
    render(<TimelineView timeline={mockTimeline} progress={mockProgress} />);

    expect(screen.getByText('No milestones have been added yet.')).toBeInTheDocument();
  });

  it('should show edit buttons when canEdit is true', () => {
    render(<TimelineView timeline={mockTimeline} progress={mockProgress} canEdit={true} />);

    expect(screen.getByText(/Edit Timeline/)).toBeInTheDocument();
    expect(screen.getByText(/Add Milestone/)).toBeInTheDocument();
  });
});