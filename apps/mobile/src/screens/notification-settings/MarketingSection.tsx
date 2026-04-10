import React from 'react';
import SettingsSection from './SettingsSection';
import SettingRow from './SettingRow';
import { NotificationSettings } from './notificationSettingsConfig';

interface MarketingSectionProps {
  settings: NotificationSettings;
  onToggle: (key: keyof NotificationSettings) => void;
}

const MarketingSection: React.FC<MarketingSectionProps> = ({
  settings,
  onToggle,
}) => (
  <SettingsSection title='Marketing & Updates'>
    <SettingRow
      icon='megaphone'
      title='Promotional Emails'
      description='Special offers and promotional content'
      value={settings.promotionalEmails}
      onToggle={() => onToggle('promotionalEmails')}
    />
    <SettingRow
      icon='information-circle'
      title='Product Updates'
      description='Learn about new features and improvements'
      value={settings.productUpdates}
      onToggle={() => onToggle('productUpdates')}
    />
  </SettingsSection>
);

export default MarketingSection;
