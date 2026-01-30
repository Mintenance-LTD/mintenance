export const formatCurrency = (amount: string | number, currency = 'USD'): string => {
  const value = Number(amount) || 0;
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || '$';
  const formatted = Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const formatDate = (date: Date, format = 'default'): string => {
  const options: Intl.DateTimeFormatOptions = format === 'short' ? { year: '2-digit', month: 'numeric', day: 'numeric' } :
                       format === 'long' ? { year: 'numeric', month: 'long', day: 'numeric' } :
                       { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

export const formatTime = (date: Date, format = '12h'): string => {
  if (format === '24h') {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`;
};

export const formatDateRange = (start: Date, end: Date): string => {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();

  // Same month and year: "Jan 1 - 15, 2024"
  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startDay} - ${endDay}, ${endYear}`;
  }

  // Different months, same year: "Jan 1 - Feb 15, 2024"
  if (startYear === endYear) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
  }

  // Different years
  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

export const formatName = (name: string): string => {
  return name.split(/[\s-]/).map(part =>
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join(' ');
};

export const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface Address {
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export const formatAddress = (address: Address | null | undefined): string => {
  if (!address) return '';
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.apt) parts.push(address.apt);
  if (address.city && address.state && address.zip) {
    parts.push(`${address.city}, ${address.state} ${address.zip}`);
  }
  return parts.join(', ');
};

export const formatPercent = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1073741824) return `${Math.round(bytes / 1048576)} MB`;
  return `${Math.round(bytes / 1073741824)} GB`;
};

export const formatDistance = (miles: number): string => {
  if (miles < 1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toLocaleString()} mi`;
};

export const truncate = (text: string, length: number): string => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length - 3) + '...' : text;
};

export const pluralize = (count: number, word: string, plural?: string): string => {
  if (count === 1) return `${count} ${word}`;
  return `${count} ${plural || word + 's'}`;
};

export const toSlug = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};