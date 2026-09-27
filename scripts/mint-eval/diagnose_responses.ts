/* eslint-disable no-console, @typescript-eslint/no-explicit-any -- Offline evaluation CLI: prints aggregate diagnostics and reads heterogeneous archived provider JSON; production responses use strict parsers. */
/** Offline diagnostics only: original request results remain untouched. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AI_ASSESSMENT_SCHEMA } from '../../apps/web/lib/services/building-surveyor/validation-schemas';

async function main() {
  const root = path.resolve('.vercel/mint-eval/baseline-v1');
  const snapshot = JSON.parse(
    await fs.readFile(path.join(root, 'source-snapshot.json'), 'utf8')
  );
  const schemaPath =
    'apps/web/lib/services/building-surveyor/validation-schemas.ts';
  const currentSchemaHash = createHash('sha256')
    .update(await fs.readFile(schemaPath))
    .digest('hex');
  const schemaMatches =
    snapshot.files.find((f: any) => f.file === schemaPath)?.sha256 ===
    currentSchemaHash;
  let previous: any[] = [];
  try {
    previous = JSON.parse(
      await fs.readFile(path.join(root, 'diagnostics.json'), 'utf8')
    );
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
  const diagnostics: unknown[] = [];
  for (const file of await fs.readdir(root)) {
    if (!file.endsWith('.result.json')) continue;
    const r = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
    if (r.status !== 'parse_error' && r.status !== 'request_error') continue;
    const item: Record<string, unknown> = {
      id: r.id,
      status: r.status,
      errorCode: r.errorCode,
      refusal: r.refusal ?? null,
      refusalRecorded: Object.hasOwn(r, 'refusal'),
    };
    if (r.errorCode === 'invalid_schema') {
      if (!schemaMatches) {
        // Preserve diagnostics captured under the original schema. Do not
        // reinterpret baseline errors using a locally modified validator.
        const old = previous.find((item) => item.id === r.id);
        if (old?.schemaIssues) item.schemaIssues = old.schemaIssues;
        else
          item.diagnostic =
            'Requires baseline schema; current validator has changed.';
        diagnostics.push(item);
        continue;
      }
      try {
        const raw = JSON.parse(r.content);
        const checked = AI_ASSESSMENT_SCHEMA.safeParse(raw);
        if (!checked.success)
          item.schemaIssues = checked.error.issues.map((i) => ({
            path: i.path,
            code: i.code,
            message: i.message,
          }));
      } catch {
        item.diagnostic =
          'Raw response is not plain JSON; inspect original parser result.';
      }
    }
    diagnostics.push(item);
  }
  await fs.writeFile(
    path.join(root, 'diagnostics.json'),
    JSON.stringify(diagnostics, null, 2)
  );
  console.log(JSON.stringify(diagnostics, null, 2));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
