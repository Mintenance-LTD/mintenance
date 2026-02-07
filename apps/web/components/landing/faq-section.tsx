'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AccordionItem } from '@/components/ui/AccordionItem';

const FAQ_ITEMS = [
  {
    title: 'How does the AI damage detection work?',
    content:
      'Our Mint AI uses advanced computer vision to analyse property photos and detect 71 different types of damage. Simply upload images, and within 60 seconds, you\'ll receive a detailed assessment with estimated repair costs. The AI has been trained on thousands of property images and maintains a 95%+ accuracy rate.',
    hasBorder: true,
  },
  {
    title: 'How does the escrow payment system work?',
    content:
      'When you accept a contractor\'s bid, your payment is held securely in escrow by Mintenance. The contractor completes the work, you approve it, and then funds are released. If there\'s any issue, our mediation team steps in to resolve it fairly. This protects both homeowners and contractors.',
    hasBorder: true,
  },
  {
    title: 'Are all contractors verified and insured?',
    content:
      'Yes, absolutely. We verify all contractor certifications (Gas Safe, NICEIC, etc.), check insurance coverage (minimum £5M public liability, £2M professional indemnity), run background checks, and verify business registration. Only fully verified contractors can bid on jobs.',
    hasBorder: true,
  },
  {
    title: 'What fees does Mintenance charge?',
    content:
      'Homeowners can post jobs completely free. Contractors pay a small service fee (typically 5-10%) only when they win a job. There are no monthly subscriptions, listing fees, or hidden costs. The exact fee is clearly shown before accepting any job.',
    hasBorder: true,
  },
  {
    title: 'How long does it take to get quotes?',
    content:
      'Most jobs receive 3-8 competitive bids within 24-48 hours. Our AI instantly matches your job with qualified contractors in your area. You can review profiles, ratings, portfolios, and compare quotes before choosing the best contractor for your project.',
    hasBorder: true,
  },
  {
    title: "What if I'm not satisfied with the work?",
    content:
      'We offer free dispute resolution services. Contact our support team with details and evidence (photos, messages, contracts). Our mediation team will review the case within 5-7 business days and help reach a fair resolution. Your payment stays in escrow until the issue is resolved.',
    hasBorder: false,
  },
];

/**
 * Frequently Asked Questions section with accordion
 */
export function FAQSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get answers to common questions about using Mintenance
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
        >
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.title}
              title={item.title}
              content={
                <p className="text-gray-700 leading-relaxed">{item.content}</p>
              }
              className={item.hasBorder ? 'border-b border-gray-200' : undefined}
              titleClassName="px-6 text-lg"
              contentClassName="px-6"
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-6 py-3 text-teal-600 hover:text-teal-700 font-semibold transition-colors"
          >
            View All FAQs
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
