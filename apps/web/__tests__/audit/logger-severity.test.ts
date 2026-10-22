import { afterEach, expect, it, vi } from 'vitest';
import { Logger } from '../../../../packages/shared/src/logger';
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('preserves severity for structured production logs and redacts credentials', () => {
 vi.stubEnv('NODE_ENV', 'production');
 const info = vi.spyOn(console, 'log').mockImplementation(() => {});
 const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
 const error = vi.spyOn(console, 'error').mockImplementation(() => {});
 const logger = new Logger();
 logger.info('worker complete', { token: 'synthetic-secret' });
 expect(error).not.toHaveBeenCalled();
 expect(info).toHaveBeenCalledWith('[MONITORING]', expect.stringContaining('"level":"info"'));
 expect(JSON.stringify(info.mock.calls)).not.toContain('synthetic-secret');
 logger.warn('worker delayed');
 expect(warn).toHaveBeenCalledWith('[MONITORING]', expect.stringContaining('"level":"warn"'));
 logger.error('worker failed');
 expect(error).toHaveBeenCalledWith('[MONITORING]', expect.stringContaining('"level":"error"'));
});
