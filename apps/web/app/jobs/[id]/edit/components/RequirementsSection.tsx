'use client';

import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface RequirementsSectionProps {
  requirements: string[];
  newRequirement: string;
  onNewRequirementChange: (value: string) => void;
  onAddRequirement: () => void;
  onRemoveRequirement: (index: number) => void;
}

export function RequirementsSection({
  requirements,
  newRequirement,
  onNewRequirementChange,
  onAddRequirement,
  onRemoveRequirement,
}: RequirementsSectionProps) {
  return (
    <MotionDiv
      variants={fadeIn}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-teal-600" />
        Requirements
      </h2>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newRequirement}
            onChange={(e) => onNewRequirementChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddRequirement())}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Add a requirement..."
          />
          <button
            type="button"
            onClick={onAddRequirement}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {requirements.length > 0 && (
          <div className="space-y-2">
            {requirements.map((req, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-gray-900">{req}</span>
                <button
                  type="button"
                  onClick={() => onRemoveRequirement(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MotionDiv>
  );
}
