import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Detection is based on structured defect names only, never incidental prose
// such as "monitor for cracks" in repair advice. Abstention is not a negative.
export function crackPrediction(result) {
  if (result?.status !== 'assessed') return null;
  const p = result.parsed ?? {};
  const names = [p.damageType, p.taxonomyClassId,
    ...(p.findings ?? []).flatMap(f => [f.damageType, f.taxonomyClassId])]
    .filter(v => typeof v === 'string' && v.trim())
    .map(v => v.toLowerCase().replace(/[_-]/g, ' ').trim());
  if (!names.length) return null;
  const crack = names.some(v => /\bcrack(?:s|ing|ed)?\b/.test(v)
    && !/\b(?:no|without|not)\b.*\bcrack(?:s|ing|ed)?\b/.test(v)
    && !/\bnon\s+crack(?:s|ing|ed)?\b/.test(v)
    && !/\bcracks?\s+free\b/.test(v));
  if (crack) return true;
  if (names.every(v => /^(?:unknown|uncertain|unclassified|n\/a|not assessable)$/.test(v))) return null;
  return false;
}

export function summarize(rows, results) {
  const counts = { total: 0, positive: 0, negative: 0, tp: 0, tn: 0, fp: 0, fn: 0,
    abstainedPositive: 0, abstainedNegative: 0, errorsPositive: 0, errorsNegative: 0,
    unresolvedPositive: 0, unresolvedNegative: 0, pending: 0 };
  const stress = { total: 0, assessed: 0, abstained: 0, errors: 0, pending: 0, byTransformation: {} };
  const statuses = {};
  const cases = rows.map(row => {
    const result = results.get(row.id);
    const status = result?.status ?? 'pending';
    statuses[status] = (statuses[status] ?? 0) + 1;
    const predictedCrack = crackPrediction(result);
    let outcome = status;
    if (row.cohort === 'original') {
      counts.total++;
      counts[row.crack_present ? 'positive' : 'negative']++;
      const suffix = row.crack_present ? 'Positive' : 'Negative';
      if (!result) counts.pending++;
      else if (status === 'abstained') counts[`abstained${suffix}`]++;
      else if (status !== 'assessed') counts[`errors${suffix}`]++;
      else if (predictedCrack === null) { counts[`unresolved${suffix}`]++; outcome = 'unresolved'; }
      else {
        outcome = row.crack_present ? (predictedCrack ? 'tp' : 'fn') : (predictedCrack ? 'fp' : 'tn');
        counts[outcome]++;
      }
    } else {
      stress.total++;
      const key = !result ? 'pending' : ['assessed', 'abstained'].includes(status) ? status : 'errors';
      stress[key]++;
      const g = stress.byTransformation[row.transformation] ??= { total: 0, assessed: 0, abstained: 0, errors: 0, pending: 0 };
      g.total++; g[key]++;
    }
    return { ...row, status, outcome, predictedCrack, result };
  });
  const ratio = (n, d) => d ? n / d : null;
  const classified = counts.tp + counts.tn + counts.fp + counts.fn;
  const values = [...results.values()];
  return { counts, stress, statuses,
    metrics: {
      positiveDetectionRate: ratio(counts.tp, counts.positive),
      negativeFalsePositiveRate: ratio(counts.fp, counts.negative),
      classificationCoverage: ratio(classified, counts.total),
      accuracyAmongClassified: ratio(counts.tp + counts.tn, classified),
      correctClassificationsAllOriginals: ratio(counts.tp + counts.tn, counts.total),
      degradedAbstentionRate: ratio(stress.abstained, stress.total),
    },
    usage: { results: values.length, models: [...new Set(values.map(r => r.providerModel).filter(Boolean))],
      conservativeCostUSD: values.reduce((s, r) => s + (r.budgetChargeUSD ?? 0), 0),
      promptTokens: values.reduce((s, r) => s + (r.usage?.prompt_tokens ?? 0), 0),
      completionTokens: values.reduce((s, r) => s + (r.usage?.completion_tokens ?? 0), 0),
    }, cases };
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = value => value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
const outcomeNames = { tp: 'Crack detected', tn: 'No crack detected',
  fp: 'Crack reported on a no-crack reference', fn: 'Reference crack not detected',
  abstained: 'Insufficient evidence', parse_error: 'Response could not be parsed',
  request_error: 'Request failed', pending: 'Waiting for result',
  assessed: 'Assessment returned', unresolved: 'Unresolved classification' };

async function main() {
  const root = path.resolve('.vercel/mint-eval/pilot');
  const out = path.resolve('.vercel/mint-eval/baseline-v1');
  const manifest = await fs.readFile(path.join(root, 'manifest.jsonl'));
  const rows = manifest.toString().trim().split('\n').map(JSON.parse);
  const config = JSON.parse(await fs.readFile(path.join(out, 'config.json'), 'utf8'));
  const sha = value => createHash('sha256').update(value).digest('hex');
  if (sha(manifest) !== config.manifestSha256) throw new Error('Manifest changed');
  const byId = new Map(rows.map(r => [r.id, r]));
  const results = new Map();
  for (const file of await fs.readdir(out)) if (file.endsWith('.result.json')) {
    const r = JSON.parse(await fs.readFile(path.join(out, file), 'utf8'));
    if (r.configHash !== sha(JSON.stringify(config)) || r.imageSha256 !== byId.get(r.id)?.sha256)
      throw new Error(`Result provenance mismatch: ${file}`);
    if (results.has(r.id)) throw new Error(`Duplicate result: ${r.id}`);
    results.set(r.id, r);
  }
  const data = summarize(rows, results);
  const { counts: c, stress: s, metrics: m, usage: u, cases } = data;
  let replaySection = '';
  try {
    const comparison = JSON.parse(await fs.readFile(path.join(out, '../parser-replay-v1/comparison.json'), 'utf8'));
    if (JSON.stringify(comparison.metadata.baselineConfig) !== JSON.stringify(config)) throw new Error('Replay configuration mismatch');
    const before = comparison.baseline, after = comparison.replay;
    replaySection = `## Offline parser fix comparison\n\n` +
      `The local optional-trade fix was replayed against all saved responses, with **zero new model calls**. Accepted assessments: **${before.statuses.assessed} → ${after.statuses.assessed}**. Original-image errors: **${before.counts.errorsPositive + before.counts.errorsNegative} → ${after.counts.errorsPositive + after.counts.errorsNegative}**.\n\n` +
      `Changed cases: ${comparison.changedCases.map(r => r.id).join(', ') || 'none'}. Crack detections: **${before.counts.tp} → ${after.counts.tp}**; false crack detections: **${before.counts.fp} → ${after.counts.fp}**. Recovering a response does not validate its diagnosis. The recovered sdnet-051 response contains a crack taxonomy label despite the publisher's no-crack label.\n\n` +
      `The fix filters unsupported optional trade codes while preserving valid core evidence. It is local and has not been deployed. Candidate schema hash: ${comparison.metadata.schemaSha256}. Full comparison: ../parser-replay-v1/comparison.json.\n\n`;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const bySurface = Object.fromEntries(['walls', 'decks', 'pavements'].map(surface => {
    const subset = summarize(rows.filter(r => r.cohort === 'original' && r.surface === surface), results);
    return [surface, { counts: subset.counts, metrics: subset.metrics }];
  }));
  await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), config,
    ...data, cases: cases.map(({ result, ...r }) => r), bySurface }, null, 2));
  const report = `# Mint AI: first SDNET2018 baseline\n\n` +
    `Completed results: **${u.results}/200**. Model snapshot: **${u.models.join(', ')}**.\n\n` +
    `This evaluates the app's existing GPT-4o prompt and response parser with single 256×256 images. It does not evaluate detector enrichment, database overrides, orchestration, final app scoring, or the UI. No live database or training writes were made.\n\n` +
    `## Original images (160)\n\n` +
    `| Reference class | Crack detected | No crack detected | Abstained | Error | Unresolved |\n|---|---:|---:|---:|---:|---:|\n` +
    `| Crack (80) | ${c.tp} | ${c.fn} | ${c.abstainedPositive} | ${c.errorsPositive} | ${c.unresolvedPositive} |\n` +
    `| No crack (80) | ${c.fp} | ${c.tn} | ${c.abstainedNegative} | ${c.errorsNegative} | ${c.unresolvedNegative} |\n\n` +
    `Pending original images: ${c.pending}.\n\n` +
    `- Crack detection against all 80 positive labels: **${pct(m.positiveDetectionRate)}**.\n` +
    `- False crack detections against all 80 negative labels: **${pct(m.negativeFalsePositiveRate)}**.\n` +
    `- Classification coverage: **${pct(m.classificationCoverage)}**.\n` +
    `- Correct among classified images only: **${pct(m.accuracyAmongClassified)}**; correct classifications across all originals: **${pct(m.correctClassificationsAllOriginals)}**.\n\n` +
    `Abstentions, errors and unresolved outputs are not correct negatives. Low false-positive rates must be read alongside coverage. Structured damage/taxonomy labels determine crack detection; repair advice and incidental descriptions do not. Labels containing explicit negation do not count as crack detections.\n\n` +
    `### Results by surface\n\n| Surface | Labelled cracks detected | False crack detections | Classification coverage |\n|---|---:|---:|---:|\n` +
    Object.entries(bySurface).map(([name,v]) => `| ${name} | ${v.counts.tp}/${v.counts.positive} | ${v.counts.fp}/${v.counts.negative} | ${pct(v.metrics.classificationCoverage)} |`).join('\n') + '\n\n' +
    `## Degraded images (40)\n\n` +
    `Abstained: **${s.abstained}/40 (${pct(m.degradedAbstentionRate)})**; assessed: **${s.assessed}**; errors: **${s.errors}**; pending: **${s.pending}**.\n\n` +
    `| Transformation | Abstained | Assessed | Errors | Pending |\n|---|---:|---:|---:|---:|\n` +
    Object.entries(s.byTransformation).map(([k,v])=>`| ${k} | ${v.abstained} | ${v.assessed} | ${v.errors} | ${v.pending} |`).join('\n') + '\n\n' +
    `Pre-prediction AI visual triage suggested recapture for all 40, but independent human assessability labels remain pending. These figures are response rates, not certified abstention accuracy.\n\n` +
    replaySection + `## Provenance and limitations\n\n` +
    `- Conservative request-cost allowance: **$${u.conservativeCostUSD.toFixed(4)}**, including full-price cached input and worst-case reservations for errors; not an invoice. Cap: $9.\n` +
    `- Tokens reported: ${u.promptTokens} input; ${u.completionTokens} output.\n` +
    `- Source: [SDNET2018](https://digitalcommons.usu.edu/all_datasets/48/), CC BY 4.0; Maguire, Dorafshan & Thomas (2018), [DOI](https://doi.org/10.15142/T3TD19). Downloaded from the documented public mirror.\n` +
    `- 160 source groups; 40 derivatives are dependent on their parents. No claim of 200 independent samples.\n` +
    `- Publisher labels are retained, including difficult cases. AI triage is separate and is not an independent surveyor review. No image was excluded because of its prediction.\n` +
    `- A no-crack label does not mean no other defect or a safe building. No ground truth for severity, cause, repair cost, RICS rating or structural safety exists here.\n` +
    `- Public pretraining exposure cannot be ruled out. This is a development baseline, not a release certification or evidence of rail/site performance.\n` +
    `- Prompt hash: ${config.promptSha256}; manifest hash: ${config.manifestSha256}; repository commit: ${config.gitCommit}.\n\n` +
    `## Review files\n\nOpen results.html for every image, publisher label, status and raw response. summary.json includes per-surface results. QUALITATIVE-NOTES.md documents limitations and examples that a binary crack metric cannot validate. Human labels belong in ../pilot/review.csv; ai-triage.jsonl records the separate pre-prediction AI review.\n`;
  await fs.writeFile(path.join(out, 'REPORT.md'), report);
  const cards = cases.map(r => `<article data-outcome="${escape(r.outcome)}" data-cohort="${r.cohort}"><h2>${r.id} — ${escape(outcomeNames[r.outcome] ?? r.outcome)}</h2><img loading="lazy" src="../pilot/${escape(r.image)}" width="256" height="256" alt="${r.id} concrete surface"><p>Publisher: ${r.cohort === 'degraded' ? 'degraded; visible label unknown' : r.crack_present ? 'crack' : 'no crack'} · ${escape(r.surface)}</p><p>Structured crack prediction: ${r.predictedCrack === null ? 'no classification' : r.predictedCrack ? 'yes' : 'no'} · model-reported confidence: ${escape(r.result?.parsed?.confidence ?? 'not supplied')}</p><details><summary>Raw response and metadata</summary><pre>${escape(JSON.stringify(r.result ?? {}, null, 2))}</pre></details></article>`).join('\n');
  await fs.writeFile(path.join(out, 'results.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mint AI baseline review</title><style>body{font:16px system-ui;background:#f3f7f5;color:#19382f;margin:24px}header{max-width:1000px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:18px}article{background:white;padding:18px;border-radius:12px;min-width:0}h2{font-size:18px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}select{padding:10px;margin:16px 0}img{object-fit:contain}article[hidden]{display:none}</style><header><h1>Mint AI: first crack-assessment baseline</h1><p>${u.results}/200 results · crack detection ${pct(m.positiveDetectionRate)} · false crack detections ${pct(m.negativeFalsePositiveRate)} · classification coverage ${pct(m.classificationCoverage)}.</p><p>App prompt/parser only. Publisher labels; independent human review pending. A no-crack label is not a safety assessment.</p><a href="REPORT.md">Full report</a><br><label>Filter <select id="filter"><option value="all">All cases</option><option value="fp">False crack detections</option><option value="fn">Missed cracks among assessed cases</option><option value="abstained">Abstentions</option><option value="parse_error">Parser failures</option><option value="request_error">Request failures</option><option value="degraded">Degraded images</option></select></label></header><main>${cards}</main><script>document.querySelector('#filter').addEventListener('change',e=>{for(const a of document.querySelectorAll('article'))a.hidden=!(e.target.value==='all'||a.dataset.outcome===e.target.value||a.dataset.cohort===e.target.value)});</script></html>`);
  console.log(JSON.stringify({ ...data, cases: undefined, bySurface }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
