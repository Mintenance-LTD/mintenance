'use client';

import React from 'react';
import { Camera, Cpu, FileText } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

export function HowItWorksSection() {
  const steps = [
    {
      icon: Camera,
      title: 'Upload Photos',
      description: 'Take clear photos of the property damage from multiple angles. Upload 1-3 images for best results.',
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      icon: Cpu,
      title: 'AI Analysis',
      description: 'Our advanced computer vision AI analyzes the images, identifies damage types, and assesses severity levels.',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: FileText,
      title: 'Get Results',
      description: 'Receive instant cost estimates, severity ratings, and professional recommendations for repairs.',
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="bg-white py-16 sm:py-24"
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
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get professional property assessments in three simple steps
          </p>
        </MotionDiv>

        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <MotionDiv
                key={index}
                variants={fadeIn}
                className="relative"
              >
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-200 z-0" />
                )}

                {/* Card */}
                <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 h-full">
                  {/* Step number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${step.bgColor} mb-6`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Example images */}
        <MotionDiv
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16"
        >
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Example Photos for Best Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" aria-hidden="true" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Close-Up View</h4>
                <p className="text-sm text-gray-600">
                  Capture the damaged area clearly with good lighting
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" aria-hidden="true" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Wide Angle</h4>
                <p className="text-sm text-gray-600">
                  Show the context and surrounding area for reference
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" aria-hidden="true" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Detail Shot</h4>
                <p className="text-sm text-gray-600">
                  Highlight specific cracks, stains, or deterioration
                </p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-6">
              Pro tip: Take photos in good natural light for the most accurate analysis
            </p>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
