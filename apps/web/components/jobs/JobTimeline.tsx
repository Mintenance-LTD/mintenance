'use client';

import React from 'react';
import { MotionDiv } from '../ui/MotionDiv';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: 'completed' | 'active' | 'pending';
  icon?: string;
}

interface JobTimelineProps {
  events: TimelineEvent[];
}

export function JobTimeline({ events }: JobTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500 border-emerald-200';
      case 'active':
        return 'bg-teal-500 border-teal-200 animate-pulse';
      case 'pending':
        return 'bg-gray-300 border-gray-200';
      default:
        return 'bg-gray-300 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MotionDiv
      className="relative"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Vertical Line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" aria-hidden="true" />

      {/* Timeline Events */}
      <ol className="relative space-y-6" role="list">
        {events.map((event, index) => (
          <MotionDiv
            key={event.id}
            variants={staggerItem}
            className="relative flex gap-4"
            role="listitem"
          >
            {/* Icon/Status Indicator */}
            <div
              className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${getStatusColor(event.status)}`}
              aria-label={`${event.status} event`}
            >
              {event.icon && (
                <span className="text-xs" aria-hidden="true">
                  {event.icon}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-gray-900">{event.title}</h3>
                <time className="text-xs text-gray-500" dateTime={event.timestamp}>
                  {formatTimestamp(event.timestamp)}
                </time>
              </div>
              {event.description && (
                <p className="text-sm text-gray-600">{event.description}</p>
              )}
            </div>
          </MotionDiv>
        ))}
      </ol>
    </MotionDiv>
  );
}
