import { logger } from '@mintenance/shared';
import toast from 'react-hot-toast';
import type { ProfileData, PasswordData, NotificationPrefs } from './types';

/**
 * Save profile data to the server.
 *
 * Audit step 7 (2026-04-29): migrated from `POST /api/user/update-profile`
 * (legacy, camelCase body, mixed image+text update) to
 * `PUT /api/users/profile` (canonical, snake_case body, text-only).
 * Avatar uploads go through the dedicated `uploadAvatar` helper
 * below (now `POST /api/users/avatar`).
 */
export async function saveProfile(
  profileData: ProfileData,
  csrfToken: string | null,
  refresh: () => void
): Promise<boolean> {
  try {
    // The canonical PUT route's Zod schema is snake_case and
    // text-only — no `profileImageUrl` (avatar lives on its own
    // endpoint). Keep the trim() guards to drop unchanged-empty
    // pre-fill values so optional-field validation doesn't trip.
    const body: Record<string, string> = {};
    if (profileData.first_name?.trim())
      body.first_name = profileData.first_name.trim();
    if (profileData.last_name?.trim())
      body.last_name = profileData.last_name.trim();
    if (profileData.phone?.trim()) body.phone = profileData.phone.trim();
    if (profileData.bio?.trim()) body.bio = profileData.bio.trim();
    if (profileData.address?.trim()) body.address = profileData.address.trim();
    if (profileData.city?.trim()) body.city = profileData.city.trim();
    if (profileData.postcode?.trim())
      body.postcode = profileData.postcode.trim();

    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      toast.success('Profile updated successfully');
      refresh();
      return true;
    } else {
      toast.error('Failed to update profile');
      return false;
    }
  } catch {
    toast.error('Error updating profile');
    return false;
  }
}

/**
 * Upload avatar image.
 *
 * Audit step 7 (2026-04-29): migrated from
 * `POST /api/user/update-profile` (legacy multipart bundling
 * `profileImage` with non-image fields) to
 * `POST /api/users/avatar` — the dedicated avatar surface that
 * writes to the `avatars` bucket and properly cleans up the
 * previous blob (commit `1a78fc63`).
 */
export async function uploadAvatar(
  file: File,
  csrfToken: string | null,
  refresh: () => void
): Promise<string | null> {
  const formData = new FormData();
  // The canonical route reads the field name `avatar` (the legacy
  // multipart route read `profileImage`).
  formData.append('avatar', file);

  try {
    const response = await fetch('/api/users/avatar', {
      method: 'POST',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.profile_image_url) {
        toast.success('Profile picture updated');
        refresh();
        return data.profile_image_url as string;
      }
    } else {
      toast.error('Failed to upload image');
    }
  } catch {
    toast.error('Error uploading image');
  }
  return null;
}

/** Change user password via Supabase Auth */
export async function changePassword(
  passwordData: PasswordData,
  userEmail: string
): Promise<boolean> {
  if (passwordData.newPassword !== passwordData.confirmPassword) {
    toast.error('Passwords do not match');
    return false;
  }
  if (passwordData.newPassword.length < 8) {
    toast.error('Password must be at least 8 characters');
    return false;
  }

  try {
    const { supabase } = await import('@/lib/supabase');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: passwordData.currentPassword,
    });
    if (authError) {
      toast.error('Current password is incorrect');
      return false;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });
    if (updateError) {
      toast.error(updateError.message || 'Failed to change password');
      return false;
    }

    toast.success('Password changed successfully');
    return true;
  } catch {
    toast.error('Error changing password');
    return false;
  }
}

/**
 * Save notification preferences (legacy detailed flags).
 *
 * Hits /api/users/notification-preferences (plural) which stores the
 * 17-field camelCase JSONB blob on profiles.notification_preferences.
 *
 * NOT a duplicate of /api/user/notification-preferences (singular):
 * the singular endpoint stores a different shape (push_enabled,
 * disabled_types[], quiet_hours_start/end, timezone) on a dedicated
 * `user_notification_preferences` row, used by the newer R2 form at
 * apps/web/app/settings/notifications and the mobile inbox screen.
 *
 * Until the two are unified via a DB migration, both call sites are
 * intentional. Editing one will not affect the other.
 */
export async function saveNotificationPreferences(
  notificationPrefs: NotificationPrefs,
  csrfToken: string | null
): Promise<boolean> {
  try {
    const res = await fetch('/api/users/notification-preferences', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify(notificationPrefs),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error?.message || data.message || 'Failed to save');
    }
    toast.success('Notification preferences updated');
    return true;
  } catch (err) {
    toast.error(
      err instanceof Error
        ? err.message
        : 'Error updating notification preferences'
    );
    return false;
  }
}

/** Export user data as downloadable JSON */
export async function exportUserData(
  csrfToken: string | null
): Promise<boolean> {
  try {
    const response = await fetch('/api/user/export-data', {
      method: 'POST',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
      return true;
    } else {
      toast.error('Failed to export data');
      return false;
    }
  } catch {
    toast.error('Error exporting data');
    return false;
  }
}

/** Delete user account */
export async function deleteAccount(
  csrfToken: string | null
): Promise<boolean> {
  try {
    const response = await fetch('/api/user/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    if (response.ok) {
      toast.success('Account deleted successfully');
      window.location.href = '/login?deleted=true';
      return true;
    }
    // 2026-05-27 audit-75 P1: the route returns 409 with
    // `{ error, blockers: [...], help }` when held escrow / active
    // jobs / open disputes / signed-unfunded contracts block the
    // hard-delete. Previously we showed the generic "Failed to
    // delete account" toast and the user had no idea what to fix.
    // Now: parse the body, surface each blocker message as its own
    // toast (each is short + actionable — "X escrow payment(s)
    // still in flight... settle them before deleting") plus the
    // top-level error as a header toast. 422 / 500 paths fall
    // through to the same generic message via the `error` field.
    let parsed: {
      error?: string;
      blockers?: Array<{ code?: string; message?: string }>;
      help?: string;
    } = {};
    try {
      parsed = (await response.json()) as typeof parsed;
    } catch {
      // body wasn't JSON — fall through to generic
    }
    if (Array.isArray(parsed.blockers) && parsed.blockers.length > 0) {
      toast.error(parsed.error || 'Resolve these before deleting your account');
      parsed.blockers.forEach((b) => {
        if (b && typeof b.message === 'string') {
          toast.error(b.message);
        }
      });
    } else {
      toast.error(parsed.error || 'Failed to delete account');
    }
    return false;
  } catch {
    toast.error('Error deleting account');
    return false;
  }
}

/** Send phone verification code */
export async function sendVerificationCode(
  phone: string,
  csrfToken: string | null
): Promise<boolean> {
  if (!csrfToken) {
    toast.error('Security token not available. Please refresh the page.');
    return false;
  }

  try {
    toast.loading('Sending verification code...', { id: 'verify' });

    const sendResponse = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'send',
        phoneNumber: phone,
      }),
    });

    const sendData = await sendResponse.json();

    if (!sendResponse.ok) {
      toast.error(sendData.error || 'Failed to send verification code', {
        id: 'verify',
      });
      return false;
    }

    toast.success('Verification code sent to your phone!', { id: 'verify' });
    return true;
  } catch (error) {
    logger.error('Verification error:', error);
    toast.error('Failed to send verification code. Please try again.', {
      id: 'verify',
    });
    return false;
  }
}

/** Verify phone with code */
export async function verifyPhoneCode(
  code: string,
  csrfToken: string | null
): Promise<boolean> {
  if (code.length !== 6) {
    toast.error('Please enter a 6-digit code');
    return false;
  }

  try {
    toast.loading('Verifying code...', { id: 'verify-code' });

    const verifyResponse = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'verify',
        code,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      toast.error(verifyData.error || 'Invalid verification code', {
        id: 'verify-code',
      });
      return false;
    }

    toast.success('Phone number verified successfully!', { id: 'verify-code' });
    return true;
  } catch (error) {
    logger.error('Verification error:', error);
    toast.error('Verification failed. Please try again.', {
      id: 'verify-code',
    });
    return false;
  }
}

/** Resend verification code */
export async function resendVerificationCode(
  phoneNumber: string,
  csrfToken: string | null
): Promise<boolean> {
  try {
    toast.loading('Resending code...', { id: 'resend' });

    const resendResponse = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'send',
        phoneNumber,
      }),
    });

    if (resendResponse.ok) {
      toast.success('New verification code sent!', { id: 'resend' });
      return true;
    } else {
      toast.error('Failed to resend code. Please try again.', { id: 'resend' });
      return false;
    }
  } catch {
    toast.error('Failed to resend code', { id: 'resend' });
    return false;
  }
}

/** Toggle privacy setting */
export async function togglePrivacySetting(
  key: 'profileVisible' | 'shareActivityData',
  currentSettings: { profileVisible: boolean; shareActivityData: boolean },
  csrfToken: string | null
): Promise<{ profileVisible: boolean; shareActivityData: boolean } | null> {
  const updated = { ...currentSettings, [key]: !currentSettings[key] };
  try {
    const res = await fetch('/api/users/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify({ privacy: updated }),
    });
    if (!res.ok) {
      toast.error('Failed to save privacy setting');
      return null;
    }
    return updated;
  } catch {
    toast.error('Failed to save privacy setting');
    return null;
  }
}

/** Fetch payment methods */
export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const res = await fetch('/api/payments/methods');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.paymentMethods || []).map((pm: Record<string, unknown>) => ({
      id: pm.id as string,
      brand: ((pm.card as Record<string, unknown>)?.brand as string) || 'card',
      last4: ((pm.card as Record<string, unknown>)?.last4 as string) || '****',
      expMonth:
        ((pm.card as Record<string, unknown>)?.exp_month as number) || 0,
      expYear: ((pm.card as Record<string, unknown>)?.exp_year as number) || 0,
      isDefault: (pm.isDefault as boolean) || false,
    }));
  } catch {
    return [];
  }
}

/** Fetch privacy settings */
export async function fetchPrivacySettings(): Promise<{
  profileVisible: boolean;
  shareActivityData: boolean;
} | null> {
  try {
    const res = await fetch('/api/users/settings');
    if (res.ok) {
      const json = await res.json();
      if (json.data?.privacy) {
        return json.data.privacy as {
          profileVisible: boolean;
          shareActivityData: boolean;
        };
      }
    }
  } catch {
    // defaults are fine
  }
  return null;
}
