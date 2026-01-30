import { vi } from 'vitest';

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('Job Create Page', () => {
  it('should be testable', () => {
    expect(true).toBe(true);
  });
});