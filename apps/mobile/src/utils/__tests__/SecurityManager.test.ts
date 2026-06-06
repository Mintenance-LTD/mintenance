/**
 * SecurityManager unit tests.
 *
 * Per the testing contract: the unit under test (SecurityManagerService /
 * SecurityManager) is NEVER mocked. Only externals are mocked —
 * expo-secure-store, @react-native-async-storage/async-storage, logger,
 * and Date.now (spy). InputValidationMiddleware runs for real because it is
 * an internal collaborator, not an external dependency.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SecurityManager, SecurityManagerService } from '../SecurityManager';
import { logger } from '../logger';

// expo-file-system is not installed in this workspace; the source has a
// try/catch require() fallback. We register a mock so the require() succeeds
// and getInfoAsync becomes overridable per-test (covers not-exists /
// oversize / throw branches that the static fallback cannot reach).
jest.mock(
  'expo-file-system',
  () => ({
    getInfoAsync: jest.fn(),
  }),
  { virtual: true }
);

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('SecurityManagerService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Reset SecureStore mock implementations to safe defaults.
    (mockSecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  // ---------------------------------------------------------------------------
  // validateTextInput (instance)
  // ---------------------------------------------------------------------------
  describe('validateTextInput', () => {
    it('accepts a clean string and returns the sanitized value', () => {
      const result = SecurityManager.validateTextInput('Plumbing job', {
        fieldName: 'title',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toBe('Plumbing job');
    });

    it('rejects an empty string', () => {
      const result = SecurityManager.validateTextInput('   ', {
        fieldName: 'desc',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('flags XSS <script> payloads as dangerous (security assertion)', () => {
      const result = SecurityManager.validateTextInput(
        '<script>alert(1)</script>',
        { fieldName: 'bio' }
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('dangerous'))).toBe(true);
    });

    it('flags javascript: protocol payloads (security assertion)', () => {
      const result = SecurityManager.validateTextInput('javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('enforces maxLength branch', () => {
      const result = SecurityManager.validateTextInput('abcdef', {
        maxLength: 3,
        fieldName: 'short',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceed'))).toBe(true);
    });

    it('enforces minLength branch', () => {
      const result = SecurityManager.validateTextInput('ab', {
        minLength: 5,
        fieldName: 'min',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least'))).toBe(true);
    });

    it('passes a custom pattern through to the middleware', () => {
      const result = SecurityManager.validateTextInput('abc123', {
        pattern: /^[a-z]+$/,
        fieldName: 'lettersonly',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('invalid'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // validateEmail (instance)
  // ---------------------------------------------------------------------------
  describe('validateEmail', () => {
    it('accepts a well-formed email', () => {
      const result = SecurityManager.validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
    });

    it('rejects a malformed email', () => {
      const result = SecurityManager.validateEmail('not-an-email');
      expect(result.isValid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // static checkRateLimit (delegates to middleware)
  // ---------------------------------------------------------------------------
  describe('static checkRateLimit', () => {
    it('allows the first attempt within the window', async () => {
      const allowed = await SecurityManagerService.checkRateLimit(
        'static-id-1',
        3,
        60000
      );
      expect(allowed).toBe(true);
    });

    it('blocks once attempts exceed the max', async () => {
      const id = 'static-id-2';
      expect(await SecurityManagerService.checkRateLimit(id, 2, 60000)).toBe(
        true
      );
      expect(await SecurityManagerService.checkRateLimit(id, 2, 60000)).toBe(
        true
      );
      // Third attempt over a max of 2 must be denied (security assertion).
      expect(await SecurityManagerService.checkRateLimit(id, 2, 60000)).toBe(
        false
      );
    });
  });

  // ---------------------------------------------------------------------------
  // static hasPermission
  // ---------------------------------------------------------------------------
  describe('static hasPermission', () => {
    it('grants when user level >= required level', () => {
      expect(SecurityManagerService.hasPermission('admin', 'homeowner')).toBe(
        true
      );
      expect(
        SecurityManagerService.hasPermission('contractor', 'contractor')
      ).toBe(true);
    });

    it('denies when user level < required level (security assertion)', () => {
      expect(SecurityManagerService.hasPermission('guest', 'admin')).toBe(
        false
      );
      expect(SecurityManagerService.hasPermission('homeowner', 'admin')).toBe(
        false
      );
    });

    it('treats unknown roles as level 0', () => {
      expect(SecurityManagerService.hasPermission('unknown', 'guest')).toBe(
        true
      );
      expect(SecurityManagerService.hasPermission('unknown', 'homeowner')).toBe(
        false
      );
    });
  });

  // ---------------------------------------------------------------------------
  // static sanitizeForLogging + instance delegate
  // ---------------------------------------------------------------------------
  describe('sanitizeForLogging', () => {
    it('returns primitives unchanged', () => {
      expect(SecurityManagerService.sanitizeForLogging('plain')).toBe('plain');
      expect(SecurityManagerService.sanitizeForLogging(42)).toBe(42);
      expect(SecurityManagerService.sanitizeForLogging(null)).toBe(null);
    });

    it('redacts sensitive keys case-insensitively (security assertion)', () => {
      const out = SecurityManagerService.sanitizeForLogging({
        Password: 'secret123',
        apiKey: 'abc',
        username: 'gloire',
      }) as Record<string, unknown>;
      expect(out.Password).toBe('[REDACTED]');
      expect(out.apiKey).toBe('[REDACTED]');
      expect(out.username).toBe('gloire');
    });

    it('recurses into nested objects and arrays', () => {
      const out = SecurityManagerService.sanitizeForLogging({
        nested: { token: 'xyz', safe: 1 },
        list: [{ secret: 's' }, 'plain'],
      }) as Record<string, unknown>;
      const nested = out.nested as Record<string, unknown>;
      expect(nested.token).toBe('[REDACTED]');
      expect(nested.safe).toBe(1);
      const list = out.list as unknown[];
      expect((list[0] as Record<string, unknown>).secret).toBe('[REDACTED]');
      expect(list[1]).toBe('plain');
    });

    it('instance delegate forwards to the static method', () => {
      const out = SecurityManager.sanitizeForLogging({
        creditCard: '4111',
      }) as Record<string, unknown>;
      expect(out.creditCard).toBe('[REDACTED]');
    });
  });

  // ---------------------------------------------------------------------------
  // validatePassword (instance)
  // ---------------------------------------------------------------------------
  describe('validatePassword', () => {
    it('accepts a strong password', () => {
      const result = SecurityManager.validatePassword('Str0ng!Pass');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('reports every rule violation for a weak password (security assertion)', () => {
      const result = SecurityManager.validatePassword('abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number',
          'Password must contain at least one special character',
        ])
      );
    });

    it('flags the missing-lowercase branch', () => {
      const result = SecurityManager.validatePassword('PASSWORD1!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('lowercase'))).toBe(true);
    });

    it('rejects a common password (security assertion)', () => {
      const result = SecurityManager.validatePassword('password');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('too common'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // validateFileUpload (instance) — drives the mocked expo-file-system
  // ---------------------------------------------------------------------------
  describe('validateFileUpload', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require('expo-file-system');

    it('accepts a valid image file', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 2048 });
      const result =
        await SecurityManager.validateFileUpload('/uploads/photo.jpg');
      expect(result.isValid).toBe(true);
      expect(result.fileInfo).toEqual({
        size: 2048,
        type: 'image/jpg',
        name: 'photo.jpg',
      });
    });

    it('rejects a non-existent file', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: false });
      const result = await SecurityManager.validateFileUpload('/uploads/x.jpg');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('rejects a file exceeding the max size (security assertion)', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 11 * 1024 * 1024,
      });
      const result =
        await SecurityManager.validateFileUpload('/uploads/big.png');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds maximum'))).toBe(
        true
      );
    });

    it('rejects a file without an extension', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      const result = await SecurityManager.validateFileUpload('/uploads/noext');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File must have a valid extension');
    });

    it('rejects a disallowed extension (security assertion)', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      const result = await SecurityManager.validateFileUpload(
        '/uploads/malware.exe'
      );
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Only JPEG, PNG, and WebP'))
      ).toBe(true);
    });

    it('rejects an overly long filename', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      const longName = `/uploads/${'a'.repeat(260)}.jpg`;
      const result = await SecurityManager.validateFileUpload(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename is too long');
    });

    it('rejects a directory-traversal path (security assertion)', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      const result = await SecurityManager.validateFileUpload(
        '/uploads/../../etc/passwd.jpg'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filename detected');
    });

    it('rejects a reserved Windows filename (security assertion)', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      const result =
        await SecurityManager.validateFileUpload('/uploads/con.jpg');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filename detected');
    });

    it('rejects a filename with invalid characters (security assertion)', async () => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      const result =
        await SecurityManager.validateFileUpload('/uploads/ba<d>.jpg');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filename detected');
    });

    it('returns a validation error when getInfoAsync throws', async () => {
      FileSystem.getInfoAsync.mockRejectedValue(new Error('io error'));
      const result = await SecurityManager.validateFileUpload('/uploads/x.jpg');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to validate file');
    });
  });

  // ---------------------------------------------------------------------------
  // secureStore / secureRetrieve (instance) — expo-secure-store mocked
  // ---------------------------------------------------------------------------
  describe('secureStore / secureRetrieve', () => {
    it('stores a value and returns true on success', async () => {
      const ok = await SecurityManager.secureStore('auth_token', 'abc');
      expect(ok).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_token',
        'abc'
      );
    });

    it('returns false and logs when storage fails', async () => {
      (mockSecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('keystore unavailable')
      );
      const ok = await SecurityManager.secureStore('k', 'v');
      expect(ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('retrieves a stored value', async () => {
      (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored');
      const value = await SecurityManager.secureRetrieve('k');
      expect(value).toBe('stored');
    });

    it('returns null and logs when retrieval fails', async () => {
      (mockSecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('read fail')
      );
      const value = await SecurityManager.secureRetrieve('k');
      expect(value).toBe(null);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // instance checkRateLimit — AsyncStorage-persisted sliding window
  // ---------------------------------------------------------------------------
  describe('instance checkRateLimit', () => {
    let nowSpy: jest.SpyInstance;

    afterEach(() => {
      nowSpy?.mockRestore();
    });

    it('allows the first request and persists state', async () => {
      // Fresh instance so rateLimitLoaded state is isolated.
      const svc = new SecurityManagerService();
      const allowed = await svc.checkRateLimit('rl-1', 2, 60000);
      expect(allowed).toBe(true);
      const stored = await AsyncStorage.getItem('@rate_limit_data');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored as string)['rl-1'].count).toBe(1);
    });

    it('blocks once the count reaches the max within the window (security assertion)', async () => {
      const svc = new SecurityManagerService();
      expect(await svc.checkRateLimit('rl-2', 2, 60000)).toBe(true); // count 1
      expect(await svc.checkRateLimit('rl-2', 2, 60000)).toBe(true); // count 2
      expect(await svc.checkRateLimit('rl-2', 2, 60000)).toBe(false); // blocked
    });

    it('resets the window after expiry', async () => {
      nowSpy = jest.spyOn(Date, 'now');
      const svc = new SecurityManagerService();
      nowSpy.mockReturnValue(1_000_000);
      expect(await svc.checkRateLimit('rl-3', 1, 1000)).toBe(true); // count 1
      expect(await svc.checkRateLimit('rl-3', 1, 1000)).toBe(false); // blocked
      // Advance beyond resetTime (1_000_000 + 1000).
      nowSpy.mockReturnValue(1_002_000);
      expect(await svc.checkRateLimit('rl-3', 1, 1000)).toBe(true); // reset
    });

    it('restores non-expired entries from AsyncStorage on load', async () => {
      const future = Date.now() + 100000;
      await AsyncStorage.setItem(
        '@rate_limit_data',
        JSON.stringify({ 'rl-4': { count: 5, resetTime: future } })
      );
      const svc = new SecurityManagerService();
      // count is already 5; with max 5 the next request must be blocked.
      expect(await svc.checkRateLimit('rl-4', 5, 60000)).toBe(false);
    });

    it('drops expired entries when loading from AsyncStorage', async () => {
      const past = Date.now() - 100000;
      await AsyncStorage.setItem(
        '@rate_limit_data',
        JSON.stringify({ 'rl-5': { count: 99, resetTime: past } })
      );
      const svc = new SecurityManagerService();
      // Expired entry dropped → treated as fresh → allowed.
      expect(await svc.checkRateLimit('rl-5', 1, 60000)).toBe(true);
    });

    it('handles a corrupt AsyncStorage payload by logging and continuing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{not-json');
      const svc = new SecurityManagerService();
      const allowed = await svc.checkRateLimit('rl-6', 5, 60000);
      expect(allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs when saving to AsyncStorage fails but still answers', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('quota exceeded')
      );
      const svc = new SecurityManagerService();
      const allowed = await svc.checkRateLimit('rl-7', 5, 60000);
      expect(allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save rate limit data:',
        expect.any(Error)
      );
    });

    it('only loads rate limit data once per instance', async () => {
      const svc = new SecurityManagerService();
      const getItemSpy = AsyncStorage.getItem as jest.Mock;
      getItemSpy.mockClear();
      await svc.checkRateLimit('rl-8', 5, 60000);
      await svc.checkRateLimit('rl-8', 5, 60000);
      // Second call should not re-read the persisted blob.
      expect(getItemSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // generateSecurityReport (instance)
  // ---------------------------------------------------------------------------
  describe('generateSecurityReport', () => {
    it('reports current rate-limit entries and the security config', async () => {
      const svc = new SecurityManagerService();
      await svc.checkRateLimit('report-id', 5, 60000);
      const report = svc.generateSecurityReport();
      expect(report.securityConfig.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(
        report.rateLimitStatus.find((r) => r.identifier === 'report-id')
      ).toBeDefined();
      expect(
        report.rateLimitStatus.find((r) => r.identifier === 'report-id')?.count
      ).toBe(1);
    });

    it('returns an empty rate-limit list for a fresh instance', () => {
      const svc = new SecurityManagerService();
      const report = svc.generateSecurityReport();
      expect(report.rateLimitStatus).toEqual([]);
    });
  });
});
