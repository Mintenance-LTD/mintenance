import { fetchWithCsrf } from '@/lib/csrf-client';
import toast from 'react-hot-toast';
export async function changeAccountPassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<boolean> {
  if (data.newPassword !== data.confirmPassword) {
    toast.error('Passwords do not match');
    return false;
  }
  try {
    const body: {
      currentPassword: string;
      newPassword: string;
      mfaCode?: string;
      mfaMethod?: string;
    } = {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    };
    const send = () =>
      fetchWithCsrf('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    let response = await send();
    let result = await response.json();
    if (response.status === 403 && result.requiresMfa === true) {
      const code = window.prompt(
        'Enter your authenticator or backup code to change your password.'
      );
      if (!code) return false;
      body.mfaCode = code.trim();
      body.mfaMethod = /^\d{6}$/.test(body.mfaCode) ? 'totp' : 'backup_code';
      response = await send();
      result = await response.json();
    }
    if (!response.ok)
      throw new Error(
        typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Password change failed'
      );
    if (
      typeof result.message !== 'string' ||
      typeof result.requestId !== 'string' ||
      !(
        (response.status === 200 &&
          result.status === 'completed' &&
          result.success === true) ||
        (response.status === 202 &&
          result.status === 'pending' &&
          result.success === false)
      )
    )
      throw new Error('Password change response could not be confirmed');
    window.alert(result.message + '\nReference: ' + result.requestId);
    window.location.href = '/login';
    return result.success;
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Password change could not be confirmed'
    );
    return false;
  }
}
