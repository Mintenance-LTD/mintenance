'use client';

/**
 * Legacy /notifications view extracted from page.tsx so the parent
 * page stays under the 500-line MDC cap. Pure presentation — the
 * page owns data fetching, realtime subscription, and mutations.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { LoadingSpinner } from '@/components/ui';
import {
  fadeIn,
  staggerContainer,
  staggerItem,
} from '@/lib/animations/variants';
import {
  getNotificationColor,
  getNotificationIcon,
} from './notification-icons';
import type {
  FilterType,
  NotificationItem,
} from './MintEditorialNotifications';

interface Counts {
  all: number;
  unread: number;
  jobs: number;
  messages: number;
  payments: number;
}

interface Props {
  notifications: NotificationItem[];
  loading: boolean;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  counts: Counts;
  onClickNotification: (n: NotificationItem) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

const TABS: { id: FilterType; label: string; key: keyof Counts }[] = [
  { id: 'all', label: 'All', key: 'all' },
  { id: 'unread', label: 'Unread', key: 'unread' },
  { id: 'jobs', label: 'Jobs', key: 'jobs' },
  { id: 'messages', label: 'Messages', key: 'messages' },
  { id: 'payments', label: 'Payments', key: 'payments' },
];

function formatTimeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function filteredList(
  notifications: NotificationItem[],
  filter: FilterType
): NotificationItem[] {
  if (filter === 'unread') return notifications.filter((n) => !n.is_read);
  if (filter === 'jobs')
    return notifications.filter((n) => n.type === 'job' || n.type === 'bid');
  if (filter === 'messages')
    return notifications.filter((n) => n.type === 'message');
  if (filter === 'payments')
    return notifications.filter((n) => n.type === 'payment');
  return notifications;
}

export function LegacyNotificationsView({
  notifications,
  loading,
  filter,
  onFilterChange,
  counts,
  onClickNotification,
  onMarkAllRead,
  onClearAll,
  onDelete,
}: Props) {
  const router = useRouter();
  const visible = filteredList(notifications, filter);

  return (
    <>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4'
      >
        <ArrowLeft className='w-5 h-5' />
        <span className='font-medium'>Back to Dashboard</span>
      </button>

      {/* Hero Header */}
      <MotionDiv
        className='bg-white border border-gray-200 rounded-xl p-8 mb-6'
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className='max-w-full'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-4xl font-bold mb-2 text-gray-900'>
                Notifications
              </h1>
              <p className='text-gray-600 text-lg'>
                {counts.unread > 0
                  ? `${counts.unread} unread notification${counts.unread === 1 ? '' : 's'}`
                  : "You're all caught up!"}
              </p>
            </div>
            <div className='flex items-center gap-3'>
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className='px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all'
                >
                  Clear All
                </button>
              )}
              {counts.unread > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className='px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all'
                >
                  Mark All as Read
                </button>
              )}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className='w-full space-y-6'>
        <div className='flex flex-col gap-6'>
          {/* Filters */}
          <MotionDiv
            className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'
            variants={fadeIn}
            initial='initial'
            animate='animate'
          >
            <div className='flex items-center gap-3 flex-wrap'>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onFilterChange(tab.id)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    filter === tab.id
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        filter === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Notifications List */}
          {loading ? (
            <LoadingSpinner message='Loading notifications...' />
          ) : visible.length === 0 ? (
            <MotionDiv
              className='bg-white rounded-2xl border border-gray-200 p-12 text-center'
              variants={fadeIn}
              initial='initial'
              animate='animate'
            >
              <div className='w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-10 h-10 text-teal-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                {filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications'}
              </h3>
              <p className='text-gray-600'>
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications will appear here'}
              </p>
            </MotionDiv>
          ) : (
            <MotionDiv
              className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'
              variants={staggerContainer}
              initial='initial'
              animate='animate'
            >
              <div className='divide-y divide-gray-200'>
                <AnimatePresence mode='popLayout'>
                  {visible.map((notification) => (
                    <MotionDiv
                      key={notification.id}
                      className={`p-6 cursor-pointer transition-all border-l-4 ${
                        !notification.is_read
                          ? 'bg-teal-50/50 hover:bg-teal-50 border-l-teal-600'
                          : 'bg-white hover:bg-gray-50 border-l-transparent'
                      }`}
                      variants={staggerItem}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => onClickNotification(notification)}
                    >
                      <div className='flex items-start gap-4'>
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${getNotificationColor(notification.type)}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-4 mb-2'>
                            <h3 className='text-lg font-semibold text-gray-900'>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <div className='w-3 h-3 bg-teal-600 rounded-full flex-shrink-0 mt-1 animate-pulse' />
                            )}
                          </div>
                          <p className='text-gray-700 mb-3 line-clamp-2'>
                            {notification.message}
                          </p>
                          <div className='flex items-center justify-between gap-4 flex-wrap'>
                            <div className='flex items-center gap-3 text-sm text-gray-500'>
                              <span className='flex items-center gap-1'>
                                <svg
                                  className='w-4 h-4'
                                  fill='none'
                                  viewBox='0 0 24 24'
                                  stroke='currentColor'
                                >
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                                  />
                                </svg>
                                {formatTimeAgo(notification.created_at)}
                              </span>
                            </div>
                            <div className='flex items-center gap-2'>
                              {notification.action_url && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClickNotification(notification);
                                  }}
                                  className='px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors'
                                >
                                  View
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(notification.id);
                                }}
                                className='px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors'
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </AnimatePresence>
              </div>
            </MotionDiv>
          )}
        </div>
      </div>
    </>
  );
}
