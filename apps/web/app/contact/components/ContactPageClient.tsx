'use client';

import React, { Suspense } from 'react';
import ContactHero from './ContactHero';
import ContactForm from './ContactForm';
import ContactInfo from './ContactInfo';
import ContactFAQ from './ContactFAQ';

function ContactPageContent() {
  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{ background: 'var(--me-bg)', fontFamily: 'var(--me-font-body)' }}
    >
      <ContactHero />
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <ContactForm />
        <ContactInfo />
        <ContactFAQ />
      </div>
    </div>
  );
}

export default function ContactPageClient() {
  return (
    <Suspense
      fallback={
        <div
          data-theme='mint-editorial'
          className='min-h-screen flex items-center justify-center'
          style={{ background: 'var(--me-bg)' }}
        >
          <div className='text-center'>
            <div
              className='w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4'
              style={{
                borderColor: 'var(--me-brand)',
                borderTopColor: 'transparent',
              }}
            ></div>
            <p style={{ color: 'var(--me-ink-2)' }}>Loading contact form...</p>
          </div>
        </div>
      }
    >
      <ContactPageContent />
    </Suspense>
  );
}
