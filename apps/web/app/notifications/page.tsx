'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { LoadingSpinner } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Notification {
  id: string;
  type: 'job' | 'bid' | 'message' | 'payment' | 'system';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

export default function NotificationsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (!response.ok) throw new Error('Failed to fetch notifications');

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
          metadata?: Record<string, unknown>;
        }

        const transformedNotifications: Notification[] = (data.notifications || []).map((n: NotificationApiResponse) => ({
          id: n.id,
          type: n.type || 'system',
          title: n.title || 'Notification',
          message: n.message,
          created_at: n.created_at,
          is_read: n.is_read ?? n.read ?? false,
          action_url: n.action_url,
          metadata: n.metadata,
        }));

        setNotifications(transformedNotifications);
      } catch (error) {
        toast.error('Failed to load notifications');
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
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
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

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/notifications');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job': return '📋';
      case 'bid': return '💰';
      case 'message': return '💬';
      case 'payment': return '💳';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'job': return 'bg-blue-100 text-blue-700';
      case 'bid': return 'bg-emerald-100 text-emerald-700';
      case 'message': return 'bg-purple-100 text-purple-700';
      case 'payment': return 'bg-amber-100 text-amber-700';
      case 'system': return 'bg-gray-100 text-gray-700';
      default: return 'bg-teal-100 text-teal-700';
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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole={user.role}
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: (user as any).profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1200px] mx-auto px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Notifications</h1>
                <p className="text-teal-100 text-lg">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You\'re all caught up!'}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
                >
                  Mark All as Read
                </button>
              )}
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1200px] mx-auto px-8 py-8 w-full">
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Filter:</span>
                {[
                  { label: 'All', value: 'all', count: notifications.length },
                  { label: 'Unread', value: 'unread', count: unreadCount },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value as any)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                      filter === tab.value
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        filter === tab.value ? 'bg-white/20' : 'bg-gray-200'
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
                        className={`p-6 cursor-pointer transition-colors ${
                          !notification.is_read ? 'bg-teal-50 hover:bg-teal-100' : 'hover:bg-gray-50'
                        }`}
                        variants={staggerItem}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                            <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{notification.title}</h3>
                              {!notification.is_read && (
                                <div className="w-3 h-3 bg-teal-600 rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>

                            <p className="text-gray-700 mb-3">{notification.message}</p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>{formatTimeAgo(notification.created_at)}</span>
                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getNotificationColor(notification.type)}`}>
                                  {notification.type.toUpperCase()}
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                              >
                                Delete
                              </button>
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
      </main>
    </div>
  );
}
