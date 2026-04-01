'use client';

import React from 'react';
import {
  AlertTriangle,
  Lock,
  Eye,
  UserX,
  Activity,
  Clock,
  MapPin,
  Smartphone,
  Key,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
} from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
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

export interface SecurityEvent {
  id: string;
  type:
    | 'login_attempt'
    | 'password_reset'
    | 'suspicious_activity'
    | 'account_locked'
    | 'data_export';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user: string;
  email: string;
  ipAddress: string;
  location: string;
  device: string;
  timestamp: string;
  status: 'resolved' | 'investigating' | 'flagged';
  description: string;
}

interface SecurityEventsListProps {
  filteredEvents: SecurityEvent[];
  onInvestigate: (id: string) => void;
  onResolve: (id: string) => void;
  isActionPending: boolean;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'low':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return <XCircle className='w-4 h-4' />;
    case 'high':
      return <AlertTriangle className='w-4 h-4' />;
    case 'medium':
      return <AlertCircle className='w-4 h-4' />;
    case 'low':
      return <CheckCircle className='w-4 h-4' />;
    default:
      return <AlertCircle className='w-4 h-4' />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-700';
    case 'investigating':
      return 'bg-blue-100 text-blue-700';
    case 'flagged':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'login_attempt':
      return <Key className='w-4 h-4' />;
    case 'password_reset':
      return <Lock className='w-4 h-4' />;
    case 'suspicious_activity':
      return <AlertTriangle className='w-4 h-4' />;
    case 'account_locked':
      return <UserX className='w-4 h-4' />;
    case 'data_export':
      return <Eye className='w-4 h-4' />;
    default:
      return <Activity className='w-4 h-4' />;
  }
}

export function SecurityEventsList({
  filteredEvents,
  onInvestigate,
  onResolve,
  isActionPending,
}: SecurityEventsListProps) {
  return (
    <>
      <MotionDiv
        variants={staggerContainer}
        initial='hidden'
        animate='visible'
        className='space-y-4'
      >
        {filteredEvents.map((event) => (
          <MotionDiv
            key={event.id}
            variants={staggerItem}
            whileHover={{ y: -2 }}
            className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all'
          >
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-3'>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getSeverityColor(event.severity)}`}
                  >
                    {getSeverityIcon(event.severity)}
                    {event.severity.toUpperCase()}
                  </span>
                  <span className='px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1'>
                    {getTypeIcon(event.type)}
                    {event.type.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                  >
                    {event.status}
                  </span>
                </div>

                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  {event.description}
                </h3>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>User</p>
                    <p className='font-medium text-gray-900'>{event.user}</p>
                    <p className='text-xs text-gray-500'>{event.email}</p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>IP Address</p>
                    <p className='font-medium text-gray-900 font-mono'>
                      {event.ipAddress}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>Location</p>
                    <div className='flex items-center gap-1'>
                      <MapPin
                        className='w-3 h-3 text-gray-500'
                        aria-hidden='true'
                      />
                      <p className='font-medium text-gray-900'>
                        {event.location}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>Device</p>
                    <div className='flex items-center gap-1'>
                      <Smartphone
                        className='w-3 h-3 text-gray-500'
                        aria-hidden='true'
                      />
                      <p className='font-medium text-gray-900'>
                        {event.device}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 text-sm text-gray-600'>
                  <Clock className='w-4 h-4' aria-hidden='true' />
                  <span>{event.timestamp}</span>
                </div>
              </div>

              <div className='flex items-center gap-2 ml-4'>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onInvestigate(event.id)}
                  aria-label={'Investigate event ' + event.id}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2'
                >
                  <Eye className='w-4 h-4' aria-hidden='true' />
                  Investigate
                </MotionButton>
                {event.status !== 'resolved' && (
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onResolve(event.id)}
                    disabled={isActionPending}
                    aria-label={'Resolve event ' + event.id}
                    className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50'
                  >
                    <CheckCircle className='w-4 h-4' aria-hidden='true' />
                    Resolve
                  </MotionButton>
                )}
              </div>
            </div>
          </MotionDiv>
        ))}
      </MotionDiv>

      {filteredEvents.length === 0 && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center'
        >
          <Shield
            className='w-16 h-16 text-gray-400 mx-auto mb-4'
            aria-hidden='true'
          />
          <h3 className='text-xl font-semibold text-gray-900 mb-2'>
            No security events found
          </h3>
          <p className='text-gray-500'>
            Try adjusting your filters or search query
          </p>
        </MotionDiv>
      )}
    </>
  );
}
