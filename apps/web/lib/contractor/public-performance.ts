import {
  MINIMUM_PERFORMANCE_SAMPLE,
  type ContractorPerformanceBasis,
} from '@mintenance/shared';

export interface CompletedPerformanceJob {
  id: string;
  homeowner_id: string | null;
  scheduled_end_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PerformanceResponse {
  job_id: string;
  created_at: string;
}

export function publicContractorPerformance(
  jobs: CompletedPerformanceJob[],
  bids: PerformanceResponse[],
  messages: PerformanceResponse[]
) {
  const first = new Map<string, number>();
  const jobDates = new Map(
    jobs.map((job) => [
      job.id,
      {
        posted: Date.parse(job.created_at),
        completed: Date.parse(job.completed_at ?? ''),
      },
    ])
  );
  for (const event of [...bids, ...messages]) {
    const dates = jobDates.get(event.job_id);
    const time = Date.parse(event.created_at);
    if (
      dates &&
      time >= dates.posted &&
      time <= dates.completed &&
      time < (first.get(event.job_id) ?? Infinity)
    ) {
      first.set(event.job_id, time);
    }
  }
  const customers = new Map<string, number>();
  let scheduled = 0;
  let onTime = 0;
  let totalResponseHours = 0;
  for (const job of jobs) {
    if (job.homeowner_id)
      customers.set(
        job.homeowner_id,
        (customers.get(job.homeowner_id) ?? 0) + 1
      );
    const end = Date.parse(job.scheduled_end_date ?? '');
    const completion = Date.parse(job.completed_at ?? '');
    if (
      Number.isFinite(end) &&
      Number.isFinite(completion) &&
      completion >= Date.parse(job.created_at)
    ) {
      scheduled++;
      if (completion <= end) onTime++;
    }
    const response = first.get(job.id);
    if (response != null)
      totalResponseHours += (response - Date.parse(job.created_at)) / 3_600_000;
  }
  const repeat = [...customers.values()].filter((count) => count > 1).length;
  const sufficient = (count: number) => count >= MINIMUM_PERFORMANCE_SAMPLE;
  const hours = sufficient(first.size) ? totalResponseHours / first.size : null;
  const basis: ContractorPerformanceBasis = {
    onTime: { count: onTime, total: scheduled },
    repeat: { count: repeat, total: customers.size },
    responses: first.size,
  };
  return {
    basis,
    onTimeCompletion: sufficient(scheduled)
      ? Math.round((onTime / scheduled) * 100)
      : null,
    repeatCustomers: sufficient(customers.size)
      ? Math.round((repeat / customers.size) * 100)
      : null,
    responseTimeHours: hours,
    responseTime:
      hours == null
        ? null
        : hours < 1
          ? '< 1 hour'
          : `About ${Math.round(hours)} ${Math.round(hours) === 1 ? 'hour' : 'hours'}`,
  };
}
