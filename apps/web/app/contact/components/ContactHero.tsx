'use client';

import { MessageSquare } from 'lucide-react';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ContactHero() {
  return (
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
          <MotionDiv
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className='p-4 rounded-full inline-block mb-6'
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <MessageSquare className='w-12 h-12' />
          </MotionDiv>
          <MotionH1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='text-5xl md:text-6xl mb-6'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Get in Touch
          </MotionH1>
          <MotionP
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className='text-xl md:text-2xl max-w-3xl mx-auto'
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Have questions? We're here to help. Reach out to our team and we'll
            respond as soon as possible.
          </MotionP>
        </div>
      </div>
    </MotionDiv>
  );
}
