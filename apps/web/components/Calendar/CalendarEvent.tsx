'use client';

import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  type: 'job' | 'maintenance' | 'inspection';
  status?: string;
}

interface CalendarEventProps {
  event: CalendarEvent;
  eventColor: string;
}

export function CalendarEvent({ event, eventColor }: CalendarEventProps) {
  const router = useRouter();

  // Extract job ID from event ID
  const jobId = event.id.replace(/^(job-posted-|appointment-|appointment-end-|meeting-|job-scheduled-|maintenance-)/, '');
  const isJobEvent = event.id.startsWith('job-posted-') ||
    event.id.startsWith('job-scheduled-') ||
    event.id.startsWith('appointment-') ||
    (!event.id.includes('-') && !event.id.startsWith('maintenance-'));

  // Skip posted job events as they're shown as badge
  if (event.id.startsWith('job-posted-')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (isJobEvent && jobId) {
          router.push(`/jobs/${jobId}`);
        }
      }}
      disabled={!isJobEvent || !jobId}
      onKeyDown={(e) => {
        if (isJobEvent && jobId && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          router.push(`/jobs/${jobId}`);
        }
      }}
      style={{
        padding: `${theme.spacing[1.5]} ${theme.spacing[2]}`,
        backgroundColor: `${eventColor}15`,
        border: `1px solid ${eventColor}30`,
        borderLeft: `3px solid ${eventColor}`,
        borderRadius: theme.borderRadius.md,
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
        cursor: isJobEvent && jobId ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'left',
        width: '100%',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
      onMouseEnter={(e) => {
        if (isJobEvent && jobId) {
          e.currentTarget.style.transform = 'translateX(2px)';
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.backgroundColor = `${eventColor}20`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.backgroundColor = `${eventColor}15`;
      }}
      title={event.title}
      aria-label={isJobEvent && jobId ? `View job: ${event.title}` : event.title}
    >
      {event.title}
    </button>
  );
}

