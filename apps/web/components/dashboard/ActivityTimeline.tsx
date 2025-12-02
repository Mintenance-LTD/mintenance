'use client';

import React from 'react';
import Link from 'next/link';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { MotionDiv, MotionSection } from '@/components/ui/MotionDiv';
import {
  Briefcase,
  FileText,
  UserCheck,
  CreditCard,
  CheckCircle2,
  MessageSquare,
  Calendar,
  Bell,
  LucideIcon
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  type: 'job_posted' | 'bid_received' | 'contractor_hired' | 'payment_made' | 'job_completed' | 'message_received' | 'appointment_scheduled' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  href?: string;
  metadata?: {
    amount?: number;
    contractorName?: string;
    jobTitle?: string;
  };
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  maxItems?: number;
}

const eventIcons: Record<TimelineEvent['type'], { icon: LucideIcon; color: string; bgColor: string }> = {
  job_posted: { icon: Briefcase, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  bid_received: { icon: FileText, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  contractor_hired: { icon: UserCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  payment_made: { icon: CreditCard, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  job_completed: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  message_received: { icon: MessageSquare, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  appointment_scheduled: { icon: Calendar, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  notification: { icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export function ActivityTimeline({
  events,
  title = 'Recent Activity',
  subtitle = 'Your latest updates',
  emptyMessage = 'No recent activity',
  maxItems = 10,
}: ActivityTimelineProps) {
  const displayEvents = events.slice(0, maxItems);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <MotionSection
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {/* Timeline */}
      {displayEvents.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      ) : (
        <MotionDiv
          className="space-y-1"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {displayEvents.map((event, index) => {
            const { icon: Icon, color, bgColor } = eventIcons[event.type];

            const EventContent = (
              <MotionDiv
                className={`flex gap-4 p-4 rounded-xl transition-all duration-200 ${
                  event.href ? 'hover:bg-gray-50 cursor-pointer' : ''
                }`}
                variants={staggerItem}
              >
                {/* Icon */}
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  {index < displayEvents.length - 1 && (
                    <div className="absolute top-10 left-1/2 w-0.5 h-8 bg-gray-200 -translate-x-1/2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {event.description}
                      </p>
                      {event.metadata && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {event.metadata.amount && (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                              ${event.metadata.amount.toLocaleString()}
                            </span>
                          )}
                          {event.metadata.contractorName && (
                            <span className="text-xs text-gray-600">
                              {event.metadata.contractorName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                </div>
              </MotionDiv>
            );

            if (event.href) {
              return (
                <Link key={event.id} href={event.href}>
                  {EventContent}
                </Link>
              );
            }

            return <div key={event.id}>{EventContent}</div>;
          })}
        </MotionDiv>
      )}
    </MotionSection>
  );
}
