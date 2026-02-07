import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';
import Logo from '../../../components/Logo';
import { Menu } from 'lucide-react';

interface TrackingHeaderProps {
  userProfileImageUrl?: string;
}

export function TrackingHeader({ userProfileImageUrl }: TrackingHeaderProps) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${theme.colors.border}`,
      padding: `0 ${theme.spacing[6]}`,
      backgroundColor: theme.colors.surface
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }}>
        <Logo width={24} height={24} />
        <h2 style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          margin: 0
        }}>
          Mintenance
        </h2>
      </div>

      <div style={{ display: 'none', gap: theme.spacing[8] }} className="md:flex">
        <Link href="/dashboard" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>Dashboard</Link>
        <Link href="/jobs" style={{ color: theme.colors.primary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold }}>My Jobs</Link>
        <Link href="/contractors" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>Find Contractors</Link>
        <Link href="/messages" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>Messages</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
        <Link href="/jobs/create" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', minWidth: '84px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', borderRadius: theme.borderRadius.lg, height: '40px', padding: `0 ${theme.spacing[4]}`,
            backgroundColor: theme.colors.primary, color: 'white', fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold, border: 'none'
          }}>Post a Job</button>
        </Link>
        <button style={{
          display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          borderRadius: theme.borderRadius.lg, height: '40px', backgroundColor: theme.colors.backgroundSecondary,
          color: theme.colors.textSecondary, gap: theme.spacing[2], fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.bold, minWidth: 0, padding: `0 ${theme.spacing[2]}`, border: 'none'
        }}>
          <Icon name="bell" size={20} color={theme.colors.textSecondary} />
        </button>
        <div style={{
          aspectRatio: '1', height: '40px', borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.primary,
          backgroundImage: userProfileImageUrl ? `url(${userProfileImageUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }} />
      </div>

      <Button variant="ghost" size="sm" className="md:hidden" style={{ display: 'none', width: '40px', height: '40px' }}>
        <Menu className="h-6 w-6" />
      </Button>
    </header>
  );
}
