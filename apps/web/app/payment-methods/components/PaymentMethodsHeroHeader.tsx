'use client';

import React from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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

interface PaymentMethodsHeroHeaderProps {
  totalMethods: number;
  cardCount: number;
  bankCount: number;
  onAddMethod: () => void;
}

export function PaymentMethodsHeroHeader({
  totalMethods,
  cardCount,
  bankCount,
  onAddMethod,
}: PaymentMethodsHeroHeaderProps) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <CreditCard className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">Payment Methods</h1>
            </div>
            <p className="text-teal-100 text-lg">
              Manage your cards and bank accounts
            </p>
          </div>

          <MotionButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddMethod}
            className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Payment Method
          </MotionButton>
        </div>

        {/* Stats */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
        >
          <MotionDiv variants={staggerItem} className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-teal-100 text-sm mb-1">Total Methods</p>
            <p className="text-3xl font-bold">{totalMethods}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-teal-100 text-sm mb-1">Cards</p>
            <p className="text-3xl font-bold">{cardCount}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-teal-100 text-sm mb-1">Bank Accounts</p>
            <p className="text-3xl font-bold">{bankCount}</p>
          </MotionDiv>
        </MotionDiv>
      </div>
    </MotionDiv>
  );
}
