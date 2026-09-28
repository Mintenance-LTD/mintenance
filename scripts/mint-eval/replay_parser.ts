/* eslint-disable no-console, @typescript-eslint/no-explicit-any -- Offline evaluation CLI: prints aggregate diagnostics and reads heterogeneous archived provider JSON; production responses use strict parsers. */
/** Replay saved provider responses through the current parser; no network or DB. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseAssessmentResponse } from '../../apps/web/lib/services/building-surveyor/generator/assessment-response';

async function main() {
  const { summarize } = await import('./score_baseline.mjs');
  const root = path.resolve('.vercel/mint-eval');
  const baseline = path.join(root, 'baseline-v1');
  const out = path.join(root, 'parser-replay-v1');
  const sha = (value: string | Buffer) =>
    createHash('sha256').update(value).digest('hex');
  const manifest = await fs.readFile(path.join(root, 'pilot/manifest.jsonl'));
  const rows = manifest.toString().trim().split('\n').map(JSON.parse);
  const config = JSON.parse(
    await fs.readFile(path.join(baseline, 'config.json'), 'utf8')
  );
  if (sha(manifest) !== config.manifestSha256)
    throw new Error('Manifest mismatch');
  const original = new Map();
  const replayed = new Map();
  const records: any[] = [];
  for (const row of rows) {
    const bytes = await fs.readFile(
      path.join(baseline, `${row.id}.result.json`)
    );
    const r = JSON.parse(bytes.toString());
    if (
      r.configHash !== sha(JSON.stringify(config)) ||
      r.imageSha256 !== row.sha256
    )
      throw new Error(`Source provenance mismatch: ${row.id}`);
    original.set(row.id, r);
    const next = { ...r, budgetChargeUSD: 0, usage: undefined };
    if (r.httpStatus === 200) {
      delete next.parsed;
      delete next.errorCode;
      try {
        next.parsed = parseAssessmentResponse(r.content, r.finishReason);
        next.status = 'assessed';
      } catch (error: any) {
        next.status =
          error.code === 'INSUFFICIENT_EVIDENCE' ? 'abstained' : 'parse_error';
        next.errorCode = error.code ?? 'invalid_response';
      }
    }
    replayed.set(row.id, next);
    records.push({
      id: row.id,
      sourceResultSha256: sha(bytes),
      baselineStatus: r.status,
      replayStatus: next.status,
      errorCode: next.errorCode,
      parsedChanged: JSON.stringify(r.parsed) !== JSON.stringify(next.parsed),
      parsed: next.parsed,
    });
  }
  const compact = (results: Map<string, any>) => {
    const s = summarize(rows, results);
    return {
      counts: s.counts,
      stress: s.stress,
      statuses: s.statuses,
      metrics: s.metrics,
    };
  };
  const metadata = {
    kind: 'offline_parser_replay',
    baselineConfig: config,
    parserSha256: sha(
      await fs.readFile(
        'apps/web/lib/services/building-surveyor/generator/assessment-response.ts'
      )
    ),
    schemaSha256: sha(
      await fs.readFile(
        'apps/web/lib/services/building-surveyor/validation-schemas.ts'
      )
    ),
    newModelCalls: 0,
    newAPICostUSD: 0,
  };
  await fs.mkdir(out, { recursive: true });
  const result = {
    metadata,
    baseline: compact(original),
    replay: compact(replayed),
    changedCases: records.filter(
      (r) => r.baselineStatus !== r.replayStatus || r.parsedChanged
    ),
    records,
  };
  await fs.writeFile(
    path.join(out, 'comparison.json'),
    JSON.stringify(result, null, 2),
    { flag: 'wx' }
  );
  console.log(JSON.stringify({ ...result, records: undefined }, null, 2));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
