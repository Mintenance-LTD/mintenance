'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Users,
  CheckCircle,
  Zap,
  Shield,
  TrendingUp,
  MessageCircle,
  CreditCard,
  Star,
  ArrowRight,
  PlayCircle,
  HelpCircle,
} from 'lucide-react';
import { MotionButton, MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HowItWorksPage2025() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<'homeowner' | 'contractor'>('homeowner');

  const homeownerSteps = [
    {
      number: 1,
      title: 'Post Your Job',
      description: 'Describe your maintenance or renovation project in detail. Add photos, specify your budget, and set your timeline.',
      icon: FileText,
      color: 'bg-teal-100 text-teal-600',
    },
    {
      number: 2,
      title: 'Get Matched',
      description: 'Our AI instantly matches you with qualified contractors in your area. Review profiles, ratings, and past work.',
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      number: 3,
      title: 'Review Bids',
      description: 'Receive competitive quotes from multiple contractors. Compare pricing, timelines, and expertise.',
      icon: Search,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      number: 4,
      title: 'Choose & Pay Securely',
      description: 'Select your contractor and pay through our secure platform. Funds are held until work is completed.',
      icon: CreditCard,
      color: 'bg-green-100 text-green-600',
    },
    {
      number: 5,
      title: 'Track Progress',
      description: 'Monitor project milestones, communicate with your contractor, and approve completed work.',
      icon: TrendingUp,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      number: 6,
      title: 'Review & Release',
      description: 'Once satisfied, release payment and leave a review. Your feedback helps other homeowners.',
      icon: Star,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  const contractorSteps = [
    {
      number: 1,
      title: 'Create Your Profile',
      description: 'Build a professional profile showcasing your skills, certifications, and past projects with photos.',
      icon: Users,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      number: 2,
      title: 'Get Job Alerts',
      description: 'Receive instant notifications for jobs matching your expertise and location. Never miss an opportunity.',
      icon: Zap,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      number: 3,
      title: 'Submit Quotes',
      description: 'Review job details and submit competitive bids. Use our templates to create professional quotes quickly.',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      number: 4,
      title: 'Win Work',
      description: 'Get selected by homeowners and receive project details. Communicate directly through our platform.',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
    },
    {
      number: 5,
      title: 'Complete & Update',
      description: 'Execute the project professionally. Keep homeowners informed with progress updates and photos.',
      icon: MessageCircle,
      color: 'bg-teal-100 text-teal-600',
    },
    {
      number: 6,
      title: 'Get Paid Fast',
      description: 'Receive secure payments directly to your account. Build your reputation with 5-star reviews.',
      icon: CreditCard,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  const features = [
    {
      title: 'Secure Payments',
      description: 'Escrow protection ensures fair payment for both parties',
      icon: Shield,
      color: 'text-green-600',
    },
    {
      title: 'Verified Contractors',
      description: 'All professionals are background-checked and certified',
      icon: CheckCircle,
      color: 'text-blue-600',
    },
    {
      title: 'Real-time Chat',
      description: 'Communicate instantly with contractors or homeowners',
      icon: MessageCircle,
      color: 'text-purple-600',
    },
    {
      title: 'AI Matching',
      description: 'Smart algorithms connect the right people for every job',
      icon: Zap,
      color: 'text-emerald-600',
    },
  ];

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

  const steps = activeRole === 'homeowner' ? homeownerSteps : contractorSteps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Section */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <MotionH1
            variants={fadeIn}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            How Mintenance Works
          </MotionH1>
          <MotionP
            variants={fadeIn}
            className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto"
          >
            Connecting homeowners with trusted contractors has never been easier.
            Here's how we make home maintenance simple and stress-free.
          </MotionP>
          <MotionButton
            variants={fadeIn}
            onClick={() => router.push('/signup')}
            className="px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-semibold text-lg"
          >
            Get Started Free
          </MotionButton>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Role Toggle */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="flex justify-center mb-16"
        >
          <div className="inline-flex bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => setActiveRole('homeowner')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'homeowner'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              For Homeowners
            </button>
            <button
              onClick={() => setActiveRole('contractor')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'contractor'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              For Contractors
            </button>
          </div>
        </MotionDiv>

        {/* Steps */}
        <MotionDiv
          key={activeRole}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-12 mb-20"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <MotionDiv
                key={step.number}
                variants={staggerItem}
                className={`flex flex-col ${
                  isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                } items-center gap-8 lg:gap-12`}
              >
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full ${
                        activeRole === 'homeowner'
                          ? 'bg-teal-600'
                          : 'bg-emerald-600'
                      } text-white flex items-center justify-center font-bold text-xl`}
                    >
                      {step.number}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="flex-1 flex justify-center">
                  <div
                    className={`w-64 h-64 rounded-2xl ${step.color} flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-32 h-32" />
                  </div>
                </div>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Features */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 mb-20"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Mintenance?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <MotionDiv
                  key={index}
                  variants={staggerItem}
                  className="text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gray-100 rounded-2xl">
                      <Icon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </MotionDiv>
              );
            })}
          </div>
        </MotionDiv>

        {/* Video Demo */}
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
            <PlayCircle className="w-6 h-6" />
            Watch Demo Video
          </button>
        </MotionDiv>

        {/* FAQs */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-20"
        >
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
                    <HelpCircle className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
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

        {/* CTA */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-xl p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-teal-100 mb-8">
            Join thousands of homeowners and contractors using Mintenance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup?role=homeowner')}
              className="px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-semibold text-lg"
            >
              Post a Job
            </button>
            <button
              onClick={() => router.push('/signup?role=contractor')}
              className="px-8 py-4 bg-white/10 border-2 border-white text-white rounded-lg hover:bg-white/20 transition-colors font-semibold text-lg"
            >
              Become a Contractor
            </button>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
