import React from 'react';
import Link from 'next/link';
import { FileText, MessageSquare, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'job_posted' | 'bid_received';
  title: string;
  description: string;
  timestamp: string;
  href: string;
  amount?: number;
  contractorName?: string;
}

interface AirbnbActivityTimelineProps {
  events: TimelineEvent[];
}

export function AirbnbActivityTimeline({ events }: AirbnbActivityTimelineProps) {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    if (type === 'job_posted') return FileText;
    if (type === 'bid_received') return MessageSquare;
    return Clock;
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No recent activity</h3>
        <p className="text-sm text-gray-600">Your activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Recent Activity</h2>
        <Clock className="w-6 h-6 text-gray-400" />
      </div>

      <div className="space-y-4">
        {events.map((event, index) => {
          const Icon = getIcon(event.type);
          const isLast = index === events.length - 1;

          return (
            <Link key={event.id} href={event.href} className="block group">
              <div className="flex gap-4">
                {/* Icon with Timeline */}
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === 'job_posted'
                      ? 'bg-blue-50'
                      : 'bg-teal-50'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      event.type === 'job_posted'
                        ? 'text-blue-600'
                        : 'text-teal-600'
                    }`} />
                  </div>
                  {!isLast && (
                    <div className="absolute left-1/2 top-10 bottom-0 w-px bg-gray-200 transform -translate-x-1/2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                        {event.description}
                      </p>
                      {event.contractorName && (
                        <p className="text-sm text-gray-500 mb-1">
                          from {event.contractorName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(event.timestamp)}
                      </p>
                    </div>
                    {event.amount && (
                      <div className="text-base font-semibold text-gray-900 flex-shrink-0">
                        £{event.amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
