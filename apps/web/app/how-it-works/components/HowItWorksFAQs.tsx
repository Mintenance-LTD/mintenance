'use client';

import { useRouter } from 'next/navigation';
import { HelpCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const faqs = [
  {
    question: 'How much does it cost to use Mintenance?',
    answer: 'Homeowners can post jobs for free. Contractors pay a small service fee only when they win a job. No monthly subscriptions required.',
  },
  {
    question: 'How long does it take to get quotes?',
    answer: 'Most jobs receive their first quote within 24 hours. Popular job types often get multiple quotes within a few hours.',
  },
  {
    question: 'Are contractors insured and verified?',
    answer: 'Yes, all contractors on our platform are required to provide proof of insurance and relevant certifications. We verify credentials before approval.',
  },
  {
    question: 'What if I\'m not satisfied with the work?',
    answer: 'Our escrow system protects you. Payment is only released when you approve the completed work. We also offer dispute resolution support.',
  },
];

export function HowItWorksFAQs() {
  const router = useRouter();

  return (
    <>
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-xl p-12 mb-20 text-center text-white"
      >
        <h2 className="text-3xl font-bold mb-4">See It In Action</h2>
        <p className="text-xl text-teal-100 mb-8">
          Watch how Mintenance simplifies your home maintenance journey
        </p>
        <button className="inline-flex items-center gap-3 px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-semibold text-lg">
          <PlayCircle className="w-6 h-6" aria-hidden="true" />
          Watch Demo Video
        </button>
      </MotionDiv>

      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="mb-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Frequently Asked Questions
        </h2>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <MotionDiv
              key={index}
              variants={staggerItem}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                  <HelpCircle className="w-6 h-6 text-teal-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/help')}
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold"
          >
            View All FAQs
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </MotionDiv>
    </>
  );
}
