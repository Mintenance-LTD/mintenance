'use client';

import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';
import { Sparkles } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface PlansHeroProps {
  isAnnual: boolean;
  setIsAnnual: (value: boolean) => void;
}

export function PlansHero({ isAnnual, setIsAnnual }: PlansHeroProps) {
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full mb-6"
          >
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="font-semibold text-white">Save up to 53% on platform fees</span>
          </MotionDiv>

          <MotionH1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            Choose Your Growth Path
          </MotionH1>

          <MotionP
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto mb-8"
          >
            Flexible plans designed to help contractors win more jobs and grow their business
          </MotionP>

          <MotionDiv
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="inline-flex bg-white/20 backdrop-blur-sm p-2 rounded-xl"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                !isAnnual
                  ? 'bg-white text-teal-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                isAnnual
                  ? 'bg-white text-teal-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Annual
              <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-sm font-bold">
                Save 17%
              </span>
            </button>
          </MotionDiv>
        </div>
      </div>
    </MotionDiv>
  );
}
