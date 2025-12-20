/**
 * Event transformation logic for scheduling calendar
 * Extracted from page.tsx to improve maintainability
 */

import { logger } from '@mintenance/shared';
import type {
  CalendarEvent,
  JobWithContract,
  Meeting,
  SubscriptionWithName,
} from './types';

interface TransformEventsOptions {
  userId: string;
  userRole: 'homeowner' | 'contractor';
  viewedJobIds: Set<string>;
  bidJobIds: Set<string>;
}

/**
 * Transform jobs to calendar events
 */
export function transformJobsToEvents(
  jobs: JobWithContract[],
  options: TransformEventsOptions
): CalendarEvent[] {
  const { userRole, viewedJobIds, bidJobIds } = options;
  const jobEvents: CalendarEvent[] = [];

  jobs.forEach((jobWithContract) => {
    const job = jobWithContract;
    const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    const contractorName = contractor
      ? `${(contractor as { first_name?: string; last_name?: string }).first_name || ''} ${(contractor as { first_name?: string; last_name?: string }).last_name || ''}`.trim()
      : null;
    const homeownerName = homeowner
      ? `${(homeowner as { first_name?: string; last_name?: string }).first_name || ''} ${(homeowner as { first_name?: string; last_name?: string }).last_name || ''}`.trim()
      : null;

    const postedDate = new Date(job.created_at);

    // Validate dates
    if (isNaN(postedDate.getTime())) {
      logger.warn('[EventTransformer] Invalid posted date for job', {
        jobId: job.id,
        createdAt: job.created_at,
      });
      return; // Skip this job
    }

    const isViewed = viewedJobIds.has(job.id);
    const hasBid = bidJobIds.has(job.id);

    // Only add posted date event if contractor has viewed the job (or if user is homeowner)
    if (isViewed || userRole === 'homeowner') {
      // Calculate days since posted
      const daysSincePosted = Math.floor((new Date().getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysText = daysSincePosted === 0 ? 'Today' :
        daysSincePosted === 1 ? '1 day ago' :
          `${daysSincePosted} days ago`;

      // Add posted date event (use ISO string for proper serialization)
      jobEvents.push({
        id: `job-posted-${job.id}`,
        title: `Posted: ${job.title || 'Untitled Job'} (${daysText})`,
        date: postedDate.toISOString(),
        type: 'job',
        status: job.status,
      });
    }

    // Determine the scheduled date - prefer scheduled_start_date, then contract start_date
    const contract = jobWithContract.contract;
    const isContractAccepted = contract && (
      contract.status === 'accepted' ||
      (contract.contractor_signed_at && contract.homeowner_signed_at)
    );

    let scheduledDate: Date | null = null;
    if (job.scheduled_start_date) {
      scheduledDate = new Date(job.scheduled_start_date);
    } else if (contract?.start_date && isContractAccepted) {
      scheduledDate = new Date(contract.start_date);
    }

    // If job has a scheduled date, add scheduled event
    const shouldShowScheduledEvent = userRole === 'homeowner' ||
      isViewed ||
      hasBid;

    if (scheduledDate && !isNaN(scheduledDate.getTime()) && shouldShowScheduledEvent) {
      // Create appropriate title based on user role
      let scheduledTitle = job.title || 'Job';
      if (userRole === 'homeowner' && contractorName) {
        scheduledTitle = `${job.title || 'Job'} with ${contractorName}`;
      } else if (userRole === 'contractor' && homeownerName) {
        scheduledTitle = `${job.title || 'Job'} for ${homeownerName}`;
      } else {
        scheduledTitle = job.title || 'Job';
      }

      // Add start date event
      jobEvents.push({
        id: `appointment-${job.id}`,
        title: scheduledTitle,
        date: scheduledDate.toISOString(),
        type: 'inspection',
        status: job.status,
      });

      // If there's an end date, also add it (optional - for multi-day jobs)
      if (job.scheduled_end_date) {
        const endDate = new Date(job.scheduled_end_date);
        if (!isNaN(endDate.getTime()) && endDate.getTime() !== scheduledDate.getTime()) {
          jobEvents.push({
            id: `appointment-end-${job.id}`,
            title: `${scheduledTitle} (End)`,
            date: endDate.toISOString(),
            type: 'inspection',
            status: job.status,
          });
        }
      } else if (contract?.end_date && isContractAccepted) {
        const endDate = new Date(contract.end_date);
        if (!isNaN(endDate.getTime()) && endDate.getTime() !== scheduledDate.getTime()) {
          jobEvents.push({
            id: `appointment-end-${job.id}`,
            title: `${scheduledTitle} (End)`,
            date: endDate.toISOString(),
            type: 'inspection',
            status: job.status,
          });
        }
      }
    }
  });

  return jobEvents;
}

/**
 * Transform meetings to appointment calendar events
 */
export function transformMeetingsToEvents(meetings: Meeting[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  for (const meeting of meetings) {
    const contractor = Array.isArray(meeting.contractor) ? meeting.contractor[0] : meeting.contractor;
    const job = Array.isArray(meeting.job) ? meeting.job[0] : meeting.job;
    const contractorName = contractor
      ? `${(contractor as { first_name?: string; last_name?: string }).first_name || ''} ${(contractor as { first_name?: string; last_name?: string }).last_name || ''}`.trim()
      : 'Contractor';
    const jobTitle = (job as { title?: string } | null)?.title || 'Meeting';
    const meetingTypeLabel = meeting.meeting_type === 'site_visit' ? 'Site Visit' :
      meeting.meeting_type === 'consultation' ? 'Consultation' :
        meeting.meeting_type === 'work_session' ? 'Work Session' : 'Meeting';

    const meetingDate = new Date(meeting.scheduled_datetime);
    if (isNaN(meetingDate.getTime())) {
      logger.warn('[EventTransformer] Invalid meeting date', {
        meetingId: meeting.id,
        scheduledDatetime: meeting.scheduled_datetime,
      });
      continue;
    }

    events.push({
      id: `meeting-${meeting.id}`,
      title: `${meetingTypeLabel}: ${jobTitle} with ${contractorName}`,
      date: meetingDate.toISOString(),
      type: 'inspection',
      status: meeting.status,
    });
  }
  
  return events;
}

/**
 * Transform subscriptions to maintenance calendar events
 */
export function transformSubscriptionsToEvents(
  subscriptions: SubscriptionWithName[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  for (const sub of subscriptions) {
    const billingDate = new Date(sub.next_billing_date!);
    if (isNaN(billingDate.getTime())) {
      logger.warn('[EventTransformer] Invalid billing date for subscription', {
        subscriptionId: sub.id,
        nextBillingDate: sub.next_billing_date,
      });
      continue;
    }

    events.push({
      id: `maintenance-${sub.id}`,
      title: sub.name || 'Maintenance Service',
      date: billingDate.toISOString(),
      type: 'maintenance',
    });
  }
  
  return events;
}

/**
 * Combine and sort all events by date
 */
export function combineAndSortEvents(
  jobEvents: CalendarEvent[],
  appointmentEvents: CalendarEvent[],
  maintenanceEvents: CalendarEvent[]
): CalendarEvent[] {
  const allEvents = [...jobEvents, ...appointmentEvents, ...maintenanceEvents];
  
  return allEvents.sort((a, b) => {
    const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date.getTime();
    const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date.getTime();
    return dateA - dateB;
  });
}

