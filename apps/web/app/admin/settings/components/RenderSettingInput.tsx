'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PlatformSetting } from '@/lib/services/admin/PlatformSettingsService';

interface RenderSettingInputProps {
  setting: PlatformSetting;
  saving: Record<string, boolean>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSave: (
    setting: PlatformSetting,
    newValue: string | number | boolean | null
  ) => void;
}

export function RenderSettingInput({
  setting,
  saving,
  errors,
  setErrors,
  handleSave,
}: RenderSettingInputProps) {
  const key = setting.setting_key;
  const [localValue, setLocalValue] = useState(setting.setting_value);

  const handleChange = (value: string | number | boolean | null) => {
    setLocalValue(
      value ??
        (setting.setting_type === 'number'
          ? 0
          : setting.setting_type === 'boolean'
            ? false
            : '')
    );
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSaveClick = () => {
    let processedValue = localValue;

    // Type conversion
    if (setting.setting_type === 'number') {
      processedValue = Number(localValue);
      if (isNaN(processedValue)) {
        setErrors((prev) => ({ ...prev, [key]: 'Invalid number' }));
        return;
      }
    } else if (setting.setting_type === 'boolean') {
      processedValue = localValue === true || localValue === 'true';
    } else if (setting.setting_type === 'json') {
      try {
        const parsedValue =
          typeof localValue === 'string' ? JSON.parse(localValue) : localValue;
        // Convert back to string for handleSave
        processedValue = JSON.stringify(parsedValue);
      } catch {
        setErrors((prev) => ({ ...prev, [key]: 'Invalid JSON' }));
        return;
      }
    }

    handleSave(setting, processedValue as string | number | boolean | null);
  };

  switch (setting.setting_type) {
    case 'boolean':
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            justifyContent: 'space-between',
          }}
        >
          <Label
            htmlFor={key}
            className='text-sm font-medium text-slate-700 cursor-pointer'
          >
            {localValue === true || localValue === 'true'
              ? 'Enabled'
              : 'Disabled'}
          </Label>
          <Switch
            id={key}
            checked={localValue === true || localValue === 'true'}
            onCheckedChange={(checked: boolean) => {
              handleChange(checked);
              handleSave(setting, checked);
            }}
            className='data-[state=checked]:bg-[#4A67FF]'
          />
        </div>
      );

    case 'number':
      return (
        <div
          style={{
            display: 'flex',
            gap: theme.spacing[3],
            alignItems: 'center',
            maxWidth: '400px',
          }}
        >
          <Input
            type='number'
            value={
              typeof localValue === 'number'
                ? localValue.toString()
                : String(localValue || '')
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(e.target.value)
            }
            style={{ flex: 1 }}
            className='rounded-lg border-slate-200 focus:border-[#4A67FF] focus:ring-[#4A67FF]'
          />
          <Button
            variant='primary'
            onClick={handleSaveClick}
            disabled={saving[key]}
            style={{ minWidth: '100px' }}
            className='rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]'
          >
            {saving[key] ? (
              <span
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name='loader' size={16} className='animate-spin' />{' '}
                Saving...
              </span>
            ) : (
              'Save'
            )}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
            maxWidth: '600px',
          }}
        >
          <Textarea
            value={
              typeof localValue === 'string'
                ? localValue
                : JSON.stringify(localValue, null, 2)
            }
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleChange(e.target.value)
            }
            rows={6}
            className='font-mono text-sm rounded-lg border-slate-200 focus:border-[#4A67FF] focus:ring-[#4A67FF]'
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}
          >
            <Button
              variant='primary'
              onClick={handleSaveClick}
              disabled={saving[key]}
              style={{ minWidth: '100px' }}
              className='rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]'
            >
              {saving[key] ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon name='loader' size={16} className='animate-spin' />{' '}
                  Saving...
                </span>
              ) : (
                'Save'
              )}
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
        <div
          style={{
            display: 'flex',
            gap: theme.spacing[3],
            alignItems: 'center',
            maxWidth: '600px',
          }}
        >
          <Input
            type='text'
            value={
              typeof localValue === 'string'
                ? localValue
                : String(localValue || '')
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(e.target.value)
            }
            style={{ flex: 1 }}
            className='rounded-lg border-slate-200 focus:border-[#4A67FF] focus:ring-[#4A67FF]'
          />
          <Button
            variant='primary'
            onClick={handleSaveClick}
            disabled={saving[key]}
            style={{ minWidth: '100px' }}
            className='rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]'
          >
            {saving[key] ? (
              <span
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name='loader' size={16} className='animate-spin' />{' '}
                Saving...
              </span>
            ) : (
              'Save'
            )}
          </Button>
          {saving[key] && (
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Saving...
            </span>
          )}
        </div>
      );
  }
}
