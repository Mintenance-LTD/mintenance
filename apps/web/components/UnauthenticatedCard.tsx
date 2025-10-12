'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';

export default function UnauthenticatedCard() {
  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
    }}>
      <Card variant="elevated" style={{ textAlign: 'center', padding: theme.spacing[8] }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          Access Denied
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.lg,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing[6],
        }}>
          You must be logged in to view this page.
        </p>
        <Button variant="primary" onClick={handleLoginRedirect}>
          Go to Login
        </Button>
      </Card>
    </div>
  );
}
