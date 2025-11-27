/**
 * Shared timeout utility for building surveyor service
 * Provides a consistent interface for running tasks with timeouts
 */

export interface TimeoutResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  durationMs: number;
  timedOut: boolean;
}

/**
 * Run a task with timeout protection
 * Returns a result object indicating success, timing, and any errors
 */
export async function runWithTimeout<T>(
  task: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<TimeoutResult<T>> {
  const start = Date.now();
  const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`);
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(timeoutError), timeoutMs);
  });

  try {
    const data = await Promise.race([task(), timeoutPromise]);
    return {
      success: true,
      data: data as T,
      durationMs: Date.now() - start,
      timedOut: false,
    };
  } catch (error) {
    return {
      success: false,
      error,
      durationMs: Date.now() - start,
      timedOut: error === timeoutError,
    };
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

