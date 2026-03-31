'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlatformSetting } from '@/lib/services/admin/PlatformSettingsService';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { RenderSettingInput } from './RenderSettingInput';

interface SettingsClientProps {
  initialSettings: {
    general: PlatformSetting[];
    email: PlatformSetting[];
    security: PlatformSetting[];
    features: PlatformSetting[];
    notifications: PlatformSetting[];
  };
  adminId: string;
}

export function SettingsClient({
  initialSettings,
  adminId,
}: SettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});

  const handleSave = async (
    setting: PlatformSetting,
    newValue: string | number | boolean | null
  ) => {
    const key = setting.setting_key;
    setSaving((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setSuccess((prev) => ({ ...prev, [key]: false }));

    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({
          key: setting.setting_key,
          value: newValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save setting');
      }

      const updated = await response.json();

      // Update local state
      const updateSettingInCategory = (category: keyof typeof settings) => {
        setSettings((prev) => ({
          ...prev,
          [category]: prev[category].map((s) =>
            s.setting_key === key ? updated : s
          ),
        }));
      };

      if (setting.category === 'general') updateSettingInCategory('general');
      else if (setting.category === 'email') updateSettingInCategory('email');
      else if (setting.category === 'security')
        updateSettingInCategory('security');
      else if (setting.category === 'features')
        updateSettingInCategory('features');
      else if (setting.category === 'notifications')
        updateSettingInCategory('notifications');

      setSuccess((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, [key]: false })), 3000);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [key]:
          error instanceof Error ? error.message : 'Failed to save setting',
      }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const renderCategory = (
    title: string,
    categorySettings: PlatformSetting[],
    icon: string
  ) => {
    if (categorySettings.length === 0) return null;

    const getIconColor = (iconName: string) => {
      const iconColors: Record<string, string> = {
        settings: theme.colors.adminPrimary,
        mail: '#4CC38A',
        shield: '#F59E0B',
        zap: '#E74C3C',
        bell: '#3B82F6',
      };
      return iconColors[iconName] || theme.colors.adminPrimary;
    };

    return (
      <Card
        style={{
          padding: theme.spacing[6],
          marginBottom: theme.spacing[6],
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            marginBottom: theme.spacing[6],
            paddingBottom: theme.spacing[4],
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${getIconColor(icon)}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={24} color={getIconColor(icon)} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                marginBottom: '4px',
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: '#64748B',
                margin: 0,
              }}
            >
              {categorySettings.length} setting
              {categorySettings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              categorySettings.length > 3 ? 'repeat(2, 1fr)' : '1fr',
            gap: theme.spacing[5],
          }}
        >
          {categorySettings.map((setting) => (
            <div
              key={setting.setting_key}
              style={{
                padding: theme.spacing[5],
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                transition: 'all 0.2s',
              }}
              className='hover:shadow-sm'
            >
              <div style={{ marginBottom: theme.spacing[4] }}>
                <label
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    display: 'block',
                    marginBottom: theme.spacing[2],
                  }}
                >
                  {setting.setting_key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </label>
                {setting.description && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748B',
                      margin: 0,
                      lineHeight: '1.5',
                    }}
                  >
                    {setting.description}
                  </p>
                )}
              </div>

              <RenderSettingInput
                setting={setting}
                saving={saving}
                errors={errors}
                setErrors={setErrors}
                handleSave={handleSave}
              />

              {errors[setting.setting_key] && (
                <Alert variant='destructive' className='mt-3 rounded-lg'>
                  <AlertDescription className='text-sm'>
                    {errors[setting.setting_key]}
                  </AlertDescription>
                </Alert>
              )}

              {success[setting.setting_key] && (
                <div
                  style={{
                    marginTop: theme.spacing[3],
                    padding: theme.spacing[2],
                    backgroundColor: '#D1FAE5',
                    borderRadius: '8px',
                    border: '1px solid #86EFAC',
                  }}
                >
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#065F46',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    ✓ Setting saved successfully
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const totalSettings = Object.values(settings).reduce(
    (sum, cat) => sum + cat.length,
    0
  );

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='mb-2'>
        <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
          Platform Settings
        </h2>
        <p className='text-[#566166] text-lg mt-2'>
          Configure platform-wide settings and preferences. {totalSettings}{' '}
          settings available.
        </p>
      </div>

      {renderCategory('General Settings', settings.general, 'settings')}
      {renderCategory('Email Settings', settings.email, 'mail')}
      {renderCategory('Security Settings', settings.security, 'shield')}
      {renderCategory('Feature Settings', settings.features, 'zap')}
      {renderCategory('Notification Settings', settings.notifications, 'bell')}
    </div>
  );
}
