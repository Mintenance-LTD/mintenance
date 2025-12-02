'use client';

import React from 'react';
import {
  Heart,
  Users,
  Target,
  Award,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  Star,
} from 'lucide-react';
import { MotionButton, MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';
import { UnifiedButton } from '@/components/ui';

// Animation variants
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

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AboutPage2025() {
  const stats = [
    { label: 'Active Users', value: '10,000+', icon: Users },
    { label: 'Jobs Completed', value: '50,000+', icon: CheckCircle },
    { label: 'Verified Contractors', value: '2,500+', icon: Shield },
    { label: 'Customer Satisfaction', value: '98%', icon: Star },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Customer First',
      description: 'We prioritize the needs and satisfaction of both homeowners and contractors, ensuring a seamless experience for all.',
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Every contractor is thoroughly vetted and verified. We maintain strict quality standards to protect our community.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'We leverage cutting-edge technology including AI and machine learning to provide the best matching and service.',
    },
    {
      icon: Globe,
      title: 'Accessibility',
      description: 'Our platform is designed to be accessible to everyone, making home maintenance simple and stress-free.',
    },
  ];

  const team = [
    {
      name: 'Sarah Johnson',
      role: 'CEO & Founder',
      image: '/placeholder-avatar.jpg',
      bio: 'Former contractor with 15 years of experience in the home services industry.',
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      image: '/placeholder-avatar.jpg',
      bio: 'Tech veteran with expertise in AI, machine learning, and platform development.',
    },
    {
      name: 'Emma Williams',
      role: 'Head of Operations',
      image: '/placeholder-avatar.jpg',
      bio: 'Operations specialist ensuring smooth platform performance and user satisfaction.',
    },
    {
      name: 'David Brown',
      role: 'Head of Contractor Relations',
      image: '/placeholder-avatar.jpg',
      bio: 'Building strong relationships with contractors and ensuring quality standards.',
    },
  ];

  const milestones = [
    { year: '2020', title: 'Company Founded', description: 'Mintenance was born from a vision to revolutionize home maintenance' },
    { year: '2021', title: 'Platform Launch', description: 'Officially launched our platform connecting homeowners and contractors' },
    { year: '2022', title: 'AI Integration', description: 'Introduced AI-powered matching and intelligent job recommendations' },
    { year: '2023', title: 'National Expansion', description: 'Expanded coverage to all major cities across the UK' },
    { year: '2024', title: '10,000 Users', description: 'Reached milestone of 10,000 active users on the platform' },
    { year: '2025', title: 'Advanced Features', description: 'Launched AR/VR visualizations and enhanced safety monitoring' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Section */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold mb-6"
            >
              Transforming Home Maintenance
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto"
            >
              Connecting homeowners with trusted professionals through innovative technology and exceptional service
            </MotionP>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <MotionDiv
                  key={index}
                  variants={staggerItem}
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center"
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-teal-200" />
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <p className="text-teal-100">{stat.label}</p>
                </MotionDiv>
              );
            })}
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission Statement */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 mb-16 text-center"
        >
          <Target className="w-16 h-16 text-teal-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            To make home maintenance simple, trustworthy, and accessible for everyone by leveraging technology
            to connect homeowners with the right professionals at the right time.
          </p>
        </MotionDiv>

        {/* Values Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <MotionDiv
                  key={index}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-lg transition-all"
                >
                  <div className="bg-teal-100 p-4 rounded-xl inline-block mb-4">
                    <Icon className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </MotionDiv>
              );
            })}
          </div>
        </MotionDiv>

        {/* Timeline */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-teal-600 to-emerald-600"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <MotionDiv
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-8 ${
                    index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="bg-teal-600 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg">
                      {milestone.year}
                    </div>
                  </div>
                  <div className="flex-1"></div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Team Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <MotionDiv
                key={index}
                whileHover={{ y: -8 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="aspect-square bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                  <Users className="w-24 h-24 text-teal-600" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-teal-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </div>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>

        {/* CTA Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-xl p-12 text-center text-white"
        >
          <Award className="w-16 h-16 mx-auto mb-6 text-teal-200" />
          <h2 className="text-3xl font-bold mb-4">Join Our Growing Community</h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Whether you're a homeowner looking for trusted professionals or a contractor seeking new opportunities,
            we're here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <UnifiedButton
              variant="primary"
              size="xl"
              className="bg-white text-teal-600 hover:bg-gray-50 hover:shadow-lg"
            >
              Find Contractors
            </UnifiedButton>
            <UnifiedButton
              variant="primary"
              size="xl"
              className="bg-teal-700 hover:bg-teal-800 border-2 border-white/30"
            >
              Become a Contractor
            </UnifiedButton>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
