import React from 'react';
import SettingsSection from './SettingsSection';
import SettingRow from './SettingRow';
import { NotificationSettings } from './notificationSettingsConfig';

interface PushNotificationsSectionProps {
  settings: NotificationSettings;
  onToggle: (key: keyof NotificationSettings) => void;
}

const PushNotificationsSection: React.FC<PushNotificationsSectionProps> = ({
  settings,
  onToggle,
}) => (
  <SettingsSection title='Push Notifications'>
    <SettingRow
      icon='notifications'
      title='Push Notifications'
      description='Allow Mintenance to send you push notifications'
      value={settings.pushEnabled}
      onToggle={() => onToggle('pushEnabled')}
    />
    <SettingRow
      icon='briefcase'
      title='New Jobs'
      description='Get notified when new jobs matching your skills are posted'
      value={settings.newJobs}
      onToggle={() => onToggle('newJobs')}
      disabled={!settings.pushEnabled}
    />
    <SettingRow
      icon='pricetag'
      title='New Bids'
      description='Receive notifications when contractors bid on your jobs'
      value={settings.newBids}
      onToggle={() => onToggle('newBids')}
      disabled={!settings.pushEnabled}
    />
    <SettingRow
      icon='chatbubble'
      title='New Messages'
      description='Get notified about new messages and conversations'
      value={settings.newMessages}
      onToggle={() => onToggle('newMessages')}
      disabled={!settings.pushEnabled}
    />
    <SettingRow
      icon='refresh'
      title='Job Updates'
      description='Notifications about job status changes and completions'
      value={settings.jobUpdates}
      onToggle={() => onToggle('jobUpdates')}
      disabled={!settings.pushEnabled}
    />
    <SettingRow
      icon='card'
      title='Payment Updates'
      description='Alerts about payments, invoices, and transactions'
      value={settings.paymentUpdates}
      onToggle={() => onToggle('paymentUpdates')}
      disabled={!settings.pushEnabled}
    />
  </SettingsSection>
);

export default PushNotificationsSection;
