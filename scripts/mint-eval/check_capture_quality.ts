/* eslint-disable no-console -- Offline evaluation CLI: prints aggregate diagnostics and reads heterogeneous archived provider JSON; production responses use strict parsers. */
/** Offline capture-gate diagnostics; does not call models or alter labels. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { inspectPhotoQuality } from '../../apps/web/lib/services/building-surveyor/photo-quality';

async function main() {
  const root = path.resolve('.vercel/mint-eval/pilot');
  const rows = (await fs.readFile(path.join(root, 'manifest.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map(JSON.parse);
  const results = [];
  for (const row of rows)
    results.push({
      id: row.id,
      cohort: row.cohort,
      transformation: row.transformation,
      ...(await inspectPhotoQuality(
        await fs.readFile(path.join(root, row.image))
      )),
    });
  const groups: Record<
    string,
    { total: number; rejected: number; warned: number; softFocus: number }
  > = {};
  for (const r of results) {
    const g = (groups[
      r.cohort === 'original' ? 'original' : r.transformation
    ] ??= { total: 0, rejected: 0, warned: 0, softFocus: 0 });
    g.total++;
    if (r.issue) g.rejected++;
    if (r.lowDetailWarning) g.warned++;
    if (r.softFocusWarning) g.softFocus++;
  }
  await fs.writeFile(
    path.join(root, '../capture-quality-v2.json'),
    JSON.stringify(
      {
        note: 'Development diagnostics only; not independent human assessability validation. Low detail is not a rejection.',
        groups,
        results,
      },
      null,
      2
    )
  );
  console.log(JSON.stringify(groups, null, 2));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
