import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Briefcase, CreditCard, MessageCircle, FileText, Bell } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'job' | 'payment' | 'message' | 'bid' | 'quote';
  title: string;
  description: string;
  timestamp: string;
  linkText?: string;
  linkHref?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'job':
        return <Briefcase className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'message':
        return <MessageCircle className="h-4 w-4" />;
      case 'bid':
        return <FileText className="h-4 w-4" />;
      case 'quote':
        return <FileText className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 h-full flex flex-col group relative overflow-hidden">
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
      <h2 className="text-subheading-md font-[560] text-gray-900 mb-6">
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p className="text-base font-[460] text-gray-600 mb-2">No recent activity</p>
          <p className="text-sm font-[460] text-gray-500">Your activity will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`flex gap-3 pb-4 ${
                index < activities.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-[560] text-gray-900 mb-1">
                  {activity.title}
                </div>
                <div className="text-sm font-[460] text-gray-700 mb-2 leading-normal">
                  {activity.description}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-[460] text-gray-500">
                    {activity.timestamp}
                  </span>
                  {activity.linkText && activity.linkHref && (
                    <>
                      <span className="text-gray-400">•</span>
                      <Link
                        href={activity.linkHref}
                        className="text-xs font-[560] text-primary-600 hover:text-primary-700 transition-colors duration-200"
                      >
                        {activity.linkText}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

