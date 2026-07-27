// @vitest-environment node
// (generateRefreshToken refuses to run when `window` exists — node env, not happy-dom)
import { generateRefreshToken, generateJWT, verifyJWT } from '../jwt';
import { SessionValidator } from '../session-validator';

const SECRET = 'test-secret-for-session-claim-stamping-0123456789';
const USER = { id: 'user-1', email: 'test@example.com', role: 'homeowner' };

describe('generateJWT session-claim stamping', () => {
  it('ALWAYS stamps sessionStart and lastActivity when not supplied', async () => {
    const before = Date.now();
    const token = await generateJWT(USER, SECRET);
    const after = Date.now();

    const payload = await verifyJWT(token, SECRET);
    expect(payload).not.toBeNull();
    expect(typeof payload!.sessionStart).toBe('number');
    expect(typeof payload!.lastActivity).toBe('number');
    expect(payload!.sessionStart!).toBeGreaterThanOrEqual(before);
    expect(payload!.sessionStart!).toBeLessThanOrEqual(after);
    expect(payload!.lastActivity!).toBeGreaterThanOrEqual(before);
    expect(payload!.lastActivity!).toBeLessThanOrEqual(after);
  });

  it('preserves explicitly supplied sessionStart/lastActivity', async () => {
    const sessionStart = Date.now() - 60_000;
    const lastActivity = Date.now() - 5_000;
    const token = await generateJWT(
      USER,
      SECRET,
      '1h',
      sessionStart,
      lastActivity
    );

    const payload = await verifyJWT(token, SECRET);
    expect(payload!.sessionStart).toBe(sessionStart);
    expect(payload!.lastActivity).toBe(lastActivity);
  });

  it('freshly issued tokens survive post-cutover session validation', async () => {
    const token = await generateJWT(USER, SECRET);
    const payload = await verifyJWT(token, SECRET);

    const result = SessionValidator.validateSession(
      {
        sessionStart: payload!.sessionStart,
        lastActivity: payload!.lastActivity,
      },
      { legacyClaimsCutoverMs: 0 } // cutover already passed
    );
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe('generateRefreshToken', () => {
  it('should generate a refresh token', async () => {
    const token = await generateRefreshToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should generate unique tokens', async () => {
    const token1 = await generateRefreshToken();
    const token2 = await generateRefreshToken();
    expect(token1).not.toBe(token2);
  });

  it('should handle error cases', async () => {
    await expect(generateRefreshToken()).resolves.toBeDefined();
  });
});
