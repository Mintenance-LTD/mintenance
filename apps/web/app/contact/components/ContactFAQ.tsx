'use client';

import Link from 'next/link';
import { HelpCircle, CheckCircle } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const faqs = [
  {
    question: 'How do I post a job?',
    answer: 'Sign up for a free account, click "Post a Job", fill in the details, and submit. You\'ll start receiving bids from qualified contractors immediately.',
  },
  {
    question: 'How are contractors verified?',
    answer: 'All contractors go through a rigorous verification process including ID checks, licence verification, insurance validation, and customer review analysis.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards, bank transfers, and digital payment methods. Payments are securely processed through our payment partners.',
  },
  {
    question: 'Is there a fee to use the platform?',
    answer: 'Posting jobs is free for homeowners. Contractors pay a small service fee only when they win a job. See our pricing page for detailed information.',
  },
];

export default function ContactFAQ() {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 }}
      className="mt-16"
    >
      <div className="text-center mb-12">
        <HelpCircle className="w-12 h-12 text-teal-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Answers</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Common questions we receive. For more detailed FAQs, visit our help centre.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {faqs.map((faq, index) => (
          <MotionDiv
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all"
          >
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-1" />
              <h3 className="font-bold text-gray-900">{faq.question}</h3>
            </div>
            <p className="text-gray-600 ml-8">{faq.answer}</p>
          </MotionDiv>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-600 mb-4">Need more information?</p>
        <Link
          href="/faq"
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
        >
          Visit Full FAQ
        </Link>
      </div>
    </MotionDiv>
  );
}
