'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ArrowLeft } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface Notification {
  id: string;
  type: 'job' | 'bid' | 'message' | 'payment' | 'system' | 'bid_received' | 'bid_accepted' | 'bid_rejected' | 'job_update' | 'job_viewed' | 'job_nearby' | 'quote_viewed' | 'quote_accepted' | 'project_reminder';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

type FilterType = 'all' | 'unread' | 'jobs' | 'messages' | 'payments';

export default function ContractorNotificationsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch notifications');
        }

        const data = await response.json();

        interface NotificationApiResponse {
          id: string;
          type?: string;
          title?: string;
          message?: string;
          created_at?: string;
          read?: boolean;
          is_read?: boolean;
          action_url?: string;
          link?: string;
          metadata?: Record<string, unknown>;
        }

        // API now returns array directly, not wrapped in notifications property
        const notificationsArray = Array.isArray(data) ? data : (data.notifications || []);
        
        const transformedNotifications: Notification[] = notificationsArray.map((n: NotificationApiResponse) => ({
          id: n.id,
          type: (n.type || 'system') as Notification['type'],
          title: n.title || 'Notification',
          message: n.message || '',
          created_at: n.created_at || new Date().toISOString(),
          is_read: n.is_read ?? n.read ?? false,
          action_url: n.action_url || n.link,
          metadata: n.metadata,
        }));

        setNotifications(transformedNotifications);
      } catch (error) {
        logger.error('Error fetching notifications:', error', [object Object], { service: 'app' });
        toast.error(error instanceof Error ? error.message : 'Failed to load notifications');
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark as read');
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      logger.error('Error marking notification as read:', error', [object Object], { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark all as read');
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      logger.error('Error marking all as read:', error', [object Object], { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to mark all as read');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) return;

    try {
      const deletePromises = notifications.map((n) =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to delete notification ${n.id}`);
          }
          return response;
        })
      );

      const results = await Promise.allSettled(deletePromises);
      
      // Check if any deletions failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        logger.error('Some notifications failed to delete:', failures', [object Object], { service: 'app' });
        toast.error(`${failures.length} notification(s) failed to delete`);
        // Still remove successfully deleted ones from state
        const successfulIds = results
          .map((r, i) => r.status === 'fulfilled' ? notifications[i].id : null)
          .filter(Boolean) as string[];
        setNotifications((prev) => prev.filter((n) => !successfulIds.includes(n.id)));
      } else {
        setNotifications([]);
        toast.success('All notifications cleared');
      }
    } catch (error) {
      logger.error('Error clearing notifications:', error', [object Object], { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to clear all notifications');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete notification');
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      logger.error('Error deleting notification:', error', [object Object], { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  // Redirect if not logged in or not contractor
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'contractor')) {
      router.push('/login?redirect=/contractor/notifications');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user || user.role !== 'contractor') return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'jobs') return n.type === 'job' || n.type === 'bid' || n.type === 'bid_received' || n.type === 'bid_accepted' || n.type === 'job_update' || n.type === 'job_viewed' || n.type === 'job_nearby' || n.type === 'quote_viewed' || n.type === 'quote_accepted' || n.type === 'project_reminder';
    if (filter === 'messages') return n.type === 'message';
    if (filter === 'payments') return n.type === 'payment';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const jobsCount = notifications.filter((n) => n.type === 'job' || n.type === 'bid' || n.type === 'bid_received' || n.type === 'bid_accepted' || n.type === 'job_update' || n.type === 'job_viewed' || n.type === 'job_nearby' || n.type === 'quote_viewed' || n.type === 'quote_accepted' || n.type === 'project_reminder').length;
  const messagesCount = notifications.filter((n) => n.type === 'message').length;
  const paymentsCount = notifications.filter((n) => n.type === 'payment').length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job':
      case 'job_update':
      case 'job_viewed':
      case 'job_nearby':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'bid':
      case 'bid_received':
      case 'bid_accepted':
      case 'quote_viewed':
      case 'quote_accepted':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'message':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'payment':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'project_reminder':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'job':
      case 'job_update':
      case 'job_viewed':
      case 'job_nearby':
        return 'bg-blue-500';
      case 'bid':
      case 'bid_received':
      case 'bid_accepted':
      case 'quote_viewed':
      case 'quote_accepted':
        return 'bg-emerald-500';
      case 'message':
        return 'bg-purple-500';
      case 'payment':
        return 'bg-amber-500';
      case 'project_reminder':
        return 'bg-indigo-500';
      case 'system':
        return 'bg-gray-500';
      default:
        return 'bg-teal-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <ContractorPageWrapper>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => router.push('/contractor/dashboard-enhanced')}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      {/* Hero Header */}
      <MotionDiv
        className="bg-white border border-gray-200 rounded-xl p-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Notifications</h1>
              <p className="text-gray-600 text-lg">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You\'re all caught up!'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Clear All
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all"
                >
                  Mark All as Read
                </button>
              )}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="w-full space-y-6">
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: 'All', value: 'all' as FilterType, count: notifications.length },
                  { label: 'Unread', value: 'unread' as FilterType, count: unreadCount },
                  { label: 'Jobs', value: 'jobs' as FilterType, count: jobsCount },
                  { label: 'Messages', value: 'messages' as FilterType, count: messagesCount },
                  { label: 'Payments', value: 'payments' as FilterType, count: paymentsCount },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                      filter === tab.value
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        filter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </MotionDiv>

            {/* Notifications List */}
            {loadingNotifications ? (
              <LoadingSpinner message="Loading notifications..." />
            ) : filteredNotifications.length === 0 ? (
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-gray-600">
                  {filter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here'}
                </p>
              </MotionDiv>
            ) : (
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <div className="divide-y divide-gray-200">
                  <AnimatePresence mode="popLayout">
                    {filteredNotifications.map((notification) => (
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
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon with color-coded background */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{notification.title}</h3>
                              {!notification.is_read && (
                                <div className="w-3 h-3 bg-teal-600 rounded-full flex-shrink-0 mt-1 animate-pulse" />
                              )}
                            </div>

                            <p className="text-gray-700 mb-3 line-clamp-2">{notification.message}</p>

                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {notification.action_url && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNotificationClick(notification);
                                    }}
                                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                                  >
                                    View
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notification.id);
                                  }}
                                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors"
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
    </ContractorPageWrapper>
  );
}
