'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { theme } from '@/lib/theme';
import Link from 'next/link';

interface AdminNotification {
  id: string;
  type: 'verification' | 'security' | 'revenue' | 'user';
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read: boolean;
}

interface AdminNotificationBellProps {
  userId: string;
}

export function AdminNotificationBell({ userId }: AdminNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      // Fetch pending verifications count
      const verificationsRes = await fetch('/api/admin/notifications/pending-verifications');
      const verificationsData = await verificationsRes.ok ? await verificationsRes.json() : { count: 0 };

      const newNotifications: AdminNotification[] = [];

      if (verificationsData.count > 0) {
        newNotifications.push({
          id: 'pending-verifications',
          type: 'verification',
          title: 'Pending Verifications',
          message: `${verificationsData.count} contractor${verificationsData.count !== 1 ? 's' : ''} awaiting verification`,
          href: '/admin/users',
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'verification':
        return 'userCheck';
      case 'security':
        return 'shield';
      case 'revenue':
        return 'trendingUp';
      case 'user':
        return 'users';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: AdminNotification['type']) => {
    switch (type) {
      case 'verification':
        return '#F59E0B';
      case 'security':
        return '#EF4444';
      case 'revenue':
        return '#10B981';
      case 'user':
        return '#3B82F6';
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Notification Bell Button */}
      <button
        type="button"
        aria-label="Admin Notifications"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: theme.borderRadius.full,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Icon name="bell" size={20} color="#FFFFFF" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.full,
              backgroundColor: '#EF4444',
              color: 'white',
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.bold,
              padding: '0 4px',
              border: '2px solid #0F172A',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxHeight: '500px',
            backgroundColor: '#FFFFFF',
            borderRadius: theme.borderRadius.lg,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: `1px solid ${theme.colors.border}`,
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: theme.spacing[4],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '400px',
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: theme.spacing[8],
                textAlign: 'center',
                color: theme.colors.textSecondary,
              }}>
                <Icon name="bell" size={48} color={theme.colors.textTertiary} />
                <p style={{
                  marginTop: theme.spacing[2],
                  fontSize: theme.typography.fontSize.sm,
                }}>
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const NotificationContent = (
                  <div
                    style={{
                      padding: theme.spacing[4],
                      borderBottom: `1px solid ${theme.colors.border}`,
                      backgroundColor: notification.read ? '#FFFFFF' : '#F9FAFB',
                      cursor: notification.href ? 'pointer' : 'default',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notification.read ? '#FFFFFF' : '#F9FAFB';
                    }}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: theme.spacing[3],
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: `${getNotificationColor(notification.type)}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon
                          name={getNotificationIcon(notification.type)}
                          size={20}
                          color={getNotificationColor(notification.type)}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: theme.spacing[1],
                        }}>
                          <h4 style={{
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.textPrimary,
                            margin: 0,
                          }}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#3B82F6',
                              flexShrink: 0,
                              marginLeft: theme.spacing[2],
                            }} />
                          )}
                        </div>
                        <p style={{
                          fontSize: theme.typography.fontSize.xs,
                          color: theme.colors.textSecondary,
                          margin: 0,
                          marginBottom: theme.spacing[1],
                        }}>
                          {notification.message}
                        </p>
                        <span style={{
                          fontSize: theme.typography.fontSize.xs,
                          color: theme.colors.textTertiary,
                        }}>
                          {new Date(notification.createdAt).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                if (notification.href) {
                  return (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {NotificationContent}
                    </Link>
                  );
                }

                return <div key={notification.id}>{NotificationContent}</div>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

