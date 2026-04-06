'use client';

import React from 'react';
import { Calendar, Clock, MapPin, Video, Phone } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { Appointment } from './types';

interface UpcomingAppointmentsProps {
  upcomingAppointments: Appointment[];
}

function getTypeIcon(type: Appointment['type']) {
  switch (type) {
    case 'remote':
      return <Video className="w-4 h-4" />;
    case 'onsite':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Phone className="w-4 h-4" />;
  }
}

function getTypeColor(type: Appointment['type']) {
  switch (type) {
    case 'remote':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'onsite':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-purple-100 text-purple-700 border-purple-200';
  }
}

export function UpcomingAppointments({ upcomingAppointments }: UpcomingAppointmentsProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Upcoming</h3>
        <span className="text-sm text-slate-600 font-medium">{upcomingAppointments.length} appointments</span>
      </div>

      <div className="space-y-4">
        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No upcoming appointments</p>
          </div>
        ) : (
          upcomingAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-slate-900 text-sm leading-tight flex-1 pr-2">{appointment.title}</h4>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getTypeColor(appointment.type)}`}>
                  {getTypeIcon(appointment.type)}
                  <span className="capitalize">{appointment.type}</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3 font-medium">{appointment.client}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(appointment.date).toLocaleDateString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {appointment.time} ({appointment.duration})
                </div>
              </div>
              {appointment.location && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{appointment.location}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </MotionDiv>
  );
}
