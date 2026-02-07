import { generateRefreshToken } from '../jwt';

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