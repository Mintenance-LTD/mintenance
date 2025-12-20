/**
 * ARIA Label Utilities
 *
 * Helps generate descriptive, accessible labels for UI elements
 */

/**
 * Generate accessible button label
 */
export function getButtonAriaLabel(action: string, context?: string): string {
  return context ? `${action} ${context}` : action;
}

/**
 * Generate accessible link label
 */
export function getLinkAriaLabel(destination: string, context?: string): string {
  return context ? `Go to ${destination} - ${context}` : `Go to ${destination}`;
}

/**
 * Generate accessible icon button label
 */
export function getIconButtonAriaLabel(icon: string, action?: string): string {
  const baseLabel = icon.charAt(0).toUpperCase() + icon.slice(1);
  return action ? `${action} (${baseLabel})` : baseLabel;
}

/**
 * Generate accessible form field label
 */
export function getFormFieldAriaLabel(
  fieldName: string,
  required: boolean = false,
  helpText?: string
): string {
  const label = fieldName;
  const requiredText = required ? ' (required)' : '';
  const help = helpText ? `. ${helpText}` : '';
  return `${label}${requiredText}${help}`;
}

/**
 * Generate accessible error message
 */
export function getErrorAriaLabel(fieldName: string, error: string): string {
  return `Error for ${fieldName}: ${error}`;
}

/**
 * Generate accessible loading state
 */
export function getLoadingAriaLabel(context?: string): string {
  return context ? `Loading ${context}` : 'Loading';
}

/**
 * Generate accessible empty state
 */
export function getEmptyStateAriaLabel(itemType: string): string {
  return `No ${itemType} found`;
}

/**
 * Generate accessible pagination label
 */
export function getPaginationAriaLabel(currentPage: number, totalPages: number): string {
  return `Page ${currentPage} of ${totalPages}`;
}

/**
 * Generate accessible rating label
 */
export function getRatingAriaLabel(rating: number, maxRating: number = 5): string {
  return `Rating: ${rating} out of ${maxRating} stars`;
}

/**
 * Generate accessible status badge label
 */
export function getStatusBadgeAriaLabel(status: string, context?: string): string {
  return context ? `${context} status: ${status}` : `Status: ${status}`;
}

/**
 * Generate accessible modal label
 */
export function getModalAriaLabel(title: string, isOpen: boolean): {
  'aria-label': string;
  'aria-modal': boolean;
  role: 'dialog';
} {
  return {
    'aria-label': title,
    'aria-modal': isOpen,
    role: 'dialog',
  };
}

/**
 * Generate accessible disclosure button
 */
export function getDisclosureAriaLabel(title: string, isExpanded: boolean): {
  'aria-label': string;
  'aria-expanded': boolean;
} {
  return {
    'aria-label': `${isExpanded ? 'Collapse' : 'Expand'} ${title}`,
    'aria-expanded': isExpanded,
  };
}

/**
 * Generate accessible tab
 */
export function getTabAriaProps(
  label: string,
  isSelected: boolean,
  panelId: string
): {
  'aria-label': string;
  'aria-selected': boolean;
  'aria-controls': string;
  role: 'tab';
  tabIndex: number;
} {
  return {
    'aria-label': label,
    'aria-selected': isSelected,
    'aria-controls': panelId,
    role: 'tab',
    tabIndex: isSelected ? 0 : -1,
  };
}
