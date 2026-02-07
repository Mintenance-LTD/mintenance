'use client';

import { MapPin } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface LocationSectionProps {
  address: string;
  city: string;
  postcode: string;
  accessInfo: string;
  onInputChange: (field: string, value: string | boolean) => void;
}

export function LocationSection({
  address,
  city,
  postcode,
  accessInfo,
  onInputChange,
}: LocationSectionProps) {
  return (
    <MotionDiv
      variants={fadeIn}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-teal-600" />
        Location & Access
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => onInputChange('location.address', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="e.g., 45 Customer Road"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => onInputChange('location.city', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., London"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postcode *
            </label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => onInputChange('location.postcode', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., W1A 1AB"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Information
          </label>
          <textarea
            value={accessInfo}
            onChange={(e) => onInputChange('accessInfo', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            placeholder="Provide details about accessing the property..."
          />
        </div>
      </div>
    </MotionDiv>
  );
}
