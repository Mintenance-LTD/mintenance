'use client';

import React from 'react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import type { AvailabilitySlot } from './types';

interface AvailabilitySettingsProps {
  availability: AvailabilitySlot[];
  updateAvailability: (dayOfWeek: number, field: string, value: unknown) => void;
  handleSaveAvailability: () => void;
  savingAvailability: boolean;
}

export function AvailabilitySettings({
  availability,
  updateAvailability,
  handleSaveAvailability,
  savingAvailability,
}: AvailabilitySettingsProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="bg-white rounded-2xl border border-slate-200 p-8 mt-8 shadow-sm"
    >
      <h2 className="text-xl font-bold text-slate-900 mb-2">Availability Settings</h2>
      <p className="text-sm text-slate-600 mb-8">Set your working hours and availability for each day</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availability.map((slot) => (
          <div key={slot.day} className="p-5 rounded-xl border border-slate-200 hover:border-teal-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900">{slot.day}</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={slot.isAvailable}
                  onChange={(e) => updateAvailability(slot.dayOfWeek, 'isAvailable', e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 shadow-sm"></div>
              </label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateAvailability(slot.dayOfWeek, 'startTime', e.target.value)}
                disabled={!slot.isAvailable}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="text-slate-400">-</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateAvailability(slot.dayOfWeek, 'endTime', e.target.value)}
                disabled={!slot.isAvailable}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-8">
        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveAvailability}
          disabled={savingAvailability}
          className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingAvailability ? 'Saving...' : 'Save Changes'}
        </MotionButton>
      </div>
    </MotionDiv>
  );
}
