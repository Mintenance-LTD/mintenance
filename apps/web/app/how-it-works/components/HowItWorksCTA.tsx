'use client';

import { useRouter } from 'next/navigation';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HowItWorksCTA() {
  const router = useRouter();

  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-xl p-12 text-center text-white"
    >
      <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
      <p className="text-xl text-teal-100 mb-8">
        Join thousands of homeowners and contractors using Mintenance
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => router.push('/signup?role=homeowner')}
          className="px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-semibold text-lg"
        >
          Post a Job
        </button>
        <button
          onClick={() => router.push('/signup?role=contractor')}
          className="px-8 py-4 bg-white/10 border-2 border-white text-white rounded-lg hover:bg-white/20 transition-colors font-semibold text-lg"
        >
          Become a Contractor
        </button>
      </div>
    </MotionDiv>
  );
}
