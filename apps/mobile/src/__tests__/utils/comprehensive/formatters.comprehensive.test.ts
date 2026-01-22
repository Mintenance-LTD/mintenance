import * as formatters from '../../../utils/formatters';

describe('Formatter Utilities - Comprehensive', () => {
  describe('Currency Formatting', () => {
    it('should format USD currency', () => {
      expect(formatters.formatCurrency(100)).toBe('$100.00');
      expect(formatters.formatCurrency(1000.5)).toBe('$1,000.50');
      expect(formatters.formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('should handle different currencies', () => {
      expect(formatters.formatCurrency(100, 'EUR')).toBe('€100.00');
      expect(formatters.formatCurrency(100, 'GBP')).toBe('£100.00');
    });

    it('should handle negative values', () => {
      expect(formatters.formatCurrency(-100)).toBe('-$100.00');
      expect(formatters.formatCurrency(-1000)).toBe('-$1,000.00');
    });

    it('should handle edge cases', () => {
      expect(formatters.formatCurrency(0)).toBe('$0.00');
      expect(formatters.formatCurrency(null)).toBe('$0.00');
      expect(formatters.formatCurrency(undefined)).toBe('$0.00');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatters.formatDate(date)).toBe('Jan 15, 2024');
      expect(formatters.formatDate(date, 'short')).toBe('1/15/24');
      expect(formatters.formatDate(date, 'long')).toBe('January 15, 2024');
    });

    it('should format time', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatters.formatTime(date)).toBe('10:30 AM');
      expect(formatters.formatTime(date, '24h')).toBe('10:30');
    });

    it('should format relative time', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(formatters.formatRelativeTime(yesterday)).toBe('1 day ago');
      expect(formatters.formatRelativeTime(lastWeek)).toBe('1 week ago');
    });

    it('should format date ranges', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-15');
      expect(formatters.formatDateRange(start, end)).toBe('Jan 1 - 15, 2024');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format US phone numbers', () => {
      expect(formatters.formatPhone('2125551234')).toBe('(212) 555-1234');
      expect(formatters.formatPhone('+12125551234')).toBe('+1 (212) 555-1234');
    });

    it('should handle partial numbers', () => {
      expect(formatters.formatPhone('212')).toBe('212');
      expect(formatters.formatPhone('2125')).toBe('(212) 5');
      expect(formatters.formatPhone('212555')).toBe('(212) 555');
    });
  });

  describe('Name Formatting', () => {
    it('should format names', () => {
      expect(formatters.formatName('john doe')).toBe('John Doe');
      expect(formatters.formatName('JANE SMITH')).toBe('Jane Smith');
      expect(formatters.formatName('mary-jane watson')).toBe('Mary-Jane Watson');
    });

    it('should handle initials', () => {
      expect(formatters.getInitials('John Doe')).toBe('JD');
      expect(formatters.getInitials('Jane Mary Smith')).toBe('JS');
      expect(formatters.getInitials('A')).toBe('A');
    });
  });

  describe('Address Formatting', () => {
    it('should format addresses', () => {
      const address = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
      };
      expect(formatters.formatAddress(address)).toBe('123 Main St, New York, NY 10001');
    });

    it('should handle apartment numbers', () => {
      const address = {
        street: '123 Main St',
        apt: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zip: '10001',
      };
      expect(formatters.formatAddress(address)).toBe('123 Main St Apt 4B, New York, NY 10001');
    });
  });

  describe('Number Formatting', () => {
    it('should format percentages', () => {
      expect(formatters.formatPercent(0.1534)).toBe('15.34%');
      expect(formatters.formatPercent(1)).toBe('100%');
      expect(formatters.formatPercent(0.5)).toBe('50%');
    });

    it('should format file sizes', () => {
      expect(formatters.formatFileSize(1024)).toBe('1 KB');
      expect(formatters.formatFileSize(1048576)).toBe('1 MB');
      expect(formatters.formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should format distances', () => {
      expect(formatters.formatDistance(0.5)).toBe('0.5 mi');
      expect(formatters.formatDistance(10)).toBe('10 mi');
      expect(formatters.formatDistance(1000)).toBe('1,000 mi');
    });
  });

  describe('Text Formatting', () => {
    it('should truncate text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(formatters.truncate(longText, 20)).toBe('This is a very lo...');
      expect(formatters.truncate('Short', 20)).toBe('Short');
    });

    it('should pluralize words', () => {
      expect(formatters.pluralize(1, 'item')).toBe('1 item');
      expect(formatters.pluralize(2, 'item')).toBe('2 items');
      expect(formatters.pluralize(0, 'item')).toBe('0 items');
    });

    it('should convert to slug', () => {
      expect(formatters.toSlug('Hello World')).toBe('hello-world');
      expect(formatters.toSlug('This & That')).toBe('this-that');
      expect(formatters.toSlug('  Spaces  ')).toBe('spaces');
    });
  });
});