'use client';

import React from 'react';
import { MapPin, Video, Phone, X } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import type { NewAppointmentForm } from './types';

interface NewAppointmentModalProps {
  newAppt: NewAppointmentForm;
  setNewAppt: React.Dispatch<React.SetStateAction<NewAppointmentForm>>;
  onClose: () => void;
  onSave: () => void;
}

export function NewAppointmentModal({ newAppt, setNewAppt, onClose, onSave }: NewAppointmentModalProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900">New Appointment</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Title *</label>
              <input
                type="text"
                placeholder="e.g., Kitchen Consultation"
                value={newAppt.title}
                onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Date *</label>
                <input
                  type="date"
                  value={newAppt.appointmentDate}
                  onChange={(e) => setNewAppt({ ...newAppt, appointmentDate: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={newAppt.startTime}
                  onChange={(e) => setNewAppt({ ...newAppt, startTime: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">End Time *</label>
              <input
                type="time"
                value={newAppt.endTime}
                onChange={(e) => setNewAppt({ ...newAppt, endTime: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Client Name</label>
              <input
                type="text"
                placeholder="Client name"
                value={newAppt.clientName}
                onChange={(e) => setNewAppt({ ...newAppt, clientName: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Appointment Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'onsite' as const, label: 'On-site', icon: MapPin },
                  { type: 'remote' as const, label: 'Video Call', icon: Video },
                  { type: 'phone' as const, label: 'Phone Call', icon: Phone },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      onClick={() => setNewAppt({ ...newAppt, locationType: option.type })}
                      className={`p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
                        newAppt.locationType === option.type
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-slate-200 hover:border-teal-600 hover:bg-teal-50'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Location (Optional)</label>
              <input
                type="text"
                placeholder="Enter address for on-site appointments"
                value={newAppt.locationAddress}
                onChange={(e) => setNewAppt({ ...newAppt, locationAddress: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Notes</label>
              <textarea
                rows={3}
                placeholder="Additional notes or instructions..."
                value={newAppt.notes}
                onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <MotionButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSave}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
              >
                Create Appointment
              </MotionButton>
              <MotionButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
              >
                Cancel
              </MotionButton>
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}
