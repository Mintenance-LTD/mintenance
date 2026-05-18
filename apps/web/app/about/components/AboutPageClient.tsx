'use client';

import React from 'react';
import Link from 'next/link';
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
import {
  MotionButton,
  MotionDiv,
  MotionH1,
  MotionP,
} from '@/components/ui/MotionDiv';

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

const cardStyle: React.CSSProperties = {
  background: 'var(--me-surface)',
  borderRadius: 'var(--me-radius-card)',
  border: '1px solid var(--me-line)',
  boxShadow: 'var(--me-shadow-card)',
};

const displayHeading: React.CSSProperties = {
  fontFamily: 'var(--me-font-display)',
  fontWeight: 500,
  letterSpacing: '-0.02em',
  color: 'var(--me-ink)',
};

export default function AboutPageClient() {
  const stats = [
    { label: 'Founded', value: '2025', icon: Award },
    { label: 'Based In', value: 'Manchester', icon: Globe },
    { label: 'Protected Payment', value: '100%', icon: Shield },
    { label: 'AI Powered', value: 'Mint AI', icon: Zap },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Customer First',
      description:
        'We prioritise the needs and satisfaction of both homeowners and contractors, ensuring a seamless experience for all.',
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description:
        'Every contractor is thoroughly vetted and verified. We maintain strict quality standards to protect our community.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description:
        'We leverage cutting-edge technology including AI and machine learning to provide the best matching and service.',
    },
    {
      icon: Globe,
      title: 'Accessibility',
      description:
        'Our platform is designed to be accessible to everyone, making home maintenance simple and stress-free.',
    },
  ];

  const milestones = [
    {
      year: '2025',
      title: 'Company Founded',
      description:
        'Mintenance was born from a vision to revolutionise home maintenance',
    },
    {
      year: '2026',
      title: 'Platform Launch',
      description:
        'Officially launched our platform connecting homeowners and contractors',
    },
    {
      year: '2027',
      title: 'AI Integration',
      description:
        'AI-powered matching and intelligent job recommendations will be introduced',
    },
  ];

  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{ background: 'var(--me-bg)', fontFamily: 'var(--me-font-body)' }}
    >
      {/* Hero Section */}
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        style={{
          background:
            'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          color: 'var(--me-on-brand)',
        }}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
          <div className='text-center'>
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className='text-5xl md:text-6xl mb-6'
              style={{
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Transforming Home Maintenance
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='text-xl md:text-2xl max-w-3xl mx-auto'
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              Connecting homeowners with trusted professionals through
              innovative technology and exceptional service
            </MotionP>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16'
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <MotionDiv
                  key={index}
                  variants={staggerItem}
                  className='rounded-xl p-6 text-center'
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <Icon
                    className='w-8 h-8 mx-auto mb-3'
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  />
                  <p
                    className='text-3xl mb-2'
                    style={{
                      fontFamily: 'var(--me-font-display)',
                      fontWeight: 500,
                    }}
                  >
                    {stat.value}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {stat.label}
                  </p>
                </MotionDiv>
              );
            })}
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        {/* Mission Statement */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className='p-12 mb-16 text-center'
          style={cardStyle}
        >
          <Target
            className='w-16 h-16 mx-auto mb-6'
            style={{ color: 'var(--me-brand)' }}
          />
          <h2 className='text-3xl mb-4' style={displayHeading}>
            Our Mission
          </h2>
          <p
            className='text-xl max-w-4xl mx-auto leading-relaxed'
            style={{ color: 'var(--me-ink-2)' }}
          >
            To make home maintenance simple, trustworthy, and accessible for
            everyone by leveraging technology to connect homeowners with the
            right professionals at the right time.
          </p>
        </MotionDiv>

        {/* Values Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className='mb-16'
        >
          <h2 className='text-3xl text-center mb-12' style={displayHeading}>
            Our Values
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <MotionDiv
                  key={index}
                  whileHover={{ y: -4 }}
                  className='p-8 transition-all'
                  style={cardStyle}
                >
                  <div
                    className='p-4 rounded-xl inline-block mb-4'
                    style={{ background: 'var(--me-brand-soft)' }}
                  >
                    <Icon
                      className='w-8 h-8'
                      style={{ color: 'var(--me-brand)' }}
                    />
                  </div>
                  <h3
                    className='text-xl mb-3'
                    style={{ ...displayHeading, fontSize: 22 }}
                  >
                    {value.title}
                  </h3>
                  <p
                    className='leading-relaxed'
                    style={{ color: 'var(--me-ink-2)' }}
                  >
                    {value.description}
                  </p>
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
          className='mb-16'
        >
          <h2 className='text-3xl text-center mb-12' style={displayHeading}>
            Our Journey
          </h2>
          <div className='relative'>
            <div
              className='absolute left-1/2 transform -translate-x-1/2 h-full w-1'
              style={{
                background:
                  'linear-gradient(180deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
              }}
            ></div>
            <div className='space-y-12'>
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
                  <div
                    className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}
                  >
                    <div className='p-6' style={cardStyle}>
                      <h3
                        className='text-xl mb-2'
                        style={{ ...displayHeading, fontSize: 22 }}
                      >
                        {milestone.title}
                      </h3>
                      <p style={{ color: 'var(--me-ink-2)' }}>
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className='relative z-10'>
                    <div
                      className='px-6 py-3 rounded-full text-lg'
                      style={{
                        background: 'var(--me-brand)',
                        color: 'var(--me-on-brand)',
                        fontFamily: 'var(--me-font-display)',
                        fontWeight: 500,
                        boxShadow: 'var(--me-shadow-pop)',
                      }}
                    >
                      {milestone.year}
                    </div>
                  </div>
                  <div className='flex-1'></div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Our Story Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className='mb-16'
        >
          <div className='p-12' style={cardStyle}>
            <h2 className='text-3xl text-center mb-8' style={displayHeading}>
              Our Story
            </h2>
            <div
              className='max-w-3xl mx-auto space-y-4 text-lg leading-relaxed'
              style={{ color: 'var(--me-ink-2)' }}
            >
              <p>
                Mintenance was founded in Manchester in 2025 with a simple
                question: why is finding a reliable tradesperson still so
                stressful?
              </p>
              <p>
                We saw homeowners burnt by no-shows, inflated quotes, and zero
                accountability. We saw contractors losing time chasing leads
                that went nowhere. Both sides deserved better.
              </p>
              <p>
                So we built a platform where every contractor is verified, every
                payment is held with Protected Payment until the work is done,
                and AI helps match the right professional to the right job. No
                surprises, no disputes — just quality work, paid fairly.
              </p>
              <p className='font-medium' style={{ color: 'var(--me-ink)' }}>
                We are a small, focused team based in Greater Manchester, and we
                are building Mintenance to be the most trusted property
                maintenance platform in the UK.
              </p>
            </div>
          </div>
        </MotionDiv>

        {/* CTA Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className='rounded-xl p-12 text-center'
          style={{
            background:
              'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
            color: 'var(--me-on-brand)',
          }}
        >
          <Award
            className='w-16 h-16 mx-auto mb-6'
            style={{ color: 'rgba(255,255,255,0.85)' }}
          />
          <h2
            className='text-3xl mb-4'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Join Our Growing Community
          </h2>
          <p
            className='text-xl mb-8 max-w-2xl mx-auto'
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Whether you're a homeowner looking for trusted professionals or a
            contractor seeking new opportunities, we're here to help you
            succeed.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/contractors'
              className='px-8 py-4 font-semibold transition-colors text-center'
              style={{
                background: 'var(--me-surface)',
                color: 'var(--me-brand)',
                borderRadius: 'var(--me-radius-btn)',
              }}
            >
              Find Contractors
            </Link>
            <Link
              href='/login'
              className='px-8 py-4 font-semibold transition-colors text-center'
              style={{
                background: 'var(--me-brand-2)',
                border: '2px solid rgba(255,255,255,0.3)',
                color: 'var(--me-on-brand)',
                borderRadius: 'var(--me-radius-btn)',
              }}
            >
              Become a Contractor
            </Link>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
