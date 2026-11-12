import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function WorkspaceStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className='pw-card pw-stat'>
      <span className='pw-icon'>
        <Icon size={24} aria-hidden='true' />
      </span>
      <div>
        {label}
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function WorkspaceBadge({
  children,
  tone = '',
}: {
  children: ReactNode;
  tone?: '' | 'neutral' | 'warn' | 'danger';
}) {
  return (
    <span className={`pw-badge${tone ? ` pw-badge-${tone}` : ''}`}>
      {children}
    </span>
  );
}
