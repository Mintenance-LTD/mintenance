'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';

interface NewsletterSignupProps {
  title?: string;
  description?: string;
  onSubmit?: (email: string) => Promise<void>;
}

export function NewsletterSignup({
  title = 'Stay Updated',
  description = 'Get the latest articles, tips, and insights delivered to your inbox.',
  onSubmit,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(email);
      } else {
        // Default behavior - just simulate success
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setIsSuccess(true);
      setEmail('');
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: theme.spacing[5] }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing[4],
          }}
        >
          <Mail className="h-6 w-6 text-white" />
        </div>
        <h3
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing[2],
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0,
            lineHeight: theme.typography.lineHeight.relaxed,
          }}
        >
          {description}
        </p>
      </div>

      {isSuccess ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully subscribed!
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
              errorText={error || undefined}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            fullWidth
            leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          >
            {isSubmitting ? 'Subscribing...' : 'Subscribe'}
          </Button>
        </form>
      )}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: theme.spacing[5],
          borderTop: `1px solid ${theme.colors.border}`,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textTertiary,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `
      }} />
    </div>
  );
}

