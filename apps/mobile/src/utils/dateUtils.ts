export const formatDate = (date: Date, format?: string): string => {
  if (!date || !(date instanceof Date)) return '';

  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  } else if (format === 'long') {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US');
};

export const formatTime = (date: Date, format?: string): string => {
  if (!date || !(date instanceof Date)) return '';

  if (format === '24h') {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;

  return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const subtractDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

export const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const isValidDate = (date: unknown): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const isPast = (date: Date): boolean => {
  return date < new Date();
};

export const isFuture = (date: Date): boolean => {
  return date > new Date();
};