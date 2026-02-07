'use client';

interface NotificationPrefs {
  emailJobs: boolean;
  emailMessages: boolean;
  emailPayments: boolean;
  emailMarketing: boolean;
  smsJobs: boolean;
  smsMessages: boolean;
  smsPayments: boolean;
  smsMarketing: boolean;
  pushJobs: boolean;
  pushMessages: boolean;
  pushPayments: boolean;
  pushMarketing: boolean;
}

interface NotificationsSectionProps {
  notificationPrefs: NotificationPrefs;
  isSaving: boolean;
  onPrefsChange: (prefs: NotificationPrefs) => void;
  onSave: () => void;
}

export function NotificationsSection({
  notificationPrefs,
  isSaving,
  onPrefsChange,
  onSave,
}: NotificationsSectionProps) {
  return (
    <div className="space-y-6">
      {['Email', 'SMS', 'Push'].map((type) => (
        <div key={type} className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">{type} Notifications</h2>
          <div className="space-y-4">
            {[
              { key: `${type.toLowerCase()}Jobs`, label: 'Jobs', desc: 'Get notified about new job opportunities' },
              { key: `${type.toLowerCase()}Messages`, label: 'Messages', desc: 'New messages from clients' },
              { key: `${type.toLowerCase()}Payments`, label: 'Payments', desc: 'Payment confirmations and receipts' },
              { key: `${type.toLowerCase()}Marketing`, label: 'Marketing', desc: 'Tips, offers, and product updates' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs[item.key as keyof NotificationPrefs]}
                    onChange={(e) => onPrefsChange({ ...notificationPrefs, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={onSave} disabled={isSaving} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
