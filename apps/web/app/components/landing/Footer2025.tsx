'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';

const navigation = {
  homeowners: [
    { name: 'Post a Job', href: '/jobs/create' },
    { name: 'Find Contractors', href: '/contractors' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'AI Assessment', href: '/try-mint-ai' },
  ],
  contractors: [
    { name: 'Join as Pro', href: '/register?role=contractor' },
    { name: 'Browse Jobs', href: '/contractor/discover' },
    { name: 'Resources', href: '/resources' },
    { name: 'Subscription Plans', href: '/subscription-plans' },
    { name: 'Verification', href: '/verification' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
    { name: 'Press', href: '/press' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'FAQs', href: '/faq' },
    { name: 'Safety', href: '/safety' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/mintenance', ariaLabel: 'Follow us on Facebook' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/mintenance', ariaLabel: 'Follow us on Twitter' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/mintenanceltd/', ariaLabel: 'Follow us on Instagram' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/mintenance', ariaLabel: 'Follow us on LinkedIn' },
];

export function Footer2025() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { csrfToken, getCsrfHeaders } = useCSRF();

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
      const response = await fetch('/api/newsletter/subscribe', {
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
      const errorMsg = error instanceof Error ? error.message : 'Failed to subscribe. Please try again.';
      setEmailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300" role="contentinfo">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="col-span-2 lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white shrink-0">
                <Image
                  src="/assets/icon.png"
                  alt="Mintenance"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-white">Mintenance</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-sm">
              The UK's leading platform for connecting homeowners with verified tradespeople.
              Secure, fast, and reliable.
            </p>

            {/* Newsletter */}
            <section aria-labelledby="newsletter-heading">
              <h4 id="newsletter-heading" className="text-white font-semibold mb-3">Subscribe to our newsletter</h4>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address for newsletter subscription
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                    <input
                      type="email"
                      id="newsletter-email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="Your email"
                      required
                      disabled={isSubmitting}
                      aria-describedby="newsletter-description newsletter-error"
                      aria-invalid={!!emailError}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
                    />
                  </div>
                  <p id="newsletter-description" className="sr-only">
                    Get updates on new features, tips, and special offers
                  </p>
                  {emailError && (
                    <p id="newsletter-error" role="alert" className="text-red-400 text-sm mt-2">
                      {emailError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            </section>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 mt-6" role="region" aria-label="Security and verification badges">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-medium">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <svg className="w-5 h-5 text-[#0066CC]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-medium">Verified Pros</span>
              </div>
            </div>
          </div>

          {/* For Homeowners */}
          <nav aria-labelledby="homeowners-heading">
            <h3 id="homeowners-heading" className="text-white font-semibold mb-4">For Homeowners</h3>
            <ul className="space-y-3">
              {navigation.homeowners.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* For Contractors */}
          <nav aria-labelledby="contractors-heading">
            <h3 id="contractors-heading" className="text-white font-semibold mb-4">For Contractors</h3>
            <ul className="space-y-3">
              {navigation.contractors.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-labelledby="company-heading">
            <h3 id="company-heading" className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Support */}
          <nav aria-labelledby="support-heading">
            <h3 id="support-heading" className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              {navigation.support.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-gray-300 text-sm">
            © {new Date().getFullYear()} Mintenance. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#0066CC] transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label={social.ariaLabel || social.name}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </a>
              );
            })}
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
            >
              Privacy
            </Link>
            <Link
              href="/cookies"
              className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
