/* eslint-disable no-console -- CLI output contains aggregate counts only. */
/** Read-only storage audit. Exit 1: missing/invalid references; 2: incomplete check. */
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { checkStorage, reportExitCode } from './storage-integrity-core.cjs';

const reportPath = path.join(
  process.cwd(),
  'scripts',
  'storage-integrity-report.json'
);
async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing configuration');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
    },
  });
  const report = await checkStorage(client, url);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(
    JSON.stringify({ complete: report.complete, sources: report.sources })
  );
  console.log(
    'Report: scripts/storage-integrity-report.json. External/empty references are not verified.'
  );
  process.exitCode = reportExitCode(report);
}
main().catch(async () => {
  // Error objects may contain credentials, signed URLs or private object paths.
  console.error(
    'Storage audit could not complete; inspect configuration and service availability.'
  );
  await fs
    .writeFile(
      reportPath,
      JSON.stringify({ complete: false, failure: 'audit_unavailable' }),
      'utf8'
    )
    .catch(() => {});
  process.exitCode = 2;
});
