import React from 'react';
import SettingsSection from './SettingsSection';
import SettingRow from './SettingRow';
import { NotificationSettings } from './notificationSettingsConfig';

interface SoundVibrationSectionProps {
  settings: NotificationSettings;
  onToggle: (key: keyof NotificationSettings) => void;
}

const SoundVibrationSection: React.FC<SoundVibrationSectionProps> = ({
  settings,
  onToggle,
}) => (
  <SettingsSection title='Sound & Vibration'>
    <SettingRow
      icon='volume-high'
      title='Sound'
      description='Play notification sounds'
      value={settings.soundEnabled}
      onToggle={() => onToggle('soundEnabled')}
    />
    <SettingRow
      icon='phone-portrait'
      title='Vibration'
      description='Vibrate for notifications'
      value={settings.vibrationEnabled}
      onToggle={() => onToggle('vibrationEnabled')}
    />
  </SettingsSection>
);

export default SoundVibrationSection;
