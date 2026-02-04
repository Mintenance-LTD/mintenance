'use client';

import { Shield, CheckCircle, MessageCircle, Zap } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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

export function HowItWorksFeatures() {
  return (
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
            <MotionDiv key={index} variants={staggerItem} className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-100 rounded-2xl">
                  <Icon className={`w-8 h-8 ${feature.color}`} aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </MotionDiv>
          );
        })}
      </div>
    </MotionDiv>
  );
}
