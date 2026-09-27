/* eslint-disable no-console, @typescript-eslint/no-explicit-any -- Offline evaluation CLI: prints aggregate diagnostics and reads heterogeneous archived provider JSON; production responses use strict parsers. */
/** Direct provider evaluation of the app's vision prompt/parser; never imports DB services. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse as dotenv } from 'dotenv';
import {
  buildSystemPrompt,
  buildUserPrompt,
} from '../../apps/web/lib/services/building-surveyor/prompt-builder';
import { parseAssessmentResponse } from '../../apps/web/lib/services/building-surveyor/generator/assessment-response';

async function main() {
  const root = path.resolve('.vercel/mint-eval/pilot');
  const out = path.resolve('.vercel/mint-eval/baseline-v1');
  await fs.mkdir(out, { recursive: true });
  const all = (await fs.readFile(path.join(root, 'manifest.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map(JSON.parse);
  // Interleave classes and image-quality cases so partial runs remain interpretable.
  const positive = all.filter(
    (r) => r.cohort === 'original' && r.crack_present
  );
  const negative = all.filter(
    (r) => r.cohort === 'original' && !r.crack_present
  );
  const stress = all.filter((r) => r.cohort === 'degraded');
  const rows = positive.flatMap((r, i) => [
    r,
    negative[i],
    ...(i % 2 === 0 ? [stress[i / 2]] : []),
  ]);
  const system = buildSystemPrompt();
  const user = buildUserPrompt(undefined, undefined, false);
  const sha = (b: string | Buffer) =>
    createHash('sha256').update(b).digest('hex');
  const sourceFiles = [
    'apps/web/lib/services/building-surveyor/prompt-builder.ts',
    'apps/web/lib/services/building-surveyor/generator/assessment-response.ts',
    'apps/web/lib/services/building-surveyor/validation-schemas.ts',
  ];
  const sourceFilesWithHashes = await Promise.all(
    sourceFiles.map(async (file) => ({
      file,
      sha256: sha(await fs.readFile(file)),
    }))
  );
  const snapshotPath = path.join(out, 'source-snapshot.json');
  try {
    const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
    if (
      JSON.stringify(snapshot.files) !== JSON.stringify(sourceFilesWithHashes)
    )
      throw new Error(
        'Baseline source changed; use a new run directory instead of mixing parser versions'
      );
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
    await fs.writeFile(
      snapshotPath,
      JSON.stringify(
        { recordedAt: new Date().toISOString(), files: sourceFilesWithHashes },
        null,
        2
      ),
      { flag: 'wx' }
    );
    for (const file of sourceFiles)
      await fs.copyFile(
        file,
        path.join(out, `${path.basename(file)}.baseline.txt`)
      );
  }
  const config = {
    model: 'gpt-4o',
    temperature: 0.1,
    max_tokens: 2000,
    detail: 'auto',
    promptVersion: 'building-surveyor-v4-evidence',
    promptSha256: sha(system + '\n' + user),
    manifestSha256: sha(await fs.readFile(path.join(root, 'manifest.jsonl'))),
    gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    inputUSDPerMillion: 2.5,
    outputUSDPerMillion: 10,
    budgetUSD: 9,
    pricingSource: 'https://developers.openai.com/api/docs/models/gpt-4o',
    scope:
      'App prompt and response parser only; no detector enrichment, DB taxonomy overrides, routing, scores, database or training writes.',
    labelsSentToModel: false,
  };
  const configPath = path.join(out, 'config.json');
  try {
    const old = JSON.parse(await fs.readFile(configPath, 'utf8'));
    if (JSON.stringify(old) !== JSON.stringify(config))
      throw new Error('Run configuration changed; use a new run directory');
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  await fs.writeFile(
    path.join(out, 'prompt.json'),
    JSON.stringify({ system, user }, null, 2)
  );
  const env = dotenv(await fs.readFile('apps/web/.env.local'));
  const key = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  let charged = 0,
    reserved = 0,
    index = 0,
    completed = 0,
    stop = false;
  let nextRequestAt = 0;
  const existing = new Set<string>();
  for (const file of await fs.readdir(out))
    if (file.endsWith('.result.json')) {
      const r = JSON.parse(await fs.readFile(path.join(out, file), 'utf8'));
      if (r.configHash !== sha(JSON.stringify(config)))
        throw new Error('Stored result configuration mismatch');
      existing.add(r.id);
      charged += r.budgetChargeUSD;
    }
  // UTF-8 byte length overestimates text tokens; 2048 tokens reserve covers a 256px image and framing.
  const worst =
    ((Buffer.byteLength(system + user) + 2048) * 2.5) / 1e6 +
    (config.max_tokens * 10) / 1e6;
  if (process.argv.includes('--dry-run')) {
    console.log(
      JSON.stringify({
        cases: rows.length,
        pending: rows.length - existing.size,
        worstPerRequestUSD: worst,
        config,
      })
    );
    return;
  }
  async function worker() {
    while (index < rows.length && !stop) {
      const row = rows[index++];
      if (existing.has(row.id)) continue;
      if (charged + reserved + worst > config.budgetUSD) {
        stop = true;
        break;
      }
      // Space request starts, rather than adding a fixed delay after inference.
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, nextRequestAt - Date.now()))
      );
      nextRequestAt = Date.now() + 11000;
      reserved += worst;
      const started = Date.now();
      const result: any = {
        id: row.id,
        imageSha256: row.sha256,
        configHash: sha(JSON.stringify(config)),
        startedAt: new Date().toISOString(),
        budgetChargeUSD: worst,
      };
      try {
        const image = await fs.readFile(path.join(root, row.image));
        if (sha(image) !== row.sha256) throw new Error('Image hash mismatch');
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            signal: AbortSignal.timeout(150000),
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              temperature: config.temperature,
              max_tokens: config.max_tokens,
              response_format: { type: 'json_object' },
              store: false,
              messages: [
                { role: 'system', content: system },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: user },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/${row.image.endsWith('.png') ? 'png' : 'jpeg'};base64,${image.toString('base64')}`,
                        detail: 'auto',
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );
        result.httpStatus = response.status;
        result.rateLimits = Object.fromEntries(
          [...response.headers].filter(
            ([name]) =>
              name.startsWith('x-ratelimit-') || name === 'retry-after'
          )
        );
        if (!response.ok) {
          result.status = 'request_error';
          result.errorCode = `http_${response.status}`;
          const problem: any = await response.json().catch(() => ({}));
          result.providerErrorCode = problem.error?.code;
          if ([401, 403, 429].includes(response.status)) stop = true;
        } else {
          const body: any = await response.json();
          result.providerModel = body.model;
          result.usage = body.usage;
          result.requestId = response.headers.get('x-request-id');
          result.content = body.choices?.[0]?.message?.content ?? '';
          result.refusal = body.choices?.[0]?.message?.refusal ?? null;
          result.finishReason = body.choices?.[0]?.finish_reason;
          if (body.usage) {
            // Deliberately charge cached tokens at full price: conservative cost estimate.
            result.budgetChargeUSD =
              (body.usage.prompt_tokens * 2.5 +
                body.usage.completion_tokens * 10) /
              1e6;
          }
          try {
            result.parsed = parseAssessmentResponse(
              result.content,
              result.finishReason
            );
            result.status = 'assessed';
          } catch (error: any) {
            result.status =
              error.code === 'INSUFFICIENT_EVIDENCE'
                ? 'abstained'
                : 'parse_error';
            result.errorCode = error.code ?? 'invalid_response';
          }
        }
      } catch (error: any) {
        result.status = 'request_error';
        result.errorCode = error.name ?? 'request_failed';
      }
      result.latencyMs = Date.now() - started;
      await fs.writeFile(
        path.join(out, `${row.id}.result.json`),
        JSON.stringify(result, null, 2),
        { flag: 'wx' }
      );
      reserved -= worst;
      charged += result.budgetChargeUSD;
      completed++;
      console.log(
        JSON.stringify({
          completed: existing.size + completed,
          total: 200,
          id: row.id,
          status: result.status,
          estimatedUpperCostUSD: Number(charged.toFixed(4)),
        })
      );
    }
  }
  await worker();
  console.log(
    JSON.stringify({
      finished: existing.size + completed,
      budgetStop: stop,
      estimatedUpperCostUSD: charged,
    })
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
