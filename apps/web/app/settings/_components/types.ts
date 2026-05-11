/** Shared types for the settings page components */

export type SectionKey =
  | 'profile'
  | 'account'
  | 'notifications'
  | 'payments'
  | 'automation'
  | 'privacy'
  | 'appearance';

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

interface SidebarSection {
  key: SectionKey;
  label: string;
  /**
   * Optional external href. When present, the sidebar renders a link
   * to that URL instead of switching the in-page `activeSection`.
   * Used to redirect "Notifications" to the canonical
   * `/settings/notifications` page (audit follow-up 2026-04-29) —
   * the in-page `<NotificationsSection>` posts to the legacy
   * `/api/users/notification-preferences` JSONB column, while the
   * dedicated page uses the canonical
   * `/api/user/notification-preferences` table. Mobile is already
   * routed at the canonical screen; this stops the two surfaces
   * drifting back apart.
   */
  href?: string;
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'account', label: 'Account & Security' },
  {
    key: 'notifications',
    label: 'Notifications',
    href: '/settings/notifications',
  },
  { key: 'payments', label: 'Payments' },
  { key: 'automation', label: 'AI & Automation' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'privacy', label: 'Privacy' },
];
