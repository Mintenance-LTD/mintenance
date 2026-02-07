'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';

interface PaymentsHeaderProps {
  onExport: () => void;
}

export function PaymentsHeader({ onExport }: PaymentsHeaderProps) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </MotionButton>
      </div>
      <p className="text-gray-600">Manage your payments and view transaction history</p>
    </MotionDiv>
  );
}
