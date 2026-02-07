'use client';

import React, { Suspense } from 'react';
import ContactHero from './ContactHero';
import ContactForm from './ContactForm';
import ContactInfo from './ContactInfo';
import ContactFAQ from './ContactFAQ';

function ContactPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <ContactHero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <ContactForm />
        <ContactInfo />
        <ContactFAQ />
      </div>
    </div>
  );
}

export default function ContactPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact form...</p>
        </div>
      </div>
    }>
      <ContactPageContent />
    </Suspense>
  );
}
