import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  recoveryJobs,
  recoveryState,
  type RecoveryRun,
} from '@/lib/operations/recovery-status';

const m = vi.hoisted(() => ({
  from: vi.fn(),
  admin: vi.fn(),
  options: [] as object[],
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: m.admin,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: object, handler: Function) => {
    m.options.push(options);
    return () => handler(null, { user: { id: 'verified-actor' } });
  },
}));
import { readRecoveryHealth } from '@/lib/operations/recovery-health';
import { GET } from '@/app/api/admin/recovery-health/route';

const now = Date.parse('2026-09-27T12:00:00Z');
function run(
  minutes: number,
  status: RecoveryRun['status'] = 'success'
): RecoveryRun {
  return {
    status,
    started_at: new Date(now - minutes * 60_000).toISOString(),
    completed_at:
      status === 'running'
        ? null
        : new Date(now - minutes * 60_000 + 1000).toISOString(),
    metadata: null,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  m.admin.mockResolvedValue(undefined);
});
it('does not invent health from an empty, stale or failed execution history', () => {
  expect(recoveryState(null, null, 15, now)).toBe('missing');
  expect(recoveryState(run(16), run(16), 15, now)).toBe('overdue');
  expect(recoveryState(run(1, 'failed'), run(2), 15, now)).toBe('failed');
  expect(recoveryState(run(1), run(1), 15, now)).toBe('recent_success');
});
it('does not let repeated starts hide the absence of a completed run', () => {
  expect(recoveryState(run(1, 'running'), null, 15, now)).toBe('overdue');
  expect(recoveryState(run(1, 'running'), run(20), 15, now)).toBe('overdue');
  expect(recoveryState(run(6, 'running'), run(7), 15, now)).toBe('overdue');
  expect(recoveryState(run(1, 'running'), run(4), 15, now)).toBe('running');
});
it('treats invalid clocks and missing completion as unverified', () => {
  expect(recoveryState(run(-1), null, 15, now)).toBe('unknown');
  expect(recoveryState({ ...run(1), completed_at: null }, null, 15, now)).toBe(
    'unknown'
  );
  expect(
    recoveryState(
      { ...run(1), completed_at: run(2).completed_at },
      null,
      15,
      now
    )
  ).toBe('unknown');
});
it.each(['failed', 'expired', 'attemptsNeedingReview', 'needsReconciliation'])(
  'shows %s outcomes as needing review even when the worker returned success',
  (key) => {
    expect(
      recoveryState({ ...run(1), metadata: { [key]: 1 } }, run(1), 15, now)
    ).toBe('attention');
  }
);
it('matches monitored paths to deployed schedules instead of assuming daily jobs run every five minutes', () => {
  const config = JSON.parse(
    readFileSync(path.resolve(process.cwd(), '../../vercel.json'), 'utf8')
  );
  for (const job of recoveryJobs) {
    const entry = config.crons.find(
      (cron: { path: string }) => cron.path === `/api/cron/${job.name}`
    );
    expect(entry?.schedule).toBe(
      job.name === 'evidence-disposal' ? '30 2 * * *' : '*/5 * * * *'
    );
    expect(job.maxAgeMinutes).toBe(
      job.name === 'evidence-disposal' ? 1560 : 15
    );
  }
});
it('bounds database reads, isolates lookup failures and strips operational payloads', async () => {
  const limits: number[] = [];
  m.from.mockImplementation(() => {
    let job = '';
    const q = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn((column, value) => {
        if (column === 'job_name') job = value;
        return q;
      }),
      limit: vi.fn((limit) => {
        limits.push(limit);
        return q;
      }),
      maybeSingle: vi.fn(async () =>
        job === 'refund-recovery'
          ? { error: { message: 'private database detail' }, data: null }
          : {
              error: null,
              data: { ...run(1), metadata: { private: 'never disclose' } },
            }
      ),
    };
    return q;
  });
  const report = await readRecoveryHealth(now);
  expect(m.from).toHaveBeenCalledTimes(recoveryJobs.length * 2);
  expect(limits).toEqual(Array(recoveryJobs.length * 2).fill(1));
  expect(report.jobs.find((job) => job.name === 'refund-recovery')?.state).toBe(
    'unknown'
  );
  expect(
    report.jobs.filter((job) => job.state === 'recent_success')
  ).toHaveLength(8);
  expect(JSON.stringify(report)).not.toMatch(/private|never disclose/);
});
it('requires database admin verification before reading history', async () => {
  expect(m.options).toContainEqual({
    roles: ['admin'],
    rateLimit: { maxRequests: 30 },
  });
  m.admin.mockRejectedValue(new Error('denied'));
  await expect(GET({} as never, {} as never)).rejects.toThrow('denied');
  expect(m.from).not.toHaveBeenCalled();
});
