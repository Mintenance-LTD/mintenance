import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PlatformSettingsService } from '@/lib/services/admin/PlatformSettingsService';
import { SettingsClient } from './components/SettingsClient';

export const metadata = {
  title: 'Platform Settings | Mintenance Admin',
  description: 'Manage platform configuration and settings',
};

export default async function AdminSettingsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch all settings grouped by category
  const [generalSettings, emailSettings, securitySettings, featureSettings, notificationSettings] = await Promise.all([
    PlatformSettingsService.getSettingsByCategory('general'),
    PlatformSettingsService.getSettingsByCategory('email'),
    PlatformSettingsService.getSettingsByCategory('security'),
    PlatformSettingsService.getSettingsByCategory('features'),
    PlatformSettingsService.getSettingsByCategory('notifications'),
  ]);

  const settings = {
    general: generalSettings,
    email: emailSettings,
    security: securitySettings,
    features: featureSettings,
    notifications: notificationSettings,
  };

  return <SettingsClient initialSettings={settings} adminId={user.id} />;
}

