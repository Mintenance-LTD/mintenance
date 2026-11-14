import type {
  DateRange,
  ReportingAnalytics,
} from '@/app/contractor/(dashboard)/reporting/components/ReportingDashboard/types';

export const reportingPeriods = [
  '7days',
  '30days',
  '3months',
  '6months',
  'year',
] as const;
export function reportingPeriod(value: unknown): DateRange {
  return reportingPeriods.includes(value as (typeof reportingPeriods)[number])
    ? (value as DateRange)
    : '30days';
}
export function reportStart(period: DateRange, now: Date): Date {
  const start = new Date(now);
  if (period === 'year') {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
  } else if (period === '3months' || period === '6months')
    start.setUTCMonth(start.getUTCMonth() - (period === '3months' ? 3 : 6));
  else start.setUTCDate(start.getUTCDate() - (period === '7days' ? 7 : 30));
  return start;
}

export { collectRows as collectReportRows } from '@/lib/db/collect-rows';

interface ReportJob {
  id: string;
  status: string;
  category: string | null;
  homeowner_id: string | null;
  created_at: string;
  homeowner?:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
}
interface ReportPayment {
  job_id: string;
  amount: number | string;
  contractor_payout: number | string | null;
  platform_fee: number | string | null;
  released_at: string | null;
}
interface ReportBid {
  status: string;
  created_at: string;
}
interface ReportReview {
  rating: number;
  created_at: string;
}
export function contractorReport(
  data: {
    jobs: ReportJob[];
    payments: ReportPayment[];
    bids: ReportBid[];
    reviews: ReportReview[];
  },
  period: DateRange,
  now = new Date()
): ReportingAnalytics {
  const start = reportStart(period, now);
  const previousStart = new Date(
    start.getTime() - (now.getTime() - start.getTime())
  );
  const within = (date: string | null, from = start, to = now) =>
    !!date &&
    Date.parse(date) >= from.getTime() &&
    Date.parse(date) < to.getTime();
  const jobs = data.jobs.filter((j) => within(j.created_at));
  const payments = data.payments.filter((p) => within(p.released_at));
  const bids = data.bids.filter((b) => within(b.created_at));
  const reviews = data.reviews.filter((r) => within(r.created_at));
  const previousPayments = data.payments.filter((p) =>
    within(p.released_at, previousStart, start)
  );
  const previousJobs = data.jobs.filter((j) =>
    within(j.created_at, previousStart, start)
  );
  const net = (p: ReportPayment) => {
    if (p.contractor_payout == null && p.platform_fee == null)
      throw new Error(
        'Released payment fees require reconciliation before earnings can be reported.'
      );
    const amount = Number(p.amount);
    const entitlement = Number(
      p.contractor_payout ?? amount - Number(p.platform_fee)
    );
    if (
      !Number.isFinite(amount) ||
      !Number.isFinite(entitlement) ||
      entitlement < 0 ||
      entitlement > amount
    )
      throw new Error('Released payment amounts require reconciliation.');
    return entitlement;
  };
  const sum = (rows: ReportPayment[]) =>
    Math.round(rows.reduce((total, p) => total + net(p), 0) * 100) / 100;
  const totalRevenue = sum(payments),
    previousRevenue = sum(previousPayments);
  const change = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const paidJobs = new Set(payments.map((p) => p.job_id)).size;
  const previousPaidJobs = new Set(previousPayments.map((p) => p.job_id)).size;
  const averageJobValue = paidJobs ? totalRevenue / paidJobs : 0;
  const byJob = new Map(data.jobs.map((j) => [j.id, j]));
  const clients = new Map<
    string,
    { name: string; revenue: number; jobs: Set<string> }
  >();
  const categories = new Map<string, { count: number; revenue: number }>();
  for (const job of jobs) {
    const key = job.category || 'Other';
    const row = categories.get(key) ?? { count: 0, revenue: 0 };
    row.count++;
    categories.set(key, row);
  }
  const days = new Map<string, { revenue: number; jobs: Set<string> }>();
  const months = new Map<string, { revenue: number; jobs: Set<string> }>();
  for (const payment of payments) {
    const job = byJob.get(payment.job_id);
    const amount = net(payment);
    const category = job?.category || 'Other';
    const row = categories.get(category) ?? { count: 0, revenue: 0 };
    row.revenue += amount;
    categories.set(category, row);
    if (job?.homeowner_id) {
      const person = Array.isArray(job.homeowner)
        ? job.homeowner[0]
        : job.homeowner;
      const client = clients.get(job.homeowner_id) ?? {
        name:
          [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
          'Customer',
        revenue: 0,
        jobs: new Set<string>(),
      };
      client.revenue += amount;
      client.jobs.add(job.id);
      clients.set(job.homeowner_id, client);
    }
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(payment.released_at!));
    for (const [map, key] of [
      [days, day],
      [months, day.slice(0, 7)],
    ] as const) {
      const entry = map.get(key) ?? { revenue: 0, jobs: new Set<string>() };
      entry.revenue += amount;
      entry.jobs.add(payment.job_id);
      map.set(key, entry);
    }
  }
  const acceptedBids = bids.filter((b) => b.status === 'accepted').length;
  return {
    totalJobs: jobs.length,
    completedJobs: jobs.filter((j) => j.status === 'completed').length,
    activeJobs: jobs.filter((j) =>
      ['assigned', 'in_progress'].includes(j.status)
    ).length,
    pendingJobs: jobs.filter((j) => ['posted', 'pending'].includes(j.status))
      .length,
    cancelledJobs: jobs.filter((j) =>
      ['cancelled', 'canceled'].includes(j.status)
    ).length,
    totalRevenue,
    averageJobValue,
    totalClients: clients.size,
    activeClients: [...clients.values()].filter((c) => c.jobs.size > 1).length,
    customerSatisfaction: reviews.length
      ? reviews.reduce((total, r) => total + r.rating, 0) / reviews.length
      : 0,
    totalBids: bids.length,
    acceptedBids,
    winRate: bids.length ? (acceptedBids / bids.length) * 100 : 0,
    jobsByCategory: [...categories].map(([category, row]) => ({
      category,
      ...row,
    })),
    dailyRevenue: [...days]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, row]) => ({
        date,
        revenue: row.revenue,
        jobs: row.jobs.size,
      })),
    revenueByMonth: [...months]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, row]) => ({
        month,
        revenue: row.revenue,
        jobs: row.jobs.size,
      })),
    topClients: [...clients.values()]
      .map((c) => ({ ...c, jobs: c.jobs.size }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    revenueChange: change(totalRevenue, previousRevenue),
    jobsChange: change(jobs.length, previousJobs.length),
    avgValueChange: change(
      averageJobValue,
      previousPaidJobs ? previousRevenue / previousPaidJobs : 0
    ),
    satisfactionChange: 0,
  };
}

export function reportingCsv(
  analytics: ReportingAnalytics,
  period: string
): string {
  const rows: (string | number)[][] = [
    ['Period', period],
    ['Currency', 'GBP'],
    [
      'Definition',
      'Released contractor entitlement after platform fees; not confirmed bank payouts',
    ],
    ['Metric', 'Value'],
    ['Released contractor entitlement', analytics.totalRevenue.toFixed(2)],
    ['Jobs created', analytics.totalJobs],
    ['Completed jobs in created cohort', analytics.completedJobs],
    ['Bids submitted', analytics.totalBids],
    ['Accepted bids in submitted cohort', analytics.acceptedBids],
    [],
    ['Release date (UK)', 'Contractor entitlement GBP', 'Distinct jobs'],
    ...analytics.dailyRevenue.map((row) => [
      row.date,
      row.revenue.toFixed(2),
      row.jobs,
    ]),
  ];
  return rows
    .map((row) =>
      row
        .map(
          (value) =>
            '"' +
            String(value)
              .replace(/^[=+@-]/, "'$&")
              .replace(/"/g, '""') +
            '"'
        )
        .join(',')
    )
    .join('\r\n');
}
