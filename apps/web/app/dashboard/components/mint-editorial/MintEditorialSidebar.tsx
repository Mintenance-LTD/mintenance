import Link from 'next/link';
import {
  Home,
  Briefcase,
  MapPin,
  MessageSquare,
  WalletCards,
  Calendar,
  Bell,
  Settings,
  Leaf,
} from 'lucide-react';
import { initials } from './dashboardHelpers';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, active: true },
  { href: '/jobs', label: 'My jobs', icon: Briefcase },
  { href: '/properties', label: 'Properties', icon: MapPin },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/payments', label: 'Payments', icon: WalletCards },
  { href: '/scheduling', label: 'Schedule', icon: Calendar },
] as const;

export function MintEditorialSidebar({
  homeownerName,
}: {
  homeownerName: string;
}) {
  return (
    <aside className='me-sidebar'>
      <Link href='/dashboard' className='me-sidebar-brand'>
        <span className='leaf'>
          <Leaf size={14} strokeWidth={2} />
        </span>
        Mintenance
      </Link>
      <div className='me-sidebar-section'>Main</div>
      {NAV_ITEMS.map((n) => {
        const Icon = n.icon;
        return (
          <Link
            key={n.label}
            href={n.href}
            className={
              'me-nav-item ' + ('active' in n && n.active ? 'active' : '')
            }
          >
            <Icon className='ic' size={16} strokeWidth={1.75} />
            <span>{n.label}</span>
          </Link>
        );
      })}
      <div className='me-sidebar-section'>Account</div>
      <Link href='/notifications' className='me-nav-item'>
        <Bell className='ic' size={16} strokeWidth={1.75} />
        Notifications
      </Link>
      <Link href='/settings' className='me-nav-item'>
        <Settings className='ic' size={16} strokeWidth={1.75} />
        Settings
      </Link>
      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: 12,
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          className='avatar avatar-md'
          style={{
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
          }}
        >
          {initials(homeownerName)}
        </span>
        <div className='col' style={{ gap: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{homeownerName}</div>
          <div style={{ fontSize: 11, color: 'var(--me-ink-3)' }}>
            Homeowner
          </div>
        </div>
      </div>
    </aside>
  );
}
