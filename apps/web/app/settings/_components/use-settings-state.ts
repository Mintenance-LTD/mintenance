import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import toast from 'react-hot-toast';
import type {
  SectionKey,
  ProfileData,
  PasswordData,
  NotificationPrefs,
  UserWithLocation,
} from './types';

export function useSettingsState() {
  const router = useRouter();
  const { user, loading: loadingUser, refresh } = useCurrentUser();
  const { csrfToken } = useCSRF();

  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationPhoneNumber, setVerificationPhoneNumber] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    profile_image_url: '',
    address: '',
    city: '',
    postcode: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailJobs: true,
    emailMessages: true,
    emailPayments: true,
    emailMarketing: false,
    smsJobs: false,
    smsMessages: true,
    smsPayments: true,
    smsMarketing: false,
    pushJobs: true,
    pushMessages: true,
    pushPayments: true,
    pushMarketing: false,
  });

  // Check URL params to open a specific tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'verification' || tab === 'account') {
      setActiveSection('account');
    } else if (tab === 'automation') {
      setActiveSection('automation');
    }
  }, []);

  // Load user data into form
  useEffect(() => {
    if (user) {
      const userLoc = user as typeof user & UserWithLocation;
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        profile_image_url: user.profile_image_url || '',
        address: userLoc.address || '',
        city: userLoc.city || '',
        postcode: userLoc.postcode || '',
      });
    }
  }, [user]);

  // Fetch payment methods when user is available
  useEffect(() => {
    if (!user) return;
    setLoadingPayments(true);
    fetch('/api/payments/methods')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        const methods = (data.paymentMethods || []).map((pm: Record<string, unknown>) => ({
          id: pm.id as string,
          brand: (pm.card as Record<string, unknown>)?.brand as string || 'card',
          last4: (pm.card as Record<string, unknown>)?.last4 as string || '****',
          expMonth: (pm.card as Record<string, unknown>)?.exp_month as number || 0,
          expYear: (pm.card as Record<string, unknown>)?.exp_year as number || 0,
          isDefault: pm.isDefault as boolean || false,
        }));
        setPaymentMethods(methods);
      })
      .catch(() => {
        setPaymentMethods([]);
      })
      .finally(() => setLoadingPayments(false));
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/settings');
    }
  }, [loadingUser, user, router]);

  const handleResetProfile = (): void => {
    if (user) {
      const userLoc = user as typeof user & UserWithLocation;
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        profile_image_url: user.profile_image_url || '',
        address: userLoc.address || '',
        city: userLoc.city || '',
        postcode: userLoc.postcode || '',
      });
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        refresh();
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profileImageUrl) {
          setProfileData(prev => ({ ...prev, profile_image_url: data.profileImageUrl }));
          toast.success('Profile picture updated');
          refresh();
        }
      } else {
        toast.error('Failed to upload image');
      }
    } catch {
      toast.error('Error uploading image');
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      // Implement password change API call
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Error changing password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async (): Promise<void> => {
    setIsSaving(true);
    try {
      // Implement notification preferences API call
      toast.success('Notification preferences updated');
    } catch {
      toast.error('Error updating notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/user/export-data', { method: 'POST' });
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
      } else {
        toast.error('Failed to export data');
      }
    } catch {
      toast.error('Error exporting data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    try {
      const response = await fetch('/api/user/delete-account', { method: 'DELETE' });
      if (response.ok) {
        toast.success('Account deleted successfully');
        window.location.href = '/login?deleted=true';
      } else {
        toast.error('Failed to delete account');
      }
    } catch {
      toast.error('Error deleting account');
    }
  };

  const handleSendVerificationCode = async (): Promise<void> => {
    setIsSaving(true);
    try {
      if (!csrfToken) {
        toast.error('Security token not available. Please refresh the page.');
        return;
      }

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
          phoneNumber: user?.phone,
        }),
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        toast.error(sendData.error || 'Failed to send verification code', { id: 'verify' });
        setIsSaving(false);
        return;
      }

      toast.success('Verification code sent to your phone!', { id: 'verify' });
      setVerificationPhoneNumber(user?.phone || '');
      setShowVerificationDialog(true);
      setVerificationCode('');
    } catch (error) {
      logger.error('Verification error:', error);
      toast.error('Failed to send verification code. Please try again.', { id: 'verify' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyCode = async (): Promise<void> => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsSaving(true);
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
          code: verificationCode,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        toast.error(verifyData.error || 'Invalid verification code', { id: 'verify-code' });
        setVerificationCode('');
        return;
      }

      toast.success('Phone number verified successfully!', { id: 'verify-code' });
      setShowVerificationDialog(false);
      setVerificationCode('');
      refresh();
    } catch (error) {
      logger.error('Verification error:', error);
      toast.error('Verification failed. Please try again.', { id: 'verify-code' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setIsSaving(true);
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
          phoneNumber: verificationPhoneNumber,
        }),
      });

      if (resendResponse.ok) {
        toast.success('New verification code sent!', { id: 'resend' });
        setVerificationCode('');
      } else {
        toast.error('Failed to resend code. Please try again.', { id: 'resend' });
      }
    } catch {
      toast.error('Failed to resend code', { id: 'resend' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelVerification = (): void => {
    setShowVerificationDialog(false);
    setVerificationCode('');
    toast.error('Verification cancelled');
  };

  const handleAddPhoneNumber = (): void => {
    setActiveSection('profile');
    toast('Please add your phone number in the Profile section first', { icon: 'ℹ️' });
  };

  const handleUpdatePhoneNumber = (): void => {
    setActiveSection('profile');
  };

  return {
    router,
    user,
    loadingUser,
    activeSection,
    setActiveSection,
    isExporting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isSaving,
    verificationCode,
    setVerificationCode,
    showVerificationDialog,
    verificationPhoneNumber,
    profileData,
    setProfileData,
    passwordData,
    setPasswordData,
    notificationPrefs,
    setNotificationPrefs,
    twoFactorEnabled,
    setTwoFactorEnabled,
    paymentMethods,
    loadingPayments,
    csrfToken,
    handleSaveProfile,
    handleResetProfile,
    handleAvatarUpload,
    handleChangePassword,
    handleSaveNotifications,
    handleExportData,
    handleDeleteAccount,
    handleSendVerificationCode,
    handleVerifyCode,
    handleResendCode,
    handleCancelVerification,
    handleAddPhoneNumber,
    handleUpdatePhoneNumber,
  };
}
