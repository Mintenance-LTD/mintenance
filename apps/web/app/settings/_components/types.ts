/** Shared types for the settings page components */

export type SectionKey =
  | 'profile'
  | 'account'
  | 'notifications'
  | 'payments'
  | 'automation'
  | 'privacy';

/** Extended user fields that may come from the database but aren't in the base User type */
export interface UserWithLocation {
  address?: string;
  city?: string;
  postcode?: string;
}

export interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  profile_image_url: string;
  address: string;
  city: string;
  postcode: string;
}

export interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationPrefs {
  emailJobs: boolean;
  emailMessages: boolean;
  emailPayments: boolean;
  emailMarketing: boolean;
  smsJobs: boolean;
  smsMessages: boolean;
  smsPayments: boolean;
  smsMarketing: boolean;
  pushJobs: boolean;
  pushMessages: boolean;
  pushPayments: boolean;
  pushMarketing: boolean;
}

export interface SidebarSection {
  key: SectionKey;
  label: string;
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'account', label: 'Account & Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'payments', label: 'Payments' },
  { key: 'automation', label: 'AI & Automation' },
  { key: 'privacy', label: 'Privacy' },
];
