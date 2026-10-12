import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from '../Calendar';
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 1, 12));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
const events = [
  {
    id: 'appointment-end-job-id',
    title: 'A long landscaping job with a contractor (End)',
    type: 'job' as const,
    date: '2025-12-31',
  },
];
describe('calendar controls', () => {
  it('renders equal-width month cells and preserves December events across the year boundary', () => {
    render(<Calendar events={events} />);
    const grid = screen.getByTestId('calendar-grid');
    expect(grid.children.length).toBe(42);
    expect(grid.style.gridTemplateColumns).toBe('repeat(7, minmax(0, 1fr))');
    fireEvent.click(
      screen.getByRole('button', { name: `View job: ${events[0].title}` })
    );
    expect(push).toHaveBeenCalledWith('/jobs/job-id');
  });
  it('switches month/week/day and moves by the selected period; Today restores today', () => {
    render(<Calendar events={events} />);
    fireEvent.click(screen.getByRole('button', { name: 'week', exact: true }));
    expect(screen.getByTestId('calendar-grid').children.length).toBe(7);
    expect(screen.getByRole('heading').textContent).toContain('28 Dec 2025');
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByRole('heading').textContent).toContain('4 Jan 2026');
    fireEvent.click(screen.getByRole('button', { name: 'day', exact: true }));
    expect(screen.queryByTestId('calendar-grid')).toBeNull();
    expect(screen.getByRole('heading').textContent).toBe('8 Jan 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByRole('heading').textContent).toBe('7 Jan 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('heading').textContent).toBe('1 Jan 2026');
  });
  it('opens all events when a crowded date is selected', () => {
    render(
      <Calendar
        events={Array.from({ length: 4 }, (_, i) => ({
          ...events[0],
          id: `appointment-job-${i}`,
          title: `Job ${i}`,
          date: '2026-01-01',
        }))}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'View job: Job 3' })
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+2 more' }));
    expect(
      screen.getByRole('button', { name: 'View job: Job 3' })
    ).toBeDefined();
  });
});
