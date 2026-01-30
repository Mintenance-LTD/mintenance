export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const toCamelCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, (c) => c.toLowerCase());
};

export const toSnakeCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[-\s]+/g, '_');
};

export const toKebabCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[_\s]+/g, '-');
};

export const isEmpty = (str: unknown): boolean => {
  return !str || (typeof str === 'string' && str.trim().length === 0);
};

export const isLength = (str: string, min: number, max: number): boolean => {
  if (!str) return false;
  const len = str.length;
  return len >= min && len <= max;
};

export const contains = (str: string, substring: string): boolean => {
  if (!str || !substring) return false;
  return str.indexOf(substring) !== -1;
};

export const truncate = (str: string, maxLength: number, ellipsis = '...'): string => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
};

export const removeSpecialChars = (str: string): string => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '');
};

export const escapeHtml = (str: string): string => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};