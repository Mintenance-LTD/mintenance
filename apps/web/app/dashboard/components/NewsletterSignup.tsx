'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

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
          <Icon name="mail" size={24} color={theme.colors.white} />
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
        <div
          style={{
            padding: theme.spacing[4],
            backgroundColor: '#D1FAE5',
            borderRadius: theme.borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            color: '#065F46',
          }}
        >
          <Icon name="checkCircle" size={20} color="#065F46" />
          <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
            Successfully subscribed!
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${error ? theme.colors.error : theme.colors.border}`,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.white,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = error ? theme.colors.error : theme.colors.border;
              }}
            />
            {error && (
              <p
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.error,
                  margin: `${theme.spacing[1]} 0 0 0`,
                }}
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              border: 'none',
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing[2],
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  className="spinner"
                  style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${theme.colors.white}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                <span>Subscribing...</span>
              </>
            ) : (
              <>
                <span>Subscribe</span>
                <Icon name="arrowRight" size={16} color={theme.colors.white} />
              </>
            )}
          </button>
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

