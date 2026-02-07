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
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/20 backdrop-blur-sm p-4 rounded-full inline-block mb-6"
          >
            <MessageSquare className="w-12 h-12" />
          </MotionDiv>
          <MotionH1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            Get in Touch
          </MotionH1>
          <MotionP
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto"
          >
            Have questions? We're here to help. Reach out to our team and we'll respond as soon as possible.
          </MotionP>
        </div>
      </div>
    </MotionDiv>
  );
}
