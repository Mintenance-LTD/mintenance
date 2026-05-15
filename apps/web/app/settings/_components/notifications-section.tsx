import type { Dispatch, SetStateAction } from 'react';
import type { NotificationPrefs } from './types';

/**
 * Notification settings section — Direction A · Mint Editorial.
 * Renders on the `--me-*` tokens + `.card` / `.btn` primitives.
 */

interface NotificationItem {
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
}

const EMAIL_ITEMS: NotificationItem[] = [
  {
    key: 'emailJobs',
    label: 'Jobs',
    desc: 'Get notified about new job opportunities',
  },
  {
    key: 'emailMessages',
    label: 'Messages',
    desc: 'New messages from homeowners or contractors',
  },
  {
    key: 'emailPayments',
    label: 'Payments',
    desc: 'Payment confirmations and invoices',
  },
  {
    key: 'emailMarketing',
    label: 'Marketing',
    desc: 'Tips, offers, and product updates',
  },
];

const SMS_ITEMS: NotificationItem[] = [
  {
    key: 'smsJobs',
    label: 'Jobs',
    desc: 'Get notified about new job opportunities',
  },
  {
    key: 'smsMessages',
    label: 'Messages',
    desc: 'New messages from homeowners or contractors',
  },
  {
    key: 'smsPayments',
    label: 'Payments',
    desc: 'Payment confirmations and invoices',
  },
  {
    key: 'smsMarketing',
    label: 'Marketing',
    desc: 'Tips, offers, and product updates',
  },
];

const PUSH_ITEMS: NotificationItem[] = [
  {
    key: 'pushJobs',
    label: 'Jobs',
    desc: 'Get notified about new job opportunities',
  },
  {
    key: 'pushMessages',
    label: 'Messages',
    desc: 'New messages from homeowners or contractors',
  },
  {
    key: 'pushPayments',
    label: 'Payments',
    desc: 'Payment confirmations and invoices',
  },
  {
    key: 'pushMarketing',
    label: 'Marketing',
    desc: 'Tips, offers, and product updates',
  },
];

interface NotificationsSectionProps {
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: Dispatch<SetStateAction<NotificationPrefs>>;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

/** Mint Editorial toggle switch — controlled, token-styled. */
function MeToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 9999,
        border: 0,
        flexShrink: 0,
        cursor: 'pointer',
        background: checked ? 'var(--me-brand)' : 'var(--me-line)',
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: 9999,
          background: 'var(--me-surface)',
          boxShadow: '0 1px 2px rgba(31,42,36,0.25)',
          transition: 'left 0.15s ease',
        }}
      />
    </button>
  );
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
    <div className='card' style={{ padding: 28 }}>
      <h2 className='t-h3' style={{ marginBottom: 8 }}>
        {title}
      </h2>
      <div>
        {items.map((item, i) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--me-line-2)',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--me-ink)',
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 13,
                  color: 'var(--me-ink-3)',
                }}
              >
                {item.desc}
              </p>
            </div>
            <MeToggle
              checked={prefs[item.key]}
              onChange={(checked) => onToggle(item.key, checked)}
              label={`${title} — ${item.label}`}
            />
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
  const handleToggle = (
    key: keyof NotificationPrefs,
    checked: boolean
  ): void => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className='t-h1' style={{ marginBottom: 4 }}>
          Notifications
        </h1>
        <p className='t-body' style={{ margin: 0 }}>
          Manage how you receive notifications
        </p>
      </div>

      <NotificationToggleGroup
        title='Email notifications'
        items={EMAIL_ITEMS}
        prefs={notificationPrefs}
        onToggle={handleToggle}
      />

      <NotificationToggleGroup
        title='SMS notifications'
        items={SMS_ITEMS}
        prefs={notificationPrefs}
        onToggle={handleToggle}
      />

      <NotificationToggleGroup
        title='Push notifications'
        items={PUSH_ITEMS}
        prefs={notificationPrefs}
        onToggle={handleToggle}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onSave}
          disabled={isSaving}
          className='btn btn-primary btn-lg'
          style={{ opacity: isSaving ? 0.6 : 1 }}
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
