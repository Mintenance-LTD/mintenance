import { MonitoringService } from '../../monitoring/MonitoringService';
import type { ContinuumMemoryConfig } from '../../ml-engine/memory/types';

/**
 * Internal helpers extracted from AssessmentOrchestrator.ts on
 * 2026-05-09. Kept in a separate module so the orchestrator file
 * stays focused on the assessment pipeline.
 */

export interface RunWithTimeoutResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  timedOut: boolean;
  durationMs: number;
}

/**
 * Race a task against a timeout. Returns a rich result rather than
 * throwing so callers can branch on `timedOut` vs other failures
 * without nested try/catch.
 */
export async function runWithTimeout<T>(
  task: () => Promise<T>,
  timeoutMs: number,
  taskName: string
): Promise<RunWithTimeoutResult<T>> {
  const startTime = Date.now();
  try {
    const result = await Promise.race([
      task(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timeout`)), timeoutMs)
      ),
    ]);
    return {
      success: true,
      data: result,
      timedOut: false,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.message.includes('timeout');
    return {
      success: false,
      error,
      timedOut: isTimeout,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Wrap MonitoringService.record so the orchestrator doesn't have to
 * thread the agent name through every metric call site.
 */
export function buildMetricRecorder(agentName: string) {
  return (metric: string, payload: Record<string, unknown>): void => {
    MonitoringService.record(metric, { agentName, ...payload });
  };
}

/**
 * Lightweight URL validator for the assessment image-url input. Lives
 * here so the orchestrator can stay declarative and we keep this
 * trivial dependency-free check out of the hot path.
 */
export async function validateURLs(urls: string[]): Promise<{
  valid: string[];
  invalid: Array<{ url: string; error: string }>;
}> {
  const valid: string[] = [];
  const invalid: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    try {
      new URL(url);
      valid.push(url);
    } catch {
      invalid.push({ url, error: 'Invalid URL format' });
    }
  }

  return { valid, invalid };
}

/**
 * Build the 3-level continuum-memory config used by the building
 * surveyor agent. Keeps the levels-array data out of the orchestrator
 * file. Output is 5 dimensions — extracted alongside the predictive
 * variant for symmetry.
 */
export function buildSurveyorMemoryConfig(
  agentName: string
): ContinuumMemoryConfig {
  return {
    agentName,
    defaultChunkSize: 10,
    defaultLearningRate: 0.001,
    levels: [
      {
        level: 0,
        frequency: 1,
        chunkSize: 10,
        learningRate: 0.01,
        mlpConfig: {
          inputSize: 40,
          hiddenSizes: [64, 32],
          outputSize: 5,
          activation: 'relu',
        },
      },
      {
        level: 1,
        frequency: 16,
        chunkSize: 100,
        learningRate: 0.005,
        mlpConfig: {
          inputSize: 40,
          hiddenSizes: [128, 64],
          outputSize: 5,
          activation: 'relu',
        },
      },
      {
        level: 2,
        frequency: 1000000,
        chunkSize: 1000,
        learningRate: 0.001,
        mlpConfig: {
          inputSize: 40,
          hiddenSizes: [256, 128, 64],
          outputSize: 5,
          activation: 'relu',
        },
      },
    ],
  };
}
