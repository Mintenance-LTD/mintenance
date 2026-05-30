'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Appearance settings section — Direction A · Mint Editorial. Renders
 * on the `--me-*` tokens. The swatch arrays below intentionally carry
 * raw hex — they are literal colour previews of each theme palette.
 */

type Theme = 'default' | 'mint-editorial';

function readThemeCookie(): Theme {
  // Mint Editorial is the platform default — only an explicit `default`
  // cookie value opts a user out. A missing cookie therefore resolves to
  // Mint Editorial, matching what the middleware injects.
  if (typeof document === 'undefined') return 'mint-editorial';
  const match = document.cookie.match(/(?:^|;\s*)mintenance-theme=([^;]+)/);
  return match?.[1] === 'default' ? 'default' : 'mint-editorial';
}

const OPTIONS: Array<{
  value: Theme;
  title: string;
  description: string;
  swatches: string[];
}> = [
  {
    value: 'mint-editorial',
    title: 'Mint Editorial (default)',
    description:
      'The current Mintenance look: teal-mint, warm near-black, Inter Black headlines, calm paper shadows.',
    swatches: ['#3F8C7A', '#1A2520', '#F3F7F4', '#C49A4D'],
  },
  {
    value: 'default',
    title: 'Classic — Navy & Emerald',
    description:
      'The previous Mintenance look: deep navy, emerald accents, Inter, cool slate neutrals.',
    swatches: ['#0F172A', '#10B981', '#F8FAFC', '#F59E0B'],
  },
];

interface AppearanceSectionProps {
  /** Where to redirect the user after the cookie is set. Defaults to
   *  the homeowner settings appearance section; contractors pass
   *  their own settings path so they don't land on the wrong page. */
  redirectPath?: string;
}

export function AppearanceSection({
  redirectPath = '/settings?section=appearance',
}: AppearanceSectionProps = {}) {
  const [active, setActive] = useState<Theme>('mint-editorial');

  // Read the cookie on the client only — the page is rendered as a
  // client component so we don't have access to `next/headers`.
  useEffect(() => {
    setActive(readThemeCookie());
  }, []);

  // Encode the redirect path so query strings inside it survive
  // being nested in our own ?redirect= query string.
  const encodedRedirect = encodeURIComponent(redirectPath);

  return (
    <div>
      <h1 className='t-h1' style={{ marginBottom: 4 }}>
        Appearance
      </h1>
      <p className='t-body' style={{ margin: '0 0 20px' }}>
        Choose how Mintenance looks in your browser. Mint Editorial is the
        current platform design. You can switch back to the classic Navy &amp;
        Emerald look if you prefer it.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {OPTIONS.map((opt) => {
          const isActive = active === opt.value;
          return (
            <a
              key={opt.value}
              href={`/api/theme?value=${opt.value}&redirect=${encodedRedirect}`}
              aria-current={isActive ? 'true' : undefined}
              style={{
                position: 'relative',
                display: 'block',
                borderRadius: 'var(--me-radius-card)',
                border: `2px solid ${
                  isActive ? 'var(--me-brand)' : 'var(--me-line)'
                }`,
                background: isActive
                  ? 'var(--me-brand-soft)'
                  : 'var(--me-surface)',
                padding: 20,
                textDecoration: 'none',
                color: 'var(--me-ink)',
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    background: 'var(--me-brand)',
                    color: 'var(--me-on-brand)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {opt.swatches.map((c) => (
                  <span
                    key={c}
                    aria-hidden='true'
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 9999,
                      background: c,
                      border: '1px solid var(--me-line)',
                    }}
                  />
                ))}
              </div>
              <h2 className='t-h4' style={{ marginBottom: 4 }}>
                {opt.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--me-ink-2)',
                }}
              >
                {opt.description}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--me-brand)',
                }}
              >
                {isActive ? 'Active' : 'Use this theme'}
              </span>
            </a>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 20,
          borderRadius: 'var(--me-radius-card)',
          background: 'var(--me-bg-2)',
          padding: 16,
          fontSize: 13,
          color: 'var(--me-ink-2)',
        }}
      >
        Your choice is stored as a 1-year cookie on this device. Switching
        themes reloads the page; signed-in state and unsaved form input are
        preserved.
      </div>
    </div>
  );
}
