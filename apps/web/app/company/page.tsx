import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { theme } from '@/lib/theme';

export default function CompanyPage() {
  return (
    <HomeownerLayoutShell currentPath="/company">
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: theme.spacing.lg }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          margin: 0,
        }}>
          Company
        </h1>
        <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing[2] }}>
          Staff, field techs, and time tracking will appear here.
        </p>
      </div>
    </HomeownerLayoutShell>
  );
}


