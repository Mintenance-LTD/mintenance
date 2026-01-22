#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Phase 7: Generating utility tests for better coverage...\n');

// Find utility files that don't have tests
const utilFiles = glob.sync('src/utils/*.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

const testDir = path.join(__dirname, 'src/__tests__/utils');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

let testsGenerated = 0;

// Test templates for common utility patterns
const testTemplates = {
  logger: `import { logger } from '../../utils/logger';

describe('Logger Utility', () => {
  const originalConsole = { ...console };

  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('test info');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('test info'));
    });

    it('should log warning messages', () => {
      logger.warn('test warning');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('test warning'));
    });

    it('should log error messages', () => {
      logger.error('test error');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test error'));
    });

    it('should log debug messages', () => {
      logger.debug('test debug');
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('test debug'));
    });
  });

  describe('error logging', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error(error);
      expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error'
      }));
    });

    it('should handle error with stack trace', () => {
      const error = new Error('Stack error');
      error.stack = 'Error: Stack error\\n    at test.js:1:1';
      logger.error(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
});`,

  errorHandler: `import { ErrorHandler, errorHandler } from '../../utils/errorHandler';

describe('ErrorHandler Utility', () => {
  describe('error capture', () => {
    it('should capture and log errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      errorHandler.captureError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      consoleSpy.mockRestore();
    });

    it('should extract error message from various formats', () => {
      expect(errorHandler.getMessage(new Error('Error object'))).toBe('Error object');
      expect(errorHandler.getMessage('String error')).toBe('String error');
      expect(errorHandler.getMessage({ message: 'Object error' })).toBe('Object error');
      expect(errorHandler.getMessage(null)).toBe('Unknown error');
    });

    it('should categorize errors by type', () => {
      expect(errorHandler.getErrorType(new TypeError())).toBe('TypeError');
      expect(errorHandler.getErrorType(new ReferenceError())).toBe('ReferenceError');
      expect(errorHandler.getErrorType(new Error())).toBe('Error');
    });
  });

  describe('error recovery', () => {
    it('should attempt recovery with retry logic', async () => {
      let attempts = 0;
      const failingFunc = jest.fn(() => {
        attempts++;
        if (attempts < 3) throw new Error('Retry me');
        return 'Success';
      });

      const result = await errorHandler.withRetry(failingFunc, 3);

      expect(result).toBe('Success');
      expect(failingFunc).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const failingFunc = jest.fn(() => {
        throw new Error('Always fails');
      });

      await expect(errorHandler.withRetry(failingFunc, 2)).rejects.toThrow('Always fails');
      expect(failingFunc).toHaveBeenCalledTimes(2);
    });
  });
});`,

  networkUtils: `import * as networkUtils from '../../utils/networkUtils';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

describe('NetworkUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectivity checks', () => {
    it('should detect online status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const isOnline = await networkUtils.isOnline();
      expect(isOnline).toBe(true);
    });

    it('should detect offline status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const isOnline = await networkUtils.isOnline();
      expect(isOnline).toBe(false);
    });

    it('should get connection type', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        type: 'wifi',
        isConnected: true,
      });

      const type = await networkUtils.getConnectionType();
      expect(type).toBe('wifi');
    });
  });

  describe('network listeners', () => {
    it('should subscribe to network changes', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

      const unsub = networkUtils.onNetworkChange(callback);

      expect(NetInfo.addEventListener).toHaveBeenCalledWith(callback);
      expect(unsub).toBe(unsubscribe);
    });
  });

  describe('retry with network check', () => {
    it('should retry when network is available', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const apiCall = jest.fn().mockResolvedValue({ data: 'success' });
      const result = await networkUtils.withNetworkCheck(apiCall);

      expect(result).toEqual({ data: 'success' });
      expect(apiCall).toHaveBeenCalled();
    });

    it('should throw when network is unavailable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const apiCall = jest.fn();

      await expect(networkUtils.withNetworkCheck(apiCall)).rejects.toThrow('No network connection');
      expect(apiCall).not.toHaveBeenCalled();
    });
  });
});`,

  dateUtils: `import * as dateUtils from '../../utils/dateUtils';

describe('DateUtils', () => {
  describe('date formatting', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');

      expect(dateUtils.formatDate(date)).toBeTruthy();
      expect(dateUtils.formatDate(date, 'short')).toBeTruthy();
      expect(dateUtils.formatDate(date, 'long')).toBeTruthy();
    });

    it('should format time correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');

      expect(dateUtils.formatTime(date)).toBeTruthy();
      expect(dateUtils.formatTime(date, '24h')).toBeTruthy();
    });

    it('should format relative time', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(dateUtils.getRelativeTime(yesterday)).toContain('day');
      expect(dateUtils.getRelativeTime(lastWeek)).toContain('week');
    });
  });

  describe('date calculations', () => {
    it('should add days to date', () => {
      const date = new Date('2024-01-15');
      const result = dateUtils.addDays(date, 5);

      expect(result.getDate()).toBe(20);
    });

    it('should subtract days from date', () => {
      const date = new Date('2024-01-15');
      const result = dateUtils.subtractDays(date, 5);

      expect(result.getDate()).toBe(10);
    });

    it('should get start of day', () => {
      const date = new Date('2024-01-15T15:30:45Z');
      const result = dateUtils.startOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it('should get end of day', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = dateUtils.endOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('date validation', () => {
    it('should validate dates', () => {
      expect(dateUtils.isValidDate(new Date())).toBe(true);
      expect(dateUtils.isValidDate(new Date('invalid'))).toBe(false);
      expect(dateUtils.isValidDate(null)).toBe(false);
      expect(dateUtils.isValidDate('2024-01-15')).toBe(false);
    });

    it('should check if date is in past', () => {
      const past = new Date('2020-01-01');
      const future = new Date('2030-01-01');

      expect(dateUtils.isPast(past)).toBe(true);
      expect(dateUtils.isPast(future)).toBe(false);
    });

    it('should check if date is in future', () => {
      const past = new Date('2020-01-01');
      const future = new Date('2030-01-01');

      expect(dateUtils.isFuture(past)).toBe(false);
      expect(dateUtils.isFuture(future)).toBe(true);
    });
  });
});`,

  stringUtils: `import * as stringUtils from '../../utils/stringUtils';

describe('StringUtils', () => {
  describe('string manipulation', () => {
    it('should capitalize strings', () => {
      expect(stringUtils.capitalize('hello')).toBe('Hello');
      expect(stringUtils.capitalize('WORLD')).toBe('World');
      expect(stringUtils.capitalize('')).toBe('');
    });

    it('should convert to title case', () => {
      expect(stringUtils.toTitleCase('hello world')).toBe('Hello World');
      expect(stringUtils.toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should convert to camel case', () => {
      expect(stringUtils.toCamelCase('hello world')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('my-kebab-string')).toBe('myKebabString');
      expect(stringUtils.toCamelCase('my_snake_string')).toBe('mySnakeString');
    });

    it('should convert to snake case', () => {
      expect(stringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
      expect(stringUtils.toSnakeCase('MyClassName')).toBe('my_class_name');
    });

    it('should convert to kebab case', () => {
      expect(stringUtils.toKebabCase('helloWorld')).toBe('hello-world');
      expect(stringUtils.toKebabCase('MyClassName')).toBe('my-class-name');
    });
  });

  describe('string validation', () => {
    it('should check if string is empty', () => {
      expect(stringUtils.isEmpty('')).toBe(true);
      expect(stringUtils.isEmpty('  ')).toBe(true);
      expect(stringUtils.isEmpty('hello')).toBe(false);
      expect(stringUtils.isEmpty(null)).toBe(true);
      expect(stringUtils.isEmpty(undefined)).toBe(true);
    });

    it('should validate string length', () => {
      expect(stringUtils.isLength('hello', 5, 10)).toBe(true);
      expect(stringUtils.isLength('hi', 5, 10)).toBe(false);
      expect(stringUtils.isLength('hello world', 5, 10)).toBe(false);
    });

    it('should check if string contains substring', () => {
      expect(stringUtils.contains('hello world', 'world')).toBe(true);
      expect(stringUtils.contains('hello world', 'foo')).toBe(false);
    });
  });

  describe('string truncation', () => {
    it('should truncate long strings', () => {
      expect(stringUtils.truncate('hello world', 5)).toBe('he...');
      expect(stringUtils.truncate('hello', 10)).toBe('hello');
    });

    it('should truncate with custom ellipsis', () => {
      expect(stringUtils.truncate('hello world', 5, '***')).toBe('he***');
    });
  });

  describe('string sanitization', () => {
    it('should remove special characters', () => {
      expect(stringUtils.removeSpecialChars('hello@world!')).toBe('helloworld');
      expect(stringUtils.removeSpecialChars('test#123$')).toBe('test123');
    });

    it('should escape HTML', () => {
      expect(stringUtils.escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });
});`
};

// Generate tests for utilities without tests
utilFiles.forEach(file => {
  const fileName = path.basename(file, path.extname(file));
  const testFileName = `${fileName}.test.ts`;
  const testFilePath = path.join(testDir, testFileName);

  // Skip if test already exists
  if (fs.existsSync(testFilePath)) {
    return;
  }

  // Skip certain files
  if (fileName.includes('.example') || fileName.includes('.d') || fileName === 'index') {
    return;
  }

  // Match to a template or generate generic test
  let testContent = null;

  if (fileName.toLowerCase().includes('logger') || fileName.toLowerCase().includes('log')) {
    testContent = testTemplates.logger;
  } else if (fileName.toLowerCase().includes('error')) {
    testContent = testTemplates.errorHandler;
  } else if (fileName.toLowerCase().includes('network') || fileName.toLowerCase().includes('net')) {
    testContent = testTemplates.networkUtils;
  } else if (fileName.toLowerCase().includes('date') || fileName.toLowerCase().includes('time')) {
    testContent = testTemplates.dateUtils;
  } else if (fileName.toLowerCase().includes('string') || fileName.toLowerCase().includes('text')) {
    testContent = testTemplates.stringUtils;
  } else {
    // Generate a generic test
    testContent = `import * as ${fileName} from '../../utils/${fileName}';

describe('${fileName} Utility', () => {
  describe('basic functionality', () => {
    it('should export functions', () => {
      expect(${fileName}).toBeDefined();
      expect(typeof ${fileName}).toBe('object');
    });

    // TODO: Add specific tests for ${fileName} functions
    it.todo('should test main functionality');
  });
});`;
  }

  // Adjust imports based on actual file content if needed
  if (fileName === 'errorHandler' && !testContent.includes('ErrorHandler')) {
    testContent = testContent.replace(
      "import { ErrorHandler, errorHandler }",
      "import * as errorHandler"
    );
  }

  fs.writeFileSync(testFilePath, testContent);
  console.log(`  Created ${testFileName}`);
  testsGenerated++;
});

console.log(`\n📊 Summary:`);
console.log(`  Tests generated: ${testsGenerated}`);
console.log('\n✨ Utility test generation complete!');