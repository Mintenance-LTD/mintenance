/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion -- Offline evaluation CLI: prints aggregate diagnostics and reads heterogeneous archived provider JSON; production responses use strict parsers. */
/** Offline paired scoring; never makes provider calls or writes training data. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseAssessmentResponse } from '../../apps/web/lib/services/building-surveyor/generator/assessment-response';

async function main() {
  const { summarize } = await import('./score_baseline.mjs');
  const root = path.resolve('.vercel/mint-eval');
  const out = path.join(root, 'teacher-comparison-v1');
  const sha = (v: string | Buffer) =>
    createHash('sha256').update(v).digest('hex');
  const config = JSON.parse(
    await fs.readFile(path.join(out, 'config.json'), 'utf8')
  );
  const baselineConfig = JSON.parse(
    await fs.readFile(path.join(root, 'baseline-v1/config.json'), 'utf8')
  );
  const manifest = await fs.readFile(path.join(root, 'pilot/manifest.jsonl'));
  if (sha(manifest) !== config.manifestSha256)
    throw new Error('Manifest mismatch');
  for (const source of config.sources) {
    if (
      sha(
        await fs.readFile(
          path.join('apps/web/lib/services/building-surveyor', source.file)
        )
      ) !== source.sha256
    )
      throw new Error(`Frozen source changed: ${source.file}`);
  }
  const all = manifest.toString().trim().split('\n').map(JSON.parse);
  const rows = config.ids.map((id: string) =>
    all.find((r: any) => r.id === id)
  );
  if (rows.some((r: any) => !r) || new Set(config.ids).size !== 60)
    throw new Error('Invalid selection');
  const arms: Record<string, any> = {};
  const provenance: any[] = [];
  for (const arm of ['4o-existing', ...config.arms.map((a: any) => a.id)]) {
    const results = new Map();
    for (const row of rows) {
      const control = arm === '4o-existing';
      const file = control
        ? path.join(root, 'baseline-v1', `${row.id}.result.json`)
        : path.join(out, `${arm}--${row.id}.result.json`);
      const bytes = await fs.readFile(file);
      const r = JSON.parse(bytes.toString());
      if (
        r.configHash !==
          sha(JSON.stringify(control ? baselineConfig : config)) ||
        r.imageSha256 !== row.sha256
      )
        throw new Error(`Provenance mismatch: ${file}`);
      provenance.push({ arm, id: row.id, resultSha256: sha(bytes) });
      if (control) {
        r.budgetChargeUSD = 0;
        if (r.httpStatus === 200) {
          delete r.parsed;
          try {
            r.parsed = parseAssessmentResponse(r.content, r.finishReason);
            r.status = 'assessed';
          } catch (error: any) {
            r.status =
              error.code === 'INSUFFICIENT_EVIDENCE'
                ? 'abstained'
                : 'parse_error';
          }
        }
      } else if (arm.endsWith('observations') && r.status === 'assessed') {
        // Adapter for the shared binary scorer only; raw responses remain unchanged.
        if (typeof r.crackPrediction !== 'boolean')
          throw new Error('Missing observation prediction');
        r.parsed = {
          damageType: r.crackPrediction ? 'crack' : 'no_visible_crack',
        };
      }
      results.set(row.id, r);
    }
    arms[arm] = summarize(rows, results);
  }
  await fs.writeFile(
    path.join(out, 'summary.json'),
    JSON.stringify({ config, provenance, arms }, null, 2)
  );
  const table =
    '| Model / prompt | Cracks detected /24 | False cracks /24 | Classified /48 | Correct /48 | Degraded: assessed /12 | Degraded: abstained /12 | Errors (all60) |\n|---|---:|---:|---:|---:|---:|---:|---:|\n' +
    Object.entries(arms)
      .map(([arm, s]) => {
        const c = s.counts;
        return `| ${arm} | ${c.tp} | ${c.fp} | ${c.tp + c.tn + c.fp + c.fn} | ${c.tp + c.tn} | ${s.stress.assessed} | ${s.stress.abstained} | ${c.errorsPositive + c.errorsNegative + s.stress.errors} |`;
      })
      .join('\n');
  const report =
    '# Mint AI paired teacher comparison\n\n60 selected images: 24 publisher-labelled cracks, 24 non-cracks, 12 degraded derivatives. Three new arms (180 successful HTTP requests); GPT-4o existing-prompt control reused from the baseline and reparsed with the same current parser.\n\n' +
    table +
    '\n\n' +
    'Abstentions and errors are not correct negatives. Classification is measured against publisher crack labels, not full surveying correctness. Legacy outputs use structured damage/taxonomy labels; observation outputs use an explicit crack boolean. Prompt comparisons therefore also change the task and output contract.\n\n' +
    'The degraded images were suggested for recapture by prior AI triage; independent human assessability review is pending. Their assessment/abstention rates are diagnostic, not certified safety accuracy.\n\n' +
    `New-call conservative cost estimate: $${Object.values(arms)
      .reduce((s: number, a: any) => s + a.usage.conservativeCostUSD, 0)
      .toFixed(
        4
      )}. Control reuse costs zero additional API calls. Not an invoice.\n\n` +
    'Selection was SHA-ranked within surface/class and degradation groups before new predictions. This is a small consumed public development pilot, not independent release validation; pretraining exposure cannot be excluded. Do not train on these images. No ground truth exists here for hidden causes, severity, repair costs, RICS ratings, structural safety or railway performance.\n\n' +
    'config.json freezes prompts, model aliases, selected IDs and source hashes. summary.json contains every scored case and result hashes. results.html shows all images and raw responses. Source: [SDNET2018](https://digitalcommons.usu.edu/all_datasets/48/), Maguire, Dorafshan & Thomas (2018), CC BY 4.0.\n';
  await fs.writeFile(path.join(out, 'REPORT.md'), report);
  const esc = (v: any) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!
    );
  const cards = rows
    .map(
      (r: any) =>
        `<article><h2>${esc(r.id)}</h2><img src="../pilot/${esc(r.image)}" width="256" height="256" alt="${esc(r.id)}"><p>${esc(r.cohort)} · ${esc(r.surface)} · publisher crack: ${esc(r.crack_present)}</p>${Object.entries(
          arms
        )
          .map(([name, s]) => {
            const c = s.cases.find((v: any) => v.id === r.id);
            return `<details><summary>${esc(name)}: ${esc(c.outcome)}</summary><pre>${esc(c.result.content)}</pre></details>`;
          })
          .join('')}</article>`
    )
    .join('');
  await fs.writeFile(
    path.join(out, 'results.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mint teacher comparison</title><style>body{font:16px system-ui;background:#eef4f0;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}article{background:white;padding:18px;border-radius:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere}summary{padding:8px;cursor:pointer}</style><h1>Mint AI: four paired configurations</h1><p>Development pilot. Human review pending. No building safety ground truth.</p><main>${cards}</main></html>`
  );
  console.log(table);
  for (const [name, s] of Object.entries(arms))
    console.log(
      name,
      JSON.stringify({
        counts: s.counts,
        stress: s.stress,
        cost: s.usage.conservativeCostUSD,
        concerning: s.cases
          .filter(
            (c: any) =>
              ['fp', 'fn'].includes(c.outcome) ||
              (c.cohort !== 'original' && c.status === 'assessed')
          )
          .map((c: any) => ({
            id: c.id,
            outcome: c.outcome,
            content: c.result.content,
          })),
      })
    );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
