'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlatformSetting } from '@/lib/services/admin/PlatformSettingsService';

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

export function SettingsClient({ initialSettings, adminId }: SettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});

  const handleSave = async (setting: PlatformSetting, newValue: any) => {
    const key = setting.setting_key;
    setSaving(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    setSuccess(prev => ({ ...prev, [key]: false }));

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        setSettings(prev => ({
          ...prev,
          [category]: prev[category].map(s => 
            s.setting_key === key ? updated : s
          ),
        }));
      };

      if (setting.category === 'general') updateSettingInCategory('general');
      else if (setting.category === 'email') updateSettingInCategory('email');
      else if (setting.category === 'security') updateSettingInCategory('security');
      else if (setting.category === 'features') updateSettingInCategory('features');
      else if (setting.category === 'notifications') updateSettingInCategory('notifications');

      setSuccess(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSuccess(prev => ({ ...prev, [key]: false })), 3000);
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Failed to save setting' 
      }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderSettingInput = (setting: PlatformSetting) => {
    const key = setting.setting_key;
    const [localValue, setLocalValue] = useState(setting.setting_value);

    const handleChange = (value: any) => {
      setLocalValue(value);
      setErrors(prev => ({ ...prev, [key]: '' }));
    };

    const handleSaveClick = () => {
      let processedValue = localValue;
      
      // Type conversion
      if (setting.setting_type === 'number') {
        processedValue = Number(localValue);
        if (isNaN(processedValue)) {
          setErrors(prev => ({ ...prev, [key]: 'Invalid number' }));
          return;
        }
      } else if (setting.setting_type === 'boolean') {
        processedValue = localValue === true || localValue === 'true';
      } else if (setting.setting_type === 'json') {
        try {
          processedValue = typeof localValue === 'string' ? JSON.parse(localValue) : localValue;
        } catch {
          setErrors(prev => ({ ...prev, [key]: 'Invalid JSON' }));
          return;
        }
      }

      handleSave(setting, processedValue);
    };

    switch (setting.setting_type) {
      case 'boolean':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={localValue === true || localValue === 'true'}
                onCheckedChange={(checked: boolean) => {
                  handleChange(checked);
                  handleSave(setting, checked);
                }}
              />
              <Label htmlFor={key} className="text-sm text-gray-600 cursor-pointer">
                {localValue === true || localValue === 'true' ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </div>
        );

      case 'number':
        return (
          <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
            <Input
              type="number"
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              style={{ maxWidth: '200px' }}
            />
            <Button
              variant="primary"
              onClick={handleSaveClick}
              disabled={saving[key]}
              style={{ minWidth: '80px' }}
            >
              {saving[key] ? 'Saving...' : 'Save'}
            </Button>
          </div>
        );

      case 'json':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <Textarea
              value={typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2)}
              onChange={(e) => handleChange(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <Button
              variant="primary"
              onClick={handleSaveClick}
              disabled={saving[key]}
              style={{ alignSelf: 'flex-start' }}
            >
              {saving[key] ? 'Saving...' : 'Save'}
            </Button>
          </div>
        );

      default: // string
        return (
          <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
            <Input
              type="text"
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              style={{ flex: 1, maxWidth: '400px' }}
            />
            <Button
              variant="primary"
              onClick={handleSaveClick}
              disabled={saving[key]}
              style={{ minWidth: '80px' }}
            >
              {saving[key] ? 'Saving...' : 'Save'}
            </Button>
          </div>
        );
    }
  };

  const renderCategory = (title: string, categorySettings: PlatformSetting[], icon: string) => {
    if (categorySettings.length === 0) return null;

    return (
      <Card style={{ padding: theme.spacing[6], marginBottom: theme.spacing[6] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] }}>
          <Icon name={icon} size={24} color={theme.colors.primary} />
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
          }}>
            {title}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {categorySettings.map((setting) => (
            <div
              key={setting.setting_key}
              style={{
                padding: theme.spacing[4],
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.md,
              }}
            >
              <div style={{ marginBottom: theme.spacing[2] }}>
                <label style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  display: 'block',
                  marginBottom: theme.spacing[1],
                }}>
                  {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                {setting.description && (
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    margin: 0,
                  }}>
                    {setting.description}
                  </p>
                )}
              </div>

              {renderSettingInput(setting)}

              {errors[setting.setting_key] && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription>
                    {errors[setting.setting_key]}
                  </AlertDescription>
                </Alert>
              )}

              {success[setting.setting_key] && (
                <Alert className="mt-2 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    ✓ Setting saved successfully
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: theme.spacing[8] }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Platform Settings
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
        }}>
          Configure platform-wide settings and preferences
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

