'use client';

import {
  Search,
  FileText,
  Users,
  CheckCircle,
  Zap,
  TrendingUp,
  MessageCircle,
  CreditCard,
  Star,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

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

interface HowItWorksStepsProps {
  activeRole: 'homeowner' | 'contractor';
}

export function HowItWorksSteps({ activeRole }: HowItWorksStepsProps) {
  const steps = activeRole === 'homeowner' ? homeownerSteps : contractorSteps;

  return (
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
                    activeRole === 'homeowner' ? 'bg-teal-600' : 'bg-emerald-600'
                  } text-white flex items-center justify-center font-bold text-xl`}
                >
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">{step.description}</p>
            </div>

            <div className="flex-1 flex justify-center">
              <div
                className={`w-64 h-64 rounded-2xl ${step.color} flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform`}
              >
                <Icon className="w-32 h-32" aria-hidden="true" />
              </div>
            </div>
          </MotionDiv>
        );
      })}
    </MotionDiv>
  );
}
