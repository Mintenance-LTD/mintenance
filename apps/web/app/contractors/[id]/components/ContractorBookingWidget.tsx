'use client';

import { Star, Clock, Shield, Award } from 'lucide-react';

interface ContractorBookingWidgetProps {
  rating: number;
  reviewCount: number;
  avgProjectValue: number;
  responseTime: string;
  yearsExperience: number;
  onRequestQuote: () => void;
  onSendMessage: () => void;
}

export function ContractorBookingWidget({
  rating,
  reviewCount,
  avgProjectValue,
  responseTime,
  yearsExperience,
  onRequestQuote,
  onSendMessage,
}: ContractorBookingWidgetProps) {
  return (
    <div className="sticky top-24">
      <div className="bg-white border border-gray-300 rounded-3xl p-6 shadow-xl">
        <div className="mb-6">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {avgProjectValue > 0
                ? `£${avgProjectValue.toLocaleString()}`
                : 'N/A'}
            </span>
            {avgProjectValue > 0 && (
              <span className="text-gray-600">avg project</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-gray-900 text-gray-900" />
            <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
            <span className="text-gray-600">({reviewCount} reviews)</span>
          </div>
        </div>

        <button
          onClick={onRequestQuote}
          className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all mb-4"
        >
          Request Quote
        </button>

        <button
          onClick={onSendMessage}
          className="w-full py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          Send Message
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-3">Quick facts</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Responds in {responseTime}</p>
                <p className="text-xs text-gray-500">Usually replies quickly</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-teal-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Verified contractor</p>
                <p className="text-xs text-gray-500">ID and credentials checked</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {yearsExperience > 0
                    ? `${yearsExperience} ${yearsExperience === 1 ? 'year' : 'years'} experience`
                    : 'New contractor'}
                </p>
                {yearsExperience > 0 && (
                  <p className="text-xs text-gray-500">
                    Established since {new Date().getFullYear() - yearsExperience}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
