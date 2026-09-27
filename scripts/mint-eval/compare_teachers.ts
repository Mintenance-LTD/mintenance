/* eslint-disable no-console, @typescript-eslint/no-explicit-any -- Offline evaluation CLI: prints aggregate diagnostics and reads heterogeneous archived provider JSON; production responses use strict parsers. */
/** Paired development comparison; no database, training or deployment writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse as dotenv } from 'dotenv';
import { buildOpenAIAssessmentRequest } from '../../apps/web/lib/services/building-surveyor/generator/openai-request';
import { parseAssessmentResponse } from '../../apps/web/lib/services/building-surveyor/generator/assessment-response';
import {
  VISUAL_OBSERVATION_PROMPT,
  parseVisualObservation,
} from '../../apps/web/lib/services/building-surveyor/generator/visual-observation';

const sha = (v: string | Buffer) =>
  createHash('sha256').update(v).digest('hex');
async function main() {
  const root = path.resolve('.vercel/mint-eval');
  const out = path.join(root, 'teacher-comparison-v1');
  const manifest = await fs.readFile(path.join(root, 'pilot/manifest.jsonl'));
  const all = manifest.toString().trim().split('\n').map(JSON.parse);
  const rank = (row: any) => sha(`mint-teacher-comparison-v1:${row.id}`);
  const take = (rows: any[], n: number) =>
    rows.sort((a, b) => rank(a).localeCompare(rank(b))).slice(0, n);
  const selected = ['walls', 'decks', 'pavements'].flatMap((surface) =>
    [true, false].flatMap((label) =>
      take(
        all.filter(
          (r) =>
            r.cohort === 'original' &&
            r.surface === surface &&
            r.crack_present === label
        ),
        8
      )
    )
  );
  selected.push(
    ...['dark', 'overexposed', 'blurred', 'low_resolution'].flatMap((mode) =>
      take(
        all.filter((r) => r.cohort === 'degraded' && r.transformation === mode),
        3
      )
    )
  );
  selected.sort((a, b) => rank(a).localeCompare(rank(b)));
  if (selected.length !== 60) throw new Error('Expected 60 paired cases');
  const oldPrompt = JSON.parse(
    await fs.readFile(path.join(root, 'baseline-v1/prompt.json'), 'utf8')
  );
  const observationUser =
    'Inspect the supplied image and return the visual observation JSON.';
  const arms = [
    {
      id: 'sol-existing',
      model: 'gpt-6-sol',
      system: oldPrompt.system,
      user: oldPrompt.user,
      contract: 'assessment',
      gapMs: 1000,
    },
    {
      id: 'sol-observations',
      model: 'gpt-6-sol',
      system: VISUAL_OBSERVATION_PROMPT,
      user: observationUser,
      contract: 'observation',
      gapMs: 1000,
    },
    {
      id: '4o-observations',
      model: 'gpt-4o-2024-08-06',
      system: VISUAL_OBSERVATION_PROMPT,
      user: observationUser,
      contract: 'observation',
      gapMs: 5000,
    },
  ];
  const sources = [
    'generator/openai-request.ts',
    'generator/assessment-response.ts',
    'generator/visual-observation.ts',
    'validation-schemas.ts',
  ];
  const config = {
    version: 'teacher-comparison-v1',
    selectionSeed: 'mint-teacher-comparison-v1',
    selectionRule:
      '8 per surface/class plus 3 per degradation; SHA ranking independent of predictions',
    ids: selected.map((r) => r.id),
    manifestSha256: sha(manifest),
    arms: arms.map((a) => ({
      ...a,
      promptHash: sha(a.system + '\n' + a.user),
    })),
    sources: await Promise.all(
      sources.map(async (file) => ({
        file,
        sha256: sha(
          await fs.readFile(
            path.join('apps/web/lib/services/building-surveyor', file)
          )
        ),
      }))
    ),
    maxOutputTokens: 2000,
    budgetUSD: 6,
    inputUpperUSDPerMillion: 2.5,
    outputUSDPerMillion: 10,
    note: 'Development comparison on consumed public pilot, not independent release validation. GPT-4o existing responses are reused and reparsed with the same current parser. No expert ground truth for causes or costs.',
    labelsSentToModel: false,
    trainingAllowed: false,
  };
  await fs.mkdir(out, { recursive: true });
  const configPath = path.join(out, 'config.json');
  try {
    if (
      JSON.stringify(JSON.parse(await fs.readFile(configPath, 'utf8'))) !==
      JSON.stringify(config)
    )
      throw new Error('Frozen comparison configuration changed');
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), {
      flag: 'wx',
    });
  }
  const configHash = sha(JSON.stringify(config));
  const existing = new Set<string>();
  let charged = 0,
    reserved = 0,
    index = 0,
    stop = false;
  for (const f of await fs.readdir(out))
    if (f.endsWith('.result.json')) {
      const r = JSON.parse(await fs.readFile(path.join(out, f), 'utf8'));
      if (r.configHash !== configHash)
        throw new Error('Stored comparison mismatch');
      existing.add(`${r.arm}:${r.id}`);
      charged += r.budgetChargeUSD;
    }
  const tasks = selected
    .flatMap((row) => arms.map((arm) => ({ row, arm })))
    .filter((t) => !existing.has(`${t.arm.id}:${t.row.id}`));
  if (process.argv.includes('--dry-run')) {
    console.log(
      JSON.stringify({
        selected: 60,
        pending: tasks.length,
        budget: 6,
        previousCharge: charged,
      })
    );
    return;
  }
  if (process.argv.includes('--canary')) tasks.splice(1);
  const env = dotenv(await fs.readFile('apps/web/.env.local'));
  const key = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OpenAI credential');
  const nextStart = new Map<string, number>();
  let completed = existing.size;
  async function worker() {
    while (index < tasks.length && !stop) {
      const { row, arm } = tasks[index++];
      const startAt = Math.max(Date.now(), nextStart.get(arm.model) || 0);
      nextStart.set(arm.model, startAt + arm.gapMs);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, startAt - Date.now()))
      );
      const worst =
        ((Buffer.byteLength(arm.system + arm.user) + 8192) * 2.5) / 1e6 +
        (config.maxOutputTokens * 10) / 1e6;
      if (stop || charged + reserved + worst > 6) {
        stop = true;
        break;
      }
      reserved += worst;
      const started = Date.now();
      const result: any = {
        id: row.id,
        arm: arm.id,
        configHash,
        imageSha256: row.sha256,
        startedAt: new Date().toISOString(),
        budgetChargeUSD: worst,
      };
      try {
        const bytes = await fs.readFile(path.join(root, 'pilot', row.image));
        if (sha(bytes) !== row.sha256) throw new Error('Input image changed');
        const body = buildOpenAIAssessmentRequest(
          arm.model,
          [
            { role: 'system', content: arm.system },
            {
              role: 'user',
              content: [
                { type: 'text', text: arm.user },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/${row.image.endsWith('.png') ? 'png' : 'jpeg'};base64,${bytes.toString('base64')}`,
                    detail: 'auto',
                  },
                },
              ],
            },
          ],
          2000
        );
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            signal: AbortSignal.timeout(120000),
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );
        result.httpStatus = response.status;
        result.rateLimits = Object.fromEntries(
          [...response.headers].filter(
            ([k]) => k.startsWith('x-ratelimit-') || k === 'retry-after'
          )
        );
        const data: any = await response.json();
        if (!response.ok) {
          result.status = 'request_error';
          result.errorCode = data.error?.code;
          result.errorParam = data.error?.param;
          result.errorType = data.error?.type;
          if ([400, 401, 403, 404, 429].includes(response.status)) stop = true;
        } else {
          result.providerModel = data.model;
          result.usage = data.usage;
          result.requestId = response.headers.get('x-request-id');
          result.content = data.choices?.[0]?.message?.content ?? '';
          result.refusal = data.choices?.[0]?.message?.refusal ?? null;
          result.finishReason = data.choices?.[0]?.finish_reason;
          if (data.usage)
            result.budgetChargeUSD =
              (data.usage.prompt_tokens * 2.5 +
                data.usage.completion_tokens * 10) /
              1e6;
          try {
            if (result.refusal) {
              result.status = 'provider_refusal';
            } else if (arm.contract === 'observation') {
              result.observation = parseVisualObservation(
                result.content,
                result.finishReason,
                1
              );
              result.status =
                result.observation.outcome === 'insufficient_evidence'
                  ? 'abstained'
                  : 'assessed';
              result.crackPrediction = result.observation.crackPresent;
            } else {
              result.parsed = parseAssessmentResponse(
                result.content,
                result.finishReason
              );
              result.status = 'assessed';
            }
          } catch (e: any) {
            result.status =
              e.code === 'INSUFFICIENT_EVIDENCE' ? 'abstained' : 'parse_error';
            result.errorCode = e.code ?? 'invalid_observation';
          }
        }
      } catch (e: any) {
        result.status = 'request_error';
        result.errorCode = e.name;
      }
      result.latencyMs = Date.now() - started;
      await fs.writeFile(
        path.join(out, `${arm.id}--${row.id}.result.json`),
        JSON.stringify(result, null, 2),
        { flag: 'wx' }
      );
      reserved -= worst;
      charged += result.budgetChargeUSD;
      completed++;
      console.log(
        JSON.stringify({
          completed,
          total: 180,
          arm: arm.id,
          id: row.id,
          status: result.status,
          httpStatus: result.httpStatus,
          errorCode: result.errorCode,
          errorParam: result.errorParam,
          costUpperUSD: +charged.toFixed(4),
        })
      );
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  console.log(
    JSON.stringify({
      finished: completed,
      stopped: stop,
      costUpperUSD: charged,
    })
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
