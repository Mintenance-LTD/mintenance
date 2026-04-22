// globals: true in vitest.config
import { updateProfileSchema } from '../schemas-user';

/**
 * Regression-guard: updateProfileSchema is `.strict()`-mode so unknown
 * keys are REJECTED rather than silently stripped. This blocks the
 * mass-assignment attack where a client POSTs `{role: "admin"}` hoping
 * it flows through to supabase.update().
 */
describe('updateProfileSchema — strict mode (mass-assignment defense)', () => {
  it('accepts a well-formed payload with only allowlisted fields', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Alice',
      lastName: 'Smith',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (all fields are optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('SECURITY: rejects a payload containing `role`', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Alice',
      role: 'admin',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod surfaces unknown keys on `issues[].keys` (not on `path`)
      // with `code: 'unrecognized_keys'`.
      const offending = result.error.issues.flatMap(
        (i) => (i as { keys?: string[] }).keys ?? []
      );
      expect(offending).toContain('role');
    }
  });

  it('SECURITY: rejects `admin_verified` escalation attempts', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Alice',
      admin_verified: true,
    });
    expect(result.success).toBe(false);
  });

  it('SECURITY: rejects `id` / `email` tampering', () => {
    const resultId = updateProfileSchema.safeParse({ id: 'other-user' });
    expect(resultId.success).toBe(false);

    const resultEmail = updateProfileSchema.safeParse({ email: 'victim@x.co' });
    expect(resultEmail.success).toBe(false);
  });

  it('rejects arbitrary unknown keys with a descriptive error', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Alice',
      unexpectedField: 'junk',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const offending = result.error.issues.flatMap(
        (i) => (i as { keys?: string[] }).keys ?? []
      );
      expect(offending).toContain('unexpectedField');
    }
  });
});
