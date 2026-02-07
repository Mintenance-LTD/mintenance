'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { theme } from '@/lib/theme';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '1rem',
    }}>
      <Card variant="elevated" style={{
        maxWidth: '600px',
        width: '100%',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '1rem',
          color: theme.colors.error || '#ef4444',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <AlertCircle size={64} strokeWidth={1.5} />
        </div>

        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: theme.colors.textPrimary || '#111827',
          marginBottom: '1rem',
        }}>
          Jobs Error
        </h1>

        <p style={{
          fontSize: '1rem',
          color: theme.colors.textSecondary || '#6b7280',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          We encountered an error loading your jobs. Please try again.
        </p>

        {isDevelopment && error && (
          <details style={{
            backgroundColor: '#f3f4f6',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            textAlign: 'left',
            border: '1px solid #e5e7eb',
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: theme.colors.textPrimary || '#111827',
            }}>
              Error Details
            </summary>
            <p style={{
              fontSize: '0.875rem',
              color: theme.colors.error || '#ef4444',
              marginTop: '0.5rem',
            }}>
              {error.message}
            </p>
          </details>
        )}

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Button variant="primary" onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
        </div>
      </Card>
    </div>
  );
}
