'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlatformSetting } from '@/lib/services/admin/PlatformSettingsService';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], justifyContent: 'space-between' }}>
            <Label htmlFor={key} className="text-sm font-medium text-slate-700 cursor-pointer">
              {localValue === true || localValue === 'true' ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id={key}
              checked={localValue === true || localValue === 'true'}
              onCheckedChange={(checked: boolean) => {
                handleChange(checked);
                handleSave(setting, checked);
              }}
              className="data-[state=checked]:bg-[#4A67FF]"
            />
          </div>
        );

      case 'number':
        return (
          <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'center', maxWidth: '400px' }}>
            <Input
              type="number"
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              style={{ flex: 1 }}
              className="rounded-lg border-slate-200 focus:border-[#4A67FF] focus:ring-[#4A67FF]"
            />
            <Button
              variant="primary"
              onClick={handleSaveClick}
              disabled={saving[key]}
              style={{ minWidth: '100px' }}
              className="rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]"
            >
              {saving[key] ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="loader" size={16} className="animate-spin" /> Saving...
                </span>
              ) : 'Save'}
            </Button>
            {saving[key] && (
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Saving...
              </span>
            )}
          </div>
        );

      case 'json':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3], maxWidth: '600px' }}>
            <Textarea
              value={typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2)}
              onChange={(e) => handleChange(e.target.value)}
              rows={6}
              className="font-mono text-sm rounded-lg border-slate-200 focus:border-[#4A67FF] focus:ring-[#4A67FF]"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
              <Button
                variant="primary"
                onClick={handleSaveClick}
                disabled={saving[key]}
                style={{ minWidth: '100px' }}
                className="rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]"
              >
                {saving[key] ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="loader" size={16} className="animate-spin" /> Saving...
                  </span>
                ) : 'Save'}
              </Button>
              {saving[key] && (
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Saving...
                </span>
              )}
            </div>
          </div>
        );

      default: // string
        return (
          <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'center', maxWidth: '600px' }}>
            <Input
              type="text"
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              style={{ flex: 1 }}
              className="rounded-lg border-slate-200 focus:border-[#4A67FF] focus:ring-[#4A67FF]"
            />
            <Button
              variant="primary"
              onClick={handleSaveClick}
              disabled={saving[key]}
              style={{ minWidth: '100px' }}
              className="rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]"
            >
              {saving[key] ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="loader" size={16} className="animate-spin" /> Saving...
                </span>
              ) : 'Save'}
            </Button>
            {saving[key] && (
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Saving...
              </span>
            )}
          </div>
        );
    }
  };

  const renderCategory = (title: string, categorySettings: PlatformSetting[], icon: string) => {
    if (categorySettings.length === 0) return null;

    const getIconColor = (iconName: string) => {
      const iconColors: Record<string, string> = {
        settings: '#4A67FF',
        mail: '#4CC38A',
        shield: '#F59E0B',
        zap: '#E74C3C',
        bell: '#3B82F6',
      };
      return iconColors[iconName] || '#4A67FF';
    };

    return (
      <Card style={{ 
        padding: theme.spacing[6], 
        marginBottom: theme.spacing[6],
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: theme.spacing[3], 
          marginBottom: theme.spacing[6],
          paddingBottom: theme.spacing[4],
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${getIconColor(icon)}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name={icon} size={24} color={getIconColor(icon)} />
          </div>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              marginBottom: '4px',
            }}>
              {title}
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#64748B',
              margin: 0,
            }}>
              {categorySettings.length} setting{categorySettings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: categorySettings.length > 3 ? 'repeat(2, 1fr)' : '1fr',
          gap: theme.spacing[5],
        }}>
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
              className="hover:shadow-sm"
            >
              <div style={{ marginBottom: theme.spacing[4] }}>
                <label style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0F172A',
                  display: 'block',
                  marginBottom: theme.spacing[2],
                }}>
                  {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                {setting.description && (
                  <p style={{
                    fontSize: '13px',
                    color: '#64748B',
                    margin: 0,
                    lineHeight: '1.5',
                  }}>
                    {setting.description}
                  </p>
                )}
              </div>

              {renderSettingInput(setting)}

              {errors[setting.setting_key] && (
                <Alert variant="destructive" className="mt-3 rounded-lg">
                  <AlertDescription className="text-sm">
                    {errors[setting.setting_key]}
                  </AlertDescription>
                </Alert>
              )}

              {success[setting.setting_key] && (
                <div style={{
                  marginTop: theme.spacing[3],
                  padding: theme.spacing[2],
                  backgroundColor: '#D1FAE5',
                  borderRadius: '8px',
                  border: '1px solid #86EFAC',
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#065F46',
                    margin: 0,
                    fontWeight: 500,
                  }}>
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

  const totalSettings = Object.values(settings).reduce((sum, cat) => sum + cat.length, 0);

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
    }}>
      <AdminPageHeader
        title="Platform Settings"
        subtitle="Configure platform-wide settings and preferences"
        quickStats={[
          {
            label: 'total settings',
            value: totalSettings,
            icon: 'settings',
            color: theme.colors.primary,
          },
        ]}
      />

      {renderCategory('General Settings', settings.general, 'settings')}
      {renderCategory('Email Settings', settings.email, 'mail')}
      {renderCategory('Security Settings', settings.security, 'shield')}
      {renderCategory('Feature Settings', settings.features, 'zap')}
      {renderCategory('Notification Settings', settings.notifications, 'bell')}
    </div>
  );
}

