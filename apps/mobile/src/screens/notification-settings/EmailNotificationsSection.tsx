import React from 'react';
import SettingsSection from './SettingsSection';
import SettingRow from './SettingRow';
import { NotificationSettings } from './notificationSettingsConfig';

interface EmailNotificationsSectionProps {
  settings: NotificationSettings;
  onToggle: (key: keyof NotificationSettings) => void;
}

const EmailNotificationsSection: React.FC<EmailNotificationsSectionProps> = ({
  settings,
  onToggle,
}) => (
  <SettingsSection title='Email Notifications'>
    <SettingRow
      icon='mail'
      title='Email Notifications'
      description='Receive important updates via email'
      value={settings.emailEnabled}
      onToggle={() => onToggle('emailEnabled')}
    />
    <SettingRow
      icon='calendar'
      title='Weekly Digest'
      description='Get a weekly summary of your activity and opportunities'
      value={settings.weeklyDigest}
      onToggle={() => onToggle('weeklyDigest')}
      disabled={!settings.emailEnabled}
    />
    <SettingRow
      icon='shield-checkmark'
      title='Security Alerts'
      description='Important security and account notifications'
      value={settings.securityAlerts}
      onToggle={() => onToggle('securityAlerts')}
      disabled={!settings.emailEnabled}
    />
  </SettingsSection>
);

export default EmailNotificationsSection;
