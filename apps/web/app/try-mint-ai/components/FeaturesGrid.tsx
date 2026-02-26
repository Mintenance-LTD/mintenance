'use client';

import React from 'react';
import { Zap, TrendingUp, ShieldCheck, Layers, Gauge, RefreshCcw } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export function FeaturesGrid() {
  const features = [
    {
      icon: Zap,
      title: 'Instant Analysis',
      description: 'Get AI-powered assessment results in seconds, not days. No waiting for quotes.',
      gradient: 'from-yellow-400 to-amber-500',
    },
    {
      icon: TrendingUp,
      title: 'Cost Estimates',
      description: 'Accurate repair cost ranges based on UK property data and current market rates.',
      gradient: 'from-teal-400 to-teal-600',
    },
    {
      icon: ShieldCheck,
      title: 'Expert Validation',
      description: 'AI trained on thousands of real building surveys conducted by qualified professionals.',
      gradient: 'from-emerald-400 to-emerald-600',
    },
    {
      icon: Layers,
      title: 'Multiple Damage Types',
      description: 'Identifies roofs, walls, foundations, plumbing, electrical, and structural issues.',
      gradient: 'from-blue-400 to-blue-600',
    },
    {
      icon: Gauge,
      title: 'Confidence Scores',
      description: 'Transparent AI predictions with confidence levels so you know what to trust.',
      gradient: 'from-purple-400 to-purple-600',
    },
    {
      icon: RefreshCcw,
      title: 'Continuous Learning',
      description: 'Your feedback helps improve the AI, making it more accurate with every assessment.',
      gradient: 'from-pink-400 to-pink-600',
    },
  ];

  return (
    <section
      aria-labelledby="features-heading"
      className="bg-gradient-to-br from-gray-50 to-gray-100 py-16 sm:py-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Mint AI?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powered by cutting-edge technology and real-world expertise
          </p>
        </MotionDiv>

        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <MotionDiv
                key={index}
                variants={fadeIn}
                className="group"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 h-full">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Trust indicators */}
        <MotionDiv
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-xl border-2 border-teal-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
              <div className="pt-8 sm:pt-0">
                <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  3-Model
                </div>
                <div className="text-gray-600 font-medium">
                  AI Fusion Pipeline
                </div>
              </div>
              <div className="pt-8 sm:pt-0">
                <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  Beta
                </div>
                <div className="text-gray-600 font-medium">
                  Accuracy Improving Daily
                </div>
              </div>
              <div className="pt-8 sm:pt-0">
                <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  &lt;5s
                </div>
                <div className="text-gray-600 font-medium">
                  Average Analysis Time
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Technical details */}
        <MotionDiv
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-br from-teal-900 to-emerald-900 rounded-2xl p-8 sm:p-12 text-white">
            <h3 className="text-2xl font-bold mb-6 text-center">
              Powered by Advanced AI Technology
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">GPT-4 Vision</h4>
                  <p className="text-teal-100 text-sm">
                    State-of-the-art image understanding and analysis
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Computer Vision</h4>
                  <p className="text-teal-100 text-sm">
                    Advanced pattern recognition and defect detection
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Machine Learning</h4>
                  <p className="text-teal-100 text-sm">
                    Continuously trained on verified assessments
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">UK Property Data</h4>
                  <p className="text-teal-100 text-sm">
                    Cost estimates based on local market rates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
