'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    // Simulate form submission (replace with actual API call)
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', category: 'general', message: '' });

      // Reset status after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Logo className="w-10 h-10" />
              <span className="ml-3 text-xl font-bold text-[#0F172A]">Mintenance</span>
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-[#10B981] transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F172A] to-[#1e293b]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We're here to help. Whether you have a question about our platform, need technical support,
            or want to explore partnership opportunities, our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Email */}
            <div className="bg-white rounded-xl p-8 text-center shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Email Us</h3>
              <p className="text-gray-600 mb-4">Our team typically responds within 24 hours</p>
              <a href="mailto:support@mintenance.co.uk" className="text-[#10B981] hover:underline font-medium">
                support@mintenance.co.uk
              </a>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-xl p-8 text-center shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Call Us</h3>
              <p className="text-gray-600 mb-4">Monday-Friday, 9:00 AM - 6:00 PM GMT</p>
              <a href="tel:+442012345678" className="text-[#F59E0B] hover:underline font-medium">
                +44 (0) 20 1234 5678
              </a>
            </div>

            {/* Live Chat */}
            <div className="bg-white rounded-xl p-8 text-center shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-[#8B5CF6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Live Chat</h3>
              <p className="text-gray-600 mb-4">Chat with our support team in real-time</p>
              <button className="text-[#8B5CF6] hover:underline font-medium">
                Start Chat →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">Send Us a Message</h2>
            <p className="text-xl text-gray-600">
              Fill out the form below and we'll get back to you as soon as possible
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
            {status === 'success' && (
              <div className="mb-8 bg-[#10B981]/10 border border-[#10B981] text-[#10B981] rounded-lg p-4 flex items-start">
                <svg className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold">Message sent successfully!</p>
                  <p className="text-sm">We'll get back to you within 24 hours.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-[#0F172A] mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                    placeholder="john.smith@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                >
                  <option value="general">General Enquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="partnerships">Partnership Opportunities</option>
                  <option value="press">Press & Media</option>
                  <option value="feedback">Feedback & Suggestions</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                  placeholder="How can we help you?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all resize-none"
                  placeholder="Please provide as much detail as possible..."
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="consent"
                  required
                  className="w-5 h-5 text-[#10B981] bg-gray-100 border-gray-300 rounded focus:ring-[#10B981] mt-0.5"
                />
                <label htmlFor="consent" className="ml-3 text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/privacy" className="text-[#10B981] hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  and consent to Mintenance contacting me regarding my enquiry. *
                </label>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-[#10B981] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Office Location */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-[#0F172A] mb-6">Our Office</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Registered Office</h3>
                    <p className="text-gray-600">
                      MINTENANCE LTD<br />
                      Suite 2 J2 Business Park<br />
                      Bridge Hall Lane<br />
                      Bury, England<br />
                      BL9 7NY
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Opening Hours</h3>
                    <p className="text-gray-600">
                      Monday - Friday: 9:00 AM - 6:00 PM<br />
                      Saturday: 10:00 AM - 2:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Company Details</h3>
                    <p className="text-gray-600">
                      Company No. 16542104<br />
                      Registered in England and Wales
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="font-medium">Interactive Map</p>
                <p className="text-sm">Suite 2 J2 Business Park, Bury</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Quick Links */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-[#0F172A] mb-6">Looking for Quick Answers?</h2>
          <p className="text-xl text-gray-600 mb-10">
            Many common questions are answered in our Help Centre
          </p>
          <Link
            href="/help"
            className="inline-flex items-center bg-[#10B981] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#059669] transition-colors"
          >
            Visit Help Centre
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <Logo className="w-10 h-10" />
            <span className="ml-3 text-xl font-bold">Mintenance</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-[#10B981] transition-colors">
              About Us
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Mintenance Ltd. All rights reserved. Company No. 16542104
          </p>
        </div>
      </footer>
    </div>
  );
}
