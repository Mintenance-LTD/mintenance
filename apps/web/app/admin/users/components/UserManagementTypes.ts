export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'contractor' | 'homeowner' | 'admin';
  company_name?: string | null;
  admin_verified?: boolean;
  created_at: string;
  updated_at: string;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'not_submitted' | 'not_applicable';
  hasVerificationData?: boolean;
  isTestUser?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getUserDisplayName(user: User): string {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  if (user.company_name) return user.company_name;
  return user.email.split('@')[0];
}

export function getUserInitials(user: User): string {
  if (user.first_name || user.last_name) {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  }
  if (user.company_name) return user.company_name.substring(0, 2).toUpperCase();
  return user.email.substring(0, 2).toUpperCase();
}
