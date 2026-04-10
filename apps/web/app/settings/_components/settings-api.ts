import { logger } from '@mintenance/shared';
import toast from 'react-hot-toast';
import type { ProfileData, PasswordData, NotificationPrefs } from './types';

/** Save profile data to the server */
export async function saveProfile(
  profileData: ProfileData,
  csrfToken: string | null,
  refresh: () => void
): Promise<boolean> {
  try {
    const body: Record<string, string> = {};
    if (profileData.first_name?.trim())
      body.firstName = profileData.first_name.trim();
    if (profileData.last_name?.trim())
      body.lastName = profileData.last_name.trim();
    if (profileData.phone?.trim()) body.phone = profileData.phone.trim();
    if (profileData.bio?.trim()) body.bio = profileData.bio.trim();
    if (profileData.profile_image_url?.trim())
      body.profileImageUrl = profileData.profile_image_url.trim();
    if (profileData.address?.trim()) body.address = profileData.address.trim();
    if (profileData.city?.trim()) body.city = profileData.city.trim();
    if (profileData.postcode?.trim())
      body.postcode = profileData.postcode.trim();

    const response = await fetch('/api/user/update-profile', {
      method: 'POST',
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

/** Upload avatar image */
export async function uploadAvatar(
  file: File,
  csrfToken: string | null,
  refresh: () => void
): Promise<string | null> {
  const formData = new FormData();
  formData.append('profileImage', file);

  try {
    const response = await fetch('/api/user/update-profile', {
      method: 'POST',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.profileImageUrl) {
        toast.success('Profile picture updated');
        refresh();
        return data.profileImageUrl as string;
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

/** Save notification preferences */
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
    } else {
      toast.error('Failed to delete account');
      return false;
    }
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
