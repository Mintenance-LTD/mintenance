'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';

/**
 * Landing footer — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html footer (link columns +
 * newsletter + socials). Dark `--me-ink` panel; the newsletter
 * submit logic (CSRF + /api/newsletter) is preserved verbatim.
 */

const navigation = {
  homeowners: [
    { name: 'Post a job', href: '/jobs/create' },
    { name: 'How it works', href: '/how-it-works' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Mint AI', href: '/try-mint-ai' },
  ],
  contractors: [
    { name: 'Join as a pro', href: '/for-contractors' },
    { name: 'Browse jobs', href: '/contractor/discover' },
    { name: 'Resources', href: '/resources' },
    { name: 'Verification', href: '/verification' },
  ],
  company: [
    { name: 'About us', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ],
  support: [
    { name: 'Help centre', href: '/help' },
    { name: 'FAQs', href: '/faq' },
    { name: 'Safety', href: '/safety' },
    { name: 'Terms', href: '/terms' },
    { name: 'Privacy', href: '/privacy' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/mintenance' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/mintenance' },
  {
    name: 'Instagram',
    icon: Instagram,
    href: 'https://www.instagram.com/mintenanceltd/',
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    href: 'https://linkedin.com/company/mintenance',
  },
];

const COLUMNS: { heading: string; links: { name: string; href: string }[] }[] =
  [
    { heading: 'For homeowners', links: navigation.homeowners },
    { heading: 'For tradespeople', links: navigation.contractors },
    { heading: 'Company', links: navigation.company },
    { heading: 'Support', links: navigation.support },
  ];

const LIGHT = 'rgba(255,255,255,0.72)';
const LIGHT_DIM = 'rgba(255,255,255,0.5)';

function LeafMark() {
  return (
    <Image
      src='/assets/logo-mark.png'
      alt='Mintenance'
      width={22}
      height={22}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

export function Footer2025() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { getCsrfHeaders } = useCSRF();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      const errorMsg = 'Please enter a valid email address';
      setEmailError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setEmailError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders(),
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      toast.success('Successfully subscribed to newsletter!');
      setEmail('');
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Failed to subscribe. Please try again.';
      setEmailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer
      data-theme='mint-editorial'
      role='contentinfo'
      style={{
        background: 'var(--me-ink)',
        color: LIGHT,
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '64px 32px 40px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1.6fr) repeat(4, 1fr)',
            gap: 40,
          }}
          className='footer-grid'
        >
          {/* Brand + newsletter */}
          <div>
            <Link
              href='/'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
                textDecoration: 'none',
                color: 'var(--me-on-brand)',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--me-surface)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <LeafMark />
              </span>
              <span
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                }}
              >
                Mintenance
              </span>
            </Link>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 320,
                margin: '0 0 20px',
              }}
            >
              The modern way to hire local tradespeople — fair prices,
              escrow-protected payments, every job in one place.
            </p>

            <section aria-labelledby='newsletter-heading'>
              <h4
                id='newsletter-heading'
                style={{
                  color: 'var(--me-on-brand)',
                  fontSize: 13,
                  fontWeight: 600,
                  margin: '0 0 10px',
                }}
              >
                Get occasional updates
              </h4>
              <form
                onSubmit={handleNewsletterSubmit}
                style={{ display: 'flex', gap: 8, maxWidth: 360 }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor='newsletter-email' className='sr-only'>
                    Email address for newsletter subscription
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      className='w-4 h-4'
                      aria-hidden='true'
                      style={{
                        position: 'absolute',
                        left: 11,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: LIGHT_DIM,
                      }}
                    />
                    <input
                      type='email'
                      id='newsletter-email'
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder='Your email'
                      required
                      disabled={isSubmitting}
                      aria-invalid={!!emailError}
                      aria-describedby={
                        emailError ? 'newsletter-error' : undefined
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 34px',
                        borderRadius: 'var(--me-radius-input)',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: 'var(--me-on-brand)',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                  {emailError && (
                    <p
                      id='newsletter-error'
                      role='alert'
                      style={{
                        color: 'var(--me-warn-bg)',
                        fontSize: 12,
                        margin: '6px 0 0',
                      }}
                    >
                      {emailError}
                    </p>
                  )}
                </div>
                <button
                  type='submit'
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--me-radius-btn)',
                    background: 'var(--me-brand)',
                    color: 'var(--me-on-brand)',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 0,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSubmitting ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
            </section>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3
                style={{
                  color: 'var(--me-on-brand)',
                  fontSize: 13,
                  fontWeight: 600,
                  margin: '0 0 14px',
                }}
              >
                {col.heading}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {col.links.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      style={{
                        color: LIGHT,
                        fontSize: 14,
                        textDecoration: 'none',
                      }}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.10)',
            margin: '40px 0 24px',
          }}
        />

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <p style={{ fontSize: 13, color: LIGHT_DIM, margin: 0 }}>
            © {new Date().getFullYear()} Mintenance. All rights reserved.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label={`Follow us on ${social.name}`}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9999,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    color: LIGHT,
                  }}
                >
                  <Icon className='w-4 h-4' aria-hidden='true' />
                </a>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { name: 'Terms', href: '/terms' },
              { name: 'Privacy', href: '/privacy' },
              { name: 'Cookies', href: '/cookies' },
            ].map((l) => (
              <Link
                key={l.name}
                href={l.href}
                style={{
                  fontSize: 13,
                  color: LIGHT_DIM,
                  textDecoration: 'none',
                }}
              >
                {l.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive: stack the footer grid on narrow viewports. */}
      <style>{`
        @media (max-width: 899px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 559px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
