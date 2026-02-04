'use client';

import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  Zap,
  Camera,
  Star,
  FileText,
  Image,
  MessageSquare,
  Clock,
  Award,
} from 'lucide-react';

/**
 * Quick actionable tips in grid layout
 * Professional card design with icons
 */
export function QuickTipsSection() {
  const tips = [
    {
      icon: Clock,
      title: 'Respond Within 1 Hour',
      description: 'Fast responses increase your win rate by 35%. Set up notifications to never miss an opportunity.',
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: Image,
      title: 'Upload 5+ Portfolio Photos',
      description: 'Profiles with quality portfolio images receive 2x more views and build instant trust.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Star,
      title: 'Maintain 4.5+ Rating',
      description: 'High ratings unlock featured placement and priority in search results.',
      color: 'from-amber-500 to-amber-600',
    },
    {
      icon: Award,
      title: 'Complete Your Profile',
      description: 'Full profiles with certifications increase job offers by 45% compared to incomplete ones.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Camera,
      title: 'Use Professional Photos',
      description: 'Quality before/after photos attract 3x more clients and justify premium pricing.',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      icon: FileText,
      title: 'Write Detailed Quotes',
      description: 'Itemized quotes with clear explanations convert 50% better than vague estimates.',
      color: 'from-pink-500 to-pink-600',
    },
    {
      icon: MessageSquare,
      title: 'Communicate Proactively',
      description: 'Regular updates and clear communication lead to better reviews and repeat business.',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: Zap,
      title: 'Set Competitive Prices',
      description: 'Use our pricing suggestions to stay competitive while maintaining healthy profit margins.',
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Quick Success Tips
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Actionable advice you can implement today to improve your results immediately
        </p>
      </MotionDiv>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-xl transition-all duration-300"
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 bg-gradient-to-br ${tip.color} rounded-lg flex items-center justify-center mb-4`}
              >
                <Icon className="w-6 h-6 text-white" aria-hidden="true" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {tip.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {tip.description}
              </p>
            </MotionDiv>
          );
        })}
      </div>
    </section>
  );
}
