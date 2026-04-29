/**
 * Runtime response validation helpers.
 *
 * Audit step 15 (2026-04-29): the typed `get<T>` / `post<T>` etc.
 * methods on `ApiClient` accept a TypeScript generic but never
 * actually check what came back over the wire. If the backend
 * drifts (renames a field, wraps results in a new envelope,
 * starts returning a string where an object is expected), every
 * downstream consumer reads `undefined` from the wrong shape and
 * the bug surfaces deep in a UI render rather than at the
 * service-layer call site.
 *
 * These helpers give callers an opt-in way to fail fast at the
 * API boundary using a Zod schema from `@mintenance/api-contracts`:
 *
 *   const raw = await mobileApiClient.get('/api/jobs');
 *   const { jobs } = validateResponse(jobListResponseSchema, raw);
 *
 * Or, when you want to tolerate validation failure (e.g. a list
 * endpoint where one bad row shouldn't break the whole render):
 *
 *   const result = safeValidateResponse(jobResponseSchema, raw);
 *   if (!result.success) logger.warn('shape drift', result.error);
 *
 * The helpers are structurally typed to accept any Zod schema
 * without forcing `@mintenance/api-client` to depend on Zod
 * directly.
 */

/**
 * Minimal subset of `z.ZodType` we rely on. Any Zod schema
 * satisfies this shape.
 */
export interface ResponseSchema<T> {
  parse(data: unknown): T;
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: unknown };
}

export class ResponseValidationError extends Error {
  readonly issues: unknown;
  constructor(message: string, issues: unknown) {
    super(message);
    this.name = 'ResponseValidationError';
    this.issues = issues;
  }
}

/**
 * Throwing variant: parses `data` and returns `T`, or throws
 * `ResponseValidationError` if the shape doesn't match.
 *
 * Use when a malformed response should abort the operation —
 * typically for single-resource fetches where rendering with
 * partial data would mislead the user.
 */
export function validateResponse<T>(
  schema: ResponseSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const prefix = context ? `${context}: ` : '';
    throw new ResponseValidationError(
      `${prefix}API response failed schema validation`,
      result.error
    );
  }
  return result.data;
}

/**
 * Non-throwing variant: returns `{ success, data }` or
 * `{ success, error }`. Mirrors Zod's own `safeParse` so callers
 * can switch idioms without re-learning the API.
 *
 * Use when you want to log a shape drift but still render
 * gracefully — e.g. list endpoints where the user is better off
 * seeing an empty list than a crash.
 */
export function safeValidateResponse<T>(
  schema: ResponseSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: unknown } {
  return schema.safeParse(data);
}
