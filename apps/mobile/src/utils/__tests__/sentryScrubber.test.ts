import { scrubValue } from '../sentryScrubber';

it('removes prototype-related keys at every level without mutating the input', () => {
  const input = JSON.parse('{"__proto__":{"polluted":true},"nested":{"constructor":{"prototype":{"admin":true}},"prototype":{"hidden":true},"safe":"kept"}}');
  const result = scrubValue(input) as Record<string, unknown>;
  expect(result).toEqual({ nested: { safe: 'kept' } });
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.hasOwn(result, '__proto__')).toBe(false);
  expect(Object.hasOwn(input, '__proto__')).toBe(true);
  expect(Object.prototype).not.toHaveProperty('polluted');
});

it('redacts secrets in objects and arrays and retains ordinary diagnostic fields', () => {
  expect(scrubValue({ password: 'private-value', nested: [{ apiKey: 'private-value', route: '/jobs' }], count: 4, missing: null })).toEqual({
    password: '[REDACTED]', nested: [{ apiKey: '[REDACTED]', route: '/jobs' }], count: 4, missing: null,
  });
});

it('truncates deep data instead of returning an unsanitized subtree', () => {
  let value: unknown = { password: 'must-never-leave-device' };
  for (let i = 0; i < 9; i++) value = { nested: value };
  const serialized = JSON.stringify(scrubValue(value));
  expect(serialized).toContain('[TRUNCATED]');
  expect(serialized).not.toContain('must-never-leave-device');
});

it('bounds cycles so the scrubbed result remains serializable', () => {
  const input: Record<string, unknown> = { label: 'cycle' };
  input.self = input;
  expect(() => JSON.stringify(scrubValue(input))).not.toThrow();
  expect(JSON.stringify(scrubValue(input))).toContain('[TRUNCATED]');
});

it('redacts card-like text while preserving short numeric IDs', () => {
  expect(scrubValue('Card 4242 4242 4242 4242; job 12345')).toBe('Card [REDACTED_CC]; job 12345');
});
