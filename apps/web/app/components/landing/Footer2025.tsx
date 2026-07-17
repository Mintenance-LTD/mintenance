'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
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

// lucide-react removed its brand icons (Facebook/Twitter/Instagram/
// Linkedin are gone as of v1.x), so these are inline simple-icons
// paths with the same `className` + currentColor contract the lucide
// components had.
type BrandIconProps = React.SVGProps<SVGSVGElement>;

function FacebookIcon(props: BrandIconProps) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' {...props}>
      <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
    </svg>
  );
}

function TwitterIcon(props: BrandIconProps) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' {...props}>
      <path d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' />
    </svg>
  );
}

function InstagramIcon(props: BrandIconProps) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' {...props}>
      <path d='M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z' />
    </svg>
  );
}

function LinkedinIcon(props: BrandIconProps) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' {...props}>
      <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z' />
    </svg>
  );
}

const socialLinks = [
  {
    name: 'Facebook',
    icon: FacebookIcon,
    href: 'https://facebook.com/mintenance',
  },
  {
    name: 'Twitter',
    icon: TwitterIcon,
    href: 'https://twitter.com/mintenance',
  },
  {
    name: 'Instagram',
    icon: InstagramIcon,
    href: 'https://www.instagram.com/mintenanceltd/',
  },
  {
    name: 'LinkedIn',
    icon: LinkedinIcon,
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
