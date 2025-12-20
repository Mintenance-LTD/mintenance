'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';
import { theme } from '@/lib/theme';
import Logo from '@/app/components/Logo';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { NotificationService, NotificationData } from '@/lib/services/NotificationService';
import type { User, Notification } from '@mintenance/types';

interface NotificationsClientProps {
  user: Pick<User, 'id' | 'role' | 'email'>;
}

export function NotificationsClient({ user }: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showMarkAllDialog, setShowMarkAllDialog] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const [notificationsData, count] = await Promise.all([
        NotificationService.getUserNotifications(user.id),
        NotificationService.getUnreadCount(user.id),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      logger.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'job_update':
        if (notification.data?.jobId) {
          router.push(`/jobs/${notification.data.jobId}`);
        }
        break;
      case 'bid_received':
        // For homeowners, route to the job page. For contractors, route to finance.
        const notificationWithAction = notification as NotificationData & { action_url?: string };
        if (notificationWithAction.action_url) {
          router.push(notificationWithAction.action_url);
        } else if (notification.data?.jobId) {
          router.push(`/jobs/${notification.data.jobId}`);
        } else {
          router.push('/contractor/finance');
        }
        break;
      case 'message_received':
        // Navigate to specific message thread if jobId is available
        if (notification.data?.jobId || (notification as any).action_url?.includes('/messages/')) {
          const jobId = notification.data?.jobId || (notification as any).action_url?.split('/messages/')[1]?.split('?')[0];
          const receiverId = notification.data?.senderId;
          const receiverName = notification.data?.senderName;
          const jobTitle = notification.data?.jobTitle;

          if (jobId) {
            // Build URL with query params for the message thread
            const params = new URLSearchParams();
            if (receiverId) params.set('userId', String(receiverId));
            if (receiverName) params.set('userName', String(receiverName));
            if (jobTitle) params.set('jobTitle', String(jobTitle));

            router.push(`/messages/${jobId}${params.toString() ? `?${params.toString()}` : ''}`);
          } else {
            router.push('/messages');
          }
        } else {
          router.push('/messages');
        }
        break;
      case 'payment_received':
        router.push('/payments');
        break;
      case 'meeting_scheduled':
        router.push('/scheduling/meetings');
        break;
      case 'social_interaction':
        router.push('/contractor/social');
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    setShowMarkAllDialog(true);
  };

  const confirmMarkAllAsRead = async () => {
    if (!user) return;
    await NotificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setShowMarkAllDialog(false);
  };

  const getIconName = (type: NotificationData['type']) => {
    switch (type) {
      case 'job_update':
        return 'briefcase';
      case 'bid_received':
        return 'currencyDollar';
      case 'meeting_scheduled':
        return 'calendar';
      case 'payment_received':
        return 'creditCard';
      case 'message_received':
        return 'messages';
      case 'quote_sent':
        return 'document';
      case 'system':
        return 'info';
      case 'social_interaction':
        return 'users';
      default:
        return 'alert';
    }
  };

  const getPriorityColor = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'high':
        return theme.colors.error;
      case 'normal':
        return theme.colors.primary;
      case 'low':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Logo Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[6],
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
          <span
            style={{
              marginLeft: theme.spacing[3],
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            Mintenance
          </span>
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[6],
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] }}>
            <div>
              <h1
                style={{
                  fontSize: theme.typography.fontSize['3xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  margin: 0,
                  marginBottom: theme.spacing[1],
                }}
              >
                Notifications
              </h1>
              <p
                style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textSecondary,
                  margin: 0,
                }}
              >
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing[3] }}>
              {unreadCount > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  Mark All Read
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <Icon name="refresh" size={16} color={theme.colors.text} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: theme.spacing[6] }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[12] }}>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], marginBottom: theme.spacing[4] }}>🔄</div>
            <p style={{ fontSize: theme.typography.fontSize.lg, color: theme.colors.textSecondary }}>
              Loading notifications...
            </p>
          </div>
        ) : error ? (
          <div
            style={{
              backgroundColor: `${theme.colors.error}15`,
              border: `1px solid ${theme.colors.error}`,
              borderRadius: '16px',
              padding: theme.spacing[6],
              textAlign: 'center',
            }}
          >
            <p style={{ color: theme.colors.error, margin: 0, marginBottom: theme.spacing[4] }}>{error}</p>
            <button
              onClick={handleRefresh}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.error,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[12] }}>
            <div style={{ fontSize: theme.typography.fontSize['4xl'], marginBottom: theme.spacing[4] }}>
              {filter === 'unread' ? '✅' : '🔔'}
            </div>
            <h2
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                marginBottom: theme.spacing[2],
              }}
            >
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h2>
            <p style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>
              {filter === 'unread'
                ? "You've read all your notifications"
                : "You'll see notifications here when there's activity"}
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  backgroundColor: notification.read ? theme.colors.surface : `${theme.colors.primary}05`,
                  borderRadius: '20px',
                  padding: theme.spacing[5],
                  marginBottom: theme.spacing[4],
                  cursor: 'pointer',
                  border: `1px solid ${notification.read ? theme.colors.border : `${theme.colors.primary}30`}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                }}
                onClick={() => handleNotificationClick(notification)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', gap: theme.spacing[4] }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${getPriorityColor(notification.priority)}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <Icon name={getIconName(notification.type)} size={24} color={getPriorityColor(notification.priority)} />
                    {!notification.read && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: theme.colors.error,
                          border: `2px solid ${theme.colors.surface}`,
                        }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.text,
                        margin: 0,
                        marginBottom: theme.spacing[1],
                      }}
                    >
                      {notification.title}
                    </h3>
                    <p
                      style={{
                        fontSize: theme.typography.fontSize.base,
                        color: theme.colors.textSecondary,
                        margin: 0,
                        marginBottom: theme.spacing[2],
                        lineHeight: 1.5,
                      }}
                    >
                      {notification.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                      <Icon name="clock" size={14} color={theme.colors.textSecondary} />
                      <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mark All Read Dialog */}
      <AlertDialog open={showMarkAllDialog} onOpenChange={(open: boolean) => setShowMarkAllDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark All as Read</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark all notifications as read? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAllAsRead}>
              Mark All Read
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
