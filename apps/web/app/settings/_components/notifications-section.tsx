import type { Dispatch, SetStateAction } from 'react';
import type { NotificationPrefs } from './types';

interface NotificationItem {
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
}

const EMAIL_ITEMS: NotificationItem[] = [
  { key: 'emailJobs', label: 'Jobs', desc: 'Get notified about new job opportunities' },
  { key: 'emailMessages', label: 'Messages', desc: 'New messages from homeowners or contractors' },
  { key: 'emailPayments', label: 'Payments', desc: 'Payment confirmations and invoices' },
  { key: 'emailMarketing', label: 'Marketing', desc: 'Tips, offers, and product updates' },
];

const SMS_ITEMS: NotificationItem[] = [
  { key: 'smsJobs', label: 'Jobs', desc: 'Get notified about new job opportunities' },
  { key: 'smsMessages', label: 'Messages', desc: 'New messages from homeowners or contractors' },
  { key: 'smsPayments', label: 'Payments', desc: 'Payment confirmations and invoices' },
  { key: 'smsMarketing', label: 'Marketing', desc: 'Tips, offers, and product updates' },
];

const PUSH_ITEMS: NotificationItem[] = [
  { key: 'pushJobs', label: 'Jobs', desc: 'Get notified about new job opportunities' },
  { key: 'pushMessages', label: 'Messages', desc: 'New messages from homeowners or contractors' },
  { key: 'pushPayments', label: 'Payments', desc: 'Payment confirmations and invoices' },
  { key: 'pushMarketing', label: 'Marketing', desc: 'Tips, offers, and product updates' },
];

interface NotificationsSectionProps {
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: Dispatch<SetStateAction<NotificationPrefs>>;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

function NotificationToggleGroup({
  title,
  items,
  prefs,
  onToggle,
}: {
  title: string;
  items: NotificationItem[];
  prefs: NotificationPrefs;
  onToggle: (key: keyof NotificationPrefs, checked: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) => onToggle(item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationsSection({
  notificationPrefs,
  setNotificationPrefs,
  isSaving,
  onSave,
}: NotificationsSectionProps) {
  const handleToggle = (key: keyof NotificationPrefs, checked: boolean): void => {
    setNotificationPrefs(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
      <p className="text-gray-600 mb-6">Manage how you receive notifications</p>

      <NotificationToggleGroup
        title="Email notifications"
        items={EMAIL_ITEMS}
        prefs={notificationPrefs}
        onToggle={handleToggle}
      />

      <NotificationToggleGroup
        title="SMS notifications"
        items={SMS_ITEMS}
        prefs={notificationPrefs}
        onToggle={handleToggle}
      />

      <NotificationToggleGroup
        title="Push notifications"
        items={PUSH_ITEMS}
        prefs={notificationPrefs}
        onToggle={handleToggle}
      />

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
        <button className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
