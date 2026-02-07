'use client';

import { PoundSterling } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface BudgetTimelineSectionProps {
  budgetMin: string;
  budgetMax: string;
  startDate: string;
  endDate: string;
  flexible: boolean;
  onInputChange: (field: string, value: string | boolean) => void;
}

export function BudgetTimelineSection({
  budgetMin,
  budgetMax,
  startDate,
  endDate,
  flexible,
  onInputChange,
}: BudgetTimelineSectionProps) {
  return (
    <MotionDiv
      variants={fadeIn}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <PoundSterling className="w-5 h-5 text-teal-600" />
        Budget & Timeline
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Budget (£) *
            </label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => onInputChange('budget.min', e.target.value)}
              min="0"
              step="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Budget (£) *
            </label>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => onInputChange('budget.max', e.target.value)}
              min="0"
              step="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onInputChange('timeline.startDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onInputChange('timeline.endDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="flexible"
            checked={flexible}
            onChange={(e) =>
              onInputChange('timeline.flexible', e.target.checked)
            }
            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <label htmlFor="flexible" className="text-sm text-gray-700">
            Timeline is flexible
          </label>
        </div>
      </div>
    </MotionDiv>
  );
}
