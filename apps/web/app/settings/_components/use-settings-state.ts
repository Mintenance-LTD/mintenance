import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  saveProfile,
  uploadAvatar,
  changePassword,
  saveNotificationPreferences,
  exportUserData,
  deleteAccount,
  sendVerificationCode,
  verifyPhoneCode,
  resendVerificationCode,
  togglePrivacySetting,
  fetchPaymentMethods,
  fetchPrivacySettings,
  type PaymentMethod,
} from './settings-api';

const SECTION_KEYS: SectionKey[] = [
  'profile',
  'account',
  'notifications',
  'payments',
  'automation',
  'privacy',
  'appearance',
];

function parseSection(raw: string | null): SectionKey {
  if (raw && SECTION_KEYS.includes(raw as SectionKey)) {
    return raw as SectionKey;
  }
  return 'profile';
}

export function useSettingsState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: loadingUser, refresh } = useCurrentUser();
  const { csrfToken } = useCSRF();

  // Deep-link via `?section=appearance` (used by /api/theme's redirect
  // target so the Appearance page is the natural landing spot after
  // switching). Falls back to 'profile' for any unknown value.
  const [activeSection, setActiveSection] = useState<SectionKey>(() =>
    parseSection(searchParams?.get('section') ?? null)
  );

  useEffect(() => {
    const next = parseSection(searchParams?.get('section') ?? null);
    setActiveSection(next);
  }, [searchParams]);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationPhoneNumber, setVerificationPhoneNumber] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [privacySettings, setPrivacySettings] = useState<{
    profileVisible: boolean;
    shareActivityData: boolean;
  }>({ profileVisible: true, shareActivityData: false });

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

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    {
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
    }
  );

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
    fetchPaymentMethods()
      .then(setPaymentMethods)
      .finally(() => setLoadingPayments(false));
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/settings');
    }
  }, [loadingUser, user, router]);

  // Load privacy settings from profiles.settings JSONB
  useEffect(() => {
    if (!user) return;
    fetchPrivacySettings().then((result) => {
      if (result) setPrivacySettings(result);
    });
  }, [user]);

  const handleTogglePrivacy = async (
    key: 'profileVisible' | 'shareActivityData'
  ): Promise<void> => {
    const prev = { ...privacySettings };
    setPrivacySettings({ ...privacySettings, [key]: !privacySettings[key] }); // optimistic
    const result = await togglePrivacySetting(key, prev, csrfToken);
    if (!result) {
      setPrivacySettings(prev); // revert
    }
  };

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
      await saveProfile(profileData, csrfToken, refresh);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAvatar(file, csrfToken, refresh);
    if (url) {
      setProfileData((prev) => ({ ...prev, profile_image_url: url }));
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const success = await changePassword(passwordData, user?.email || '');
      if (success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await saveNotificationPreferences(notificationPrefs, csrfToken);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async (): Promise<void> => {
    setIsExporting(true);
    try {
      await exportUserData(csrfToken);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    await deleteAccount(csrfToken);
  };

  const handleSendVerificationCode = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const success = await sendVerificationCode(user?.phone || '', csrfToken);
      if (success) {
        setVerificationPhoneNumber(user?.phone || '');
        setShowVerificationDialog(true);
        setVerificationCode('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyCode = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const success = await verifyPhoneCode(verificationCode, csrfToken);
      if (success) {
        setShowVerificationDialog(false);
        setVerificationCode('');
        refresh();
      } else {
        setVerificationCode('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const success = await resendVerificationCode(
        verificationPhoneNumber,
        csrfToken
      );
      if (success) {
        setVerificationCode('');
      }
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
    toast('Please add your phone number in the Profile section first');
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
    privacySettings,
    handleTogglePrivacy,
  };
}
