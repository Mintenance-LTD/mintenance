import { SqlProtection } from '../core/SqlProtection';

describe('SqlProtection', () => {
  describe('scanInput', () => {
    it('should mark safe input as safe', () => {
      const result = SqlProtection.scanInput('Hello World');
      expect(result.isSafe).toBe(true);
      expect(result.risk).toBe('low');
      expect(result.threats).toHaveLength(0);
    });

    it('should detect SELECT statement', () => {
      const result = SqlProtection.scanInput('SELECT * FROM users');
      expect(result.isSafe).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should detect UNION-based injection', () => {
      const result = SqlProtection.scanInput(
        "' UNION SELECT password FROM users--"
      );
      expect(result.isSafe).toBe(false);
      expect(result.threats.some((t) => t.severity === 'critical')).toBe(true);
    });

    it('should detect boolean blind injection', () => {
      const result = SqlProtection.scanInput("admin' OR 1=1--");
      expect(result.isSafe).toBe(false);
    });

    it('should detect DROP TABLE', () => {
      const result = SqlProtection.scanInput('DROP TABLE users');
      expect(result.isSafe).toBe(false);
      expect(
        result.threats.some((t) => t.description.includes('SQL command'))
      ).toBe(true);
    });

    it('should detect comment-based injection', () => {
      const result = SqlProtection.scanInput("admin'--");
      expect(result.isSafe).toBe(false);
    });

    it('should return sanitized output', () => {
      const result = SqlProtection.scanInput(
        'SELECT * FROM users; DROP TABLE users;'
      );
      expect(result.sanitized).not.toContain('SELECT');
      expect(result.original).toContain('SELECT');
    });

    it('should handle empty input', () => {
      const result = SqlProtection.scanInput('');
      expect(result.isSafe).toBe(true);
    });
  });

  describe('batchValidate', () => {
    it('should validate multiple inputs', () => {
      const results = SqlProtection.batchValidate([
        'safe input',
        'SELECT * FROM users',
        'another safe one',
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].isSafe).toBe(true);
      expect(results[1].isSafe).toBe(false);
      expect(results[2].isSafe).toBe(true);
    });
  });
});
