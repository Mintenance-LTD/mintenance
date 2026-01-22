import {
  formatCurrency,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatDateRange,
  formatPhone,
  formatName,
  getInitials,
  formatAddress,
  formatPercent,
  formatFileSize,
  formatDistance,
  truncate,
  pluralize,
  toSlug
} from '../../utils/formatters';

describe('Formatters Utility', () => {
  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(99.9)).toBe('$99.90');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-0.50)).toBe('-$0.50');
    });

    it('should support different currencies', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
      expect(formatCurrency(1234.56, 'JPY')).toBe('$1,234.56'); // Falls back to $
    });

    it('should handle invalid inputs', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency('abc')).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-03-15T10:30:00');

    it('should format date with default format', () => {
      expect(formatDate(testDate)).toBe('Mar 15, 2024');
    });

    it('should format date with short format', () => {
      expect(formatDate(testDate, 'short')).toBe('3/15/24');
    });

    it('should format date with long format', () => {
      expect(formatDate(testDate, 'long')).toBe('March 15, 2024');
    });
  });

  describe('formatTime', () => {
    const testDate = new Date('2024-03-15T14:30:00');
    const morningDate = new Date('2024-03-15T09:05:00');

    it('should format time in 12-hour format by default', () => {
      expect(formatTime(testDate)).toBe('2:30 PM');
      expect(formatTime(morningDate)).toBe('9:05 AM');
    });

    it('should format time in 24-hour format when specified', () => {
      expect(formatTime(testDate, '24h')).toBe('14:30');
      expect(formatTime(morningDate, '24h')).toBe('09:05');
    });
  });

  describe('formatRelativeTime', () => {
    const now = new Date();

    it('should format today correctly', () => {
      expect(formatRelativeTime(now)).toBe('today');
    });

    it('should format yesterday correctly', () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeTime(yesterday)).toBe('1 day ago');
    });

    it('should format days ago correctly', () => {
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should format weeks ago correctly', () => {
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');

      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      expect(formatRelativeTime(oneWeekAgo)).toBe('1 week ago');
    });

    it('should format months ago correctly', () => {
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      expect(formatRelativeTime(twoMonthsAgo)).toBe('2 months ago');

      const oneMonthAgo = new Date(now);
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      expect(formatRelativeTime(oneMonthAgo)).toBe('1 month ago');
    });
  });

  describe('formatDateRange', () => {
    it('should format same month and year', () => {
      const start = new Date('2024-03-01');
      const end = new Date('2024-03-15');
      expect(formatDateRange(start, end)).toBe('Mar 1 - 15, 2024');
    });

    it('should format different months, same year', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-03-20');
      expect(formatDateRange(start, end)).toBe('Jan 15 - Mar 20, 2024');
    });

    it('should format different years', () => {
      const start = new Date('2023-12-25');
      const end = new Date('2024-01-05');
      expect(formatDateRange(start, end)).toBe('Dec 25, 2023 - Jan 5, 2024');
    });
  });

  describe('formatPhone', () => {
    it('should format 10-digit US phone numbers', () => {
      expect(formatPhone('1234567890')).toBe('(123) 456-7890');
      expect(formatPhone('5551234567')).toBe('(555) 123-4567');
    });

    it('should format 11-digit numbers with country code', () => {
      expect(formatPhone('11234567890')).toBe('+1 (123) 456-7890');
      expect(formatPhone('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('should clean and format numbers with existing formatting', () => {
      expect(formatPhone('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhone('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhone('123.456.7890')).toBe('(123) 456-7890');
    });

    it('should return original for invalid phone numbers', () => {
      expect(formatPhone('123')).toBe('123');
      expect(formatPhone('12345678901234567890')).toBe('12345678901234567890');
      expect(formatPhone('abcdefghij')).toBe('abcdefghij');
    });
  });

  describe('formatName', () => {
    it('should capitalize names correctly', () => {
      expect(formatName('john doe')).toBe('John Doe');
      expect(formatName('JANE SMITH')).toBe('Jane Smith');
      expect(formatName('mARY jONES')).toBe('Mary Jones');
    });

    it('should handle hyphenated names', () => {
      expect(formatName('mary-jane')).toBe('Mary Jane');
      expect(formatName('anne-marie smith')).toBe('Anne Marie Smith');
    });

    it('should handle single names', () => {
      expect(formatName('john')).toBe('John');
      expect(formatName('MARY')).toBe('Mary');
    });
  });

  describe('getInitials', () => {
    it('should get initials from full names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane Mary Smith')).toBe('JS');
      expect(getInitials('Bob')).toBe('B');
    });

    it('should handle empty strings', () => {
      expect(getInitials('')).toBe('');
      expect(getInitials('   ')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(getInitials('John  Doe')).toBe('JD');
      expect(getInitials('  Jane   Smith  ')).toBe('JS');
    });
  });

  describe('formatAddress', () => {
    it('should format complete addresses', () => {
      const address = {
        street: '123 Main St',
        apt: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zip: '10001'
      };
      expect(formatAddress(address)).toBe('123 Main St, Apt 4B, New York, NY 10001');
    });

    it('should handle missing apt', () => {
      const address = {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001'
      };
      expect(formatAddress(address)).toBe('456 Oak Ave, Los Angeles, CA 90001');
    });

    it('should handle partial addresses', () => {
      const address = {
        street: '789 Pine Rd',
        city: 'Chicago'
      };
      expect(formatAddress(address)).toBe('789 Pine Rd');
    });

    it('should handle null/undefined', () => {
      expect(formatAddress(null)).toBe('');
      expect(formatAddress(undefined)).toBe('');
    });
  });

  describe('formatPercent', () => {
    it('should format percentages with default decimals', () => {
      expect(formatPercent(0.1234)).toBe('12.34%');
      expect(formatPercent(0.5)).toBe('50.00%');
      expect(formatPercent(1)).toBe('100.00%');
    });

    it('should format with custom decimal places', () => {
      expect(formatPercent(0.1234, 0)).toBe('12%');
      expect(formatPercent(0.1234, 1)).toBe('12.3%');
      expect(formatPercent(0.1234, 3)).toBe('12.340%');
    });

    it('should handle edge cases', () => {
      expect(formatPercent(0)).toBe('0.00%');
      expect(formatPercent(-0.15)).toBe('-15.00%');
      expect(formatPercent(1.5)).toBe('150.00%');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(5120)).toBe('5 KB');
      expect(formatFileSize(1048575)).toBe('1024 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
      expect(formatFileSize(1073741823)).toBe('1024 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });
  });

  describe('formatDistance', () => {
    it('should format distances in feet for less than 1 mile', () => {
      expect(formatDistance(0.1)).toBe('528 ft');
      expect(formatDistance(0.5)).toBe('2640 ft');
      expect(formatDistance(0.999)).toBe('5275 ft');
    });

    it('should format distances in miles', () => {
      expect(formatDistance(1)).toBe('1 mi');
      expect(formatDistance(5.5)).toBe('5.5 mi');
      expect(formatDistance(1234)).toBe('1,234 mi');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('This is a very long text that needs truncation', 20))
        .toBe('This is a very lo...');
      expect(truncate('Short text', 20)).toBe('Short text');
    });

    it('should handle edge cases', () => {
      expect(truncate('', 10)).toBe('');
      expect(truncate(null, 10)).toBe('');
      expect(truncate(undefined, 10)).toBe('');
    });

    it('should handle very short limits', () => {
      expect(truncate('Hello', 3)).toBe('...');
      expect(truncate('Hi', 5)).toBe('Hi');
    });
  });

  describe('pluralize', () => {
    it('should handle singular correctly', () => {
      expect(pluralize(1, 'item')).toBe('1 item');
      expect(pluralize(1, 'person', 'people')).toBe('1 person');
    });

    it('should handle plural with default s', () => {
      expect(pluralize(0, 'item')).toBe('0 items');
      expect(pluralize(2, 'item')).toBe('2 items');
      expect(pluralize(100, 'file')).toBe('100 files');
    });

    it('should handle custom plural forms', () => {
      expect(pluralize(0, 'person', 'people')).toBe('0 people');
      expect(pluralize(5, 'child', 'children')).toBe('5 children');
      expect(pluralize(3, 'goose', 'geese')).toBe('3 geese');
    });
  });

  describe('toSlug', () => {
    it('should convert text to slug', () => {
      expect(toSlug('Hello World')).toBe('hello-world');
      expect(toSlug('This Is A Test!')).toBe('this-is-a-test');
      expect(toSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });

    it('should handle special characters', () => {
      expect(toSlug('Test@#$%^&*()123')).toBe('test-123');
      expect(toSlug('hello_world')).toBe('hello-world');
      expect(toSlug('one+two=three')).toBe('one-two-three');
    });

    it('should handle edge cases', () => {
      expect(toSlug('')).toBe('');
      expect(toSlug(null)).toBe('');
      expect(toSlug(undefined)).toBe('');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(toSlug('---test---')).toBe('test');
      expect(toSlug('!!!hello!!!')).toBe('hello');
    });
  });
});