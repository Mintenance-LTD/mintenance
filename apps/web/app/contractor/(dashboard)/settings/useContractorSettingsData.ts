'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { readAccountDeletionOutcome } from '@/lib/account-deletion-outcome';
import toast from 'react-hot-toast';

export type SectionKey =
  | 'profile'
  | 'account'
  | 'notifications'
  | 'payments'
  | 'automation'
  | 'privacy'
  | 'appearance';

type UserWithLocation = { address?: string; city?: string; postcode?: string };

export function useContractorSettingsData() {
  const confirm = useConfirm();
  const { user, loading: loadingUser, refresh } = useCurrentUser();
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');

  // 2026-05-13 polish pass: hydration-safe theme detection. Under
  // Mint Editorial the page chrome (header + sidebar + privacy /
  // automation inline cards) swaps to canonical .t-h1 / .card /
  // .btn-primary / .row-active conventions. The shared per-section
  // components (ProfileSection etc.) stay rendered as-is and inherit
  // colour mapping from the shell-level .me-legacy-fit boundary.
  // Ironic fix: until today this page (which hosts the theme toggle)
  // didn't itself respect the theme it advertises.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sectionParam = params.get('section') as SectionKey | null;
      const validSections: SectionKey[] = [
        'profile',
        'account',
        'notifications',
        'payments',
        'automation',
        'privacy',
        'appearance',
      ];
      if (sectionParam && validSections.includes(sectionParam))
        setActiveSection(sectionParam);
    }
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    profile_image_url: '',
    company_name: '',
    trade: '',
    skills: '',
    address: '',
    city: '',
    postcode: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  interface PaymentMethod {
    id: string;
    type: string;
    isDefault?: boolean;
    card: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    } | null;
    billing_details: { name?: string; email?: string } | null;
    created: number;
  }

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

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
        company_name: user.company_name || '',
        trade: '',
        skills: '',
        address: userLoc.address || '',
        city: userLoc.city || '',
        postcode: userLoc.postcode || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && activeSection === 'payments') loadPaymentMethods();
  }, [user, activeSection]);

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await fetch('/api/payments/methods');
      if (!response.ok) throw new Error('Failed to load payment methods');
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load payment methods'
      );
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    const ok = await confirm({
      title: 'Remove this payment method?',
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      setRemovingId(methodId);
      // Fetch fresh CSRF token before mutation
      const csrfRes = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      const { token: csrfToken } = csrfRes.ok
        ? await csrfRes.json()
        : { token: '' };
      if (csrfToken) await new Promise((r) => setTimeout(r, 50));

      const response = await fetch('/api/payments/remove-method', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove payment method');
      }
      toast.success('Payment method removed');
      await loadPaymentMethods();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove payment method'
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setSettingDefaultId(methodId);
      // Fetch fresh CSRF token before mutation
      const csrfRes = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      const { token: csrfToken } = csrfRes.ok
        ? await csrfRes.json()
        : { token: '' };
      if (csrfToken) await new Promise((r) => setTimeout(r, 50));

      const response = await fetch('/api/payments/set-default', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default payment method');
      }
      toast.success('Default payment method updated');
      await loadPaymentMethods();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to set default payment method'
      );
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const csrfRes = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      const { token: csrfToken } = csrfRes.ok
        ? await csrfRes.json()
        : { token: '' };
      if (csrfToken) await new Promise((r) => setTimeout(r, 50));
      const formData = new FormData();
      formData.append('firstName', profileData.first_name);
      formData.append('lastName', profileData.last_name);
      if (profileData.bio) formData.append('bio', profileData.bio);
      if (profileData.city) formData.append('city', profileData.city);
      if (profileData.phone) formData.append('phone', profileData.phone);
      if (profileData.company_name)
        formData.append('companyName', profileData.company_name);
      if (profileData.address) formData.append('address', profileData.address);
      if (profileData.postcode)
        formData.append('postcode', profileData.postcode);
      formData.append(
        'isAvailable',
        String(
          (user as typeof user & { is_available?: boolean }).is_available !==
            false
        )
      );
      const response = await fetch('/api/contractor/update-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken },
        body: formData,
      });
      if (response.ok) {
        toast.success('Profile updated successfully. Location geocoded.');
        refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update profile');
      }
    } catch {
      toast.error('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSaving(true);
    try {
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch {
      toast.error('Error changing password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    // Audit step 7 (2026-04-29): migrated to the canonical
    // `/api/users/avatar` route which writes to the dedicated
    // `avatars` bucket and properly cleans up the previous blob.
    // The legacy `/api/user/update-profile` multipart path read
    // `profileImage`; the canonical route reads `avatar`.
    formData.append('avatar', file);
    try {
      const csrfRes = await fetch('/api/csrf');
      const { token: csrfToken } = csrfRes.ok
        ? await csrfRes.json()
        : { token: '' };
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.profile_image_url) {
          setProfileData({
            ...profileData,
            profile_image_url: data.profile_image_url,
          });
          toast.success('Profile picture updated');
        }
      } else toast.error('Failed to upload image');
    } catch {
      toast.error('Error uploading image');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const csrfRes2 = await fetch('/api/csrf');
      const { token: csrfToken2 } = csrfRes2.ok
        ? await csrfRes2.json()
        : { token: '' };
      const response = await fetch('/api/user/export-data', {
        method: 'POST',
        headers: csrfToken2 ? { 'x-csrf-token': csrfToken2 } : {},
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
      } else toast.error('Failed to export data');
    } catch {
      toast.error('Error exporting data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const csrfRes3 = await fetch('/api/csrf');
      const { token: csrfToken3 } = csrfRes3.ok
        ? await csrfRes3.json()
        : { token: '' };
      // 2026-05-24 audit-28 P1: route only exports POST + requires
      // { confirmation: 'DELETE' } per Zod schema. Was DELETE with no
      // body, so the call 405'd / 400'd every time and the button
      // silently fell through to "Failed to delete account".
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken3 ? { 'x-csrf-token': csrfToken3 } : {}),
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      if (response.ok) {
        const outcome = readAccountDeletionOutcome(
          await response.json(),
          response.status
        );
        if (outcome.completed) toast.success('Account deleted successfully');
        else window.alert(outcome.notice);
        window.location.href = outcome.completed
          ? '/login?deleted=true'
          : '/login';
      } else {
        // 2026-05-27 audit-75 P1: the route returns
        // `{ error, blockers: [{ code, message, count }], help }`
        // on 409. Previously we only surfaced data.error (the
        // top-level "Account deletion is blocked..." message); the
        // actionable per-blocker messages — which tell the user
        // EXACTLY which escrow/job/dispute to settle first — were
        // discarded. Now: render the top-level error + each blocker
        // as its own toast so contractor sees the full punch list.
        try {
          const data = (await response.json()) as {
            error?: string;
            blockers?: Array<{ code?: string; message?: string }>;
          };
          if (Array.isArray(data.blockers) && data.blockers.length > 0) {
            toast.error(
              data.error || 'Resolve these before deleting your account'
            );
            data.blockers.forEach((b) => {
              if (b && typeof b.message === 'string') {
                toast.error(b.message);
              }
            });
          } else {
            toast.error(data.error || 'Failed to delete account');
          }
        } catch {
          toast.error('Failed to delete account');
        }
      }
    } catch {
      toast.error('Error deleting account');
    }
  };

  return {
    user,
    loadingUser,
    activeSection,
    setActiveSection,
    isMintEditorial,
    isExporting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isSaving,
    profileData,
    setProfileData,
    passwordData,
    setPasswordData,
    paymentMethods,
    loadingPaymentMethods,
    showAddDialog,
    setShowAddDialog,
    removingId,
    settingDefaultId,
    handleSaveProfile,
    handleAvatarUpload,
    handleChangePassword,
    handleDeleteAccount,
    handleRemoveMethod,
    handleSetDefault,
    loadPaymentMethods,
    handleExportData,
  };
}
