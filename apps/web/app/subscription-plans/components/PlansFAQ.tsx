'use client';

import { useState } from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { HelpCircle, ChevronDown } from 'lucide-react';

export function PlansFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Can I switch plans at any time?',
      answer: 'Yes! You can upgrade, downgrade, or cancel your plan at any time. When you upgrade, changes take effect immediately and we prorate any charges. When you downgrade, the new plan takes effect at the end of your current billing cycle.',
    },
    {
      question: 'What happens if I downgrade from Professional to Basic?',
      answer: 'If you downgrade, you\'ll retain access to Professional features until the end of your billing period. After that, your monthly bid limit will be reduced to 10, your platform fee will increase to 15%, and premium features like advanced analytics will no longer be available. Your profile and job history remain intact.',
    },
    {
      question: 'Are there any contracts or long-term commitments?',
      answer: 'No contracts required! All plans are month-to-month (or annual if you choose yearly billing). You can cancel at any time with no penalties or cancellation fees. Your subscription simply won\'t renew at the end of the billing period.',
    },
    {
      question: 'Can I get a refund if I\'m not satisfied?',
      answer: 'Yes, we offer a 30-day money-back guarantee on all annual plans. If you\'re not completely satisfied within the first 30 days, contact our support team for a full refund. Monthly subscriptions are non-refundable but can be cancelled at any time.',
    },
    {
      question: 'How do platform fees work?',
      answer: 'Platform fees are charged only when you successfully complete a job. The percentage varies by plan: Basic (15%), Professional (10%), Business (7%). For example, on a £1,000 job with Professional plan, you\'d pay £100 in platform fees. The fee is automatically deducted from the escrow payment when the job is marked complete.',
    },
    {
      question: 'Do I need to pay the subscription fee AND the platform fee?',
      answer: 'Yes, the subscription fee (£29/mo for Professional or £99/mo for Business) is separate from platform fees. However, the lower platform fees on paid plans quickly offset the subscription cost. For example, with just 3 jobs at £500 each, Professional plan members save £75 in fees compared to Basic, more than covering the £29 subscription.',
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-teal-100 rounded-2xl mb-4">
          <HelpCircle className="w-8 h-8 text-teal-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-600">Everything you need to know about our subscription plans</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden transition-all hover:shadow-lg"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-gray-900 pr-4">{faq.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-5">
                <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-4">Still have questions?</p>
        <a
          href="/contact"
          className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors"
        >
          Contact our support team
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </MotionDiv>
  );
}
