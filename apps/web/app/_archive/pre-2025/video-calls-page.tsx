'use client';

import React, { useState } from 'react';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import Link from 'next/link';
import { User } from '@mintenance/types';
import { VideoCallInterface } from './components/VideoCallInterface';
import { VideoCallHistory } from './components/VideoCallHistory';
import { VideoCallScheduler, DBVideoCall } from './components/VideoCallScheduler';

export default function VideoCallsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeCall, setActiveCall] = useState<DBVideoCall | null>(null);

  // Set page title
  React.useEffect(() => {
    document.title = 'Video Calls | Mintenance';
  }, []);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        logger.error('Failed to load user:', error);
      }
    };

    loadUser();
  }, []);

  const handleScheduleCall = () => {
    setShowScheduler(true);
  };

  const handleCallScheduled = (call: DBVideoCall) => {
    setShowScheduler(false);
    // Optionally start the call immediately if it's an instant call
    if (!call.scheduled_time || new Date(call.scheduled_time) <= new Date()) {
      setActiveCall(call);
    }
  };

  const handleJoinCall = (call: DBVideoCall) => {
    setActiveCall(call);
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const handleCancelScheduler = () => {
    setShowScheduler(false);
  };

  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background
      }}>
        <div style={{
          textAlign: 'center',
          color: theme.colors.textSecondary
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Show active call interface
  if (activeCall) {
    return (
      <VideoCallInterface
        call={activeCall}
        currentUserId={currentUser.id}
        onEndCall={handleEndCall}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.background
    }}>
      {/* Logo Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary
          }}>
            Mintenance
          </span>
        </Link>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.xl
      }}>
        {/* Header */}
        <div style={{
          marginBottom: theme.spacing.xl,
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.sm
          }}>
            📹 Video Calls
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            Schedule and manage your video consultations with contractors
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.xl
        }}>
          {/* Schedule New Call */}
          <div
            onClick={handleScheduleCall}
            style={{
              padding: theme.spacing.xl,
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              border: `2px dashed ${theme.colors.primary}`,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              fontSize: theme.typography.fontSize['3xl'],
              marginBottom: theme.spacing.md
            }}>
              📅
            </div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
              marginBottom: theme.spacing.xs
            }}>
              Schedule New Call
            </h3>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0
            }}>
              Set up a video consultation with a contractor
            </p>
          </div>

          {/* Quick Stats */}
          <div style={{
            padding: theme.spacing.xl,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['3xl'],
              marginBottom: theme.spacing.md
            }}>
              📊
            </div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs
            }}>
              Call Analytics
            </h3>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0
            }}>
              View your call history and insights
            </p>
          </div>

          {/* Quick Join */}
          <div style={{
            padding: theme.spacing.xl,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['3xl'],
              marginBottom: theme.spacing.md
            }}>
              🚀
            </div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs
            }}>
              Quick Join
            </h3>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0
            }}>
              Join an active call with a call ID
            </p>
          </div>
        </div>

        {/* Call History */}
        <VideoCallHistory
          userId={currentUser.id}
          onScheduleNew={handleScheduleCall}
          onJoinCall={handleJoinCall}
        />

        {/* Scheduler Modal */}
        <VideoCallScheduler
          currentUserId={currentUser.id}
          onScheduled={handleCallScheduled}
          onCancel={handleCancelScheduler}
          isVisible={showScheduler}
        />

        {/* Features Info */}
        <div style={{
          marginTop: theme.spacing.xl,
          padding: theme.spacing.xl,
          backgroundColor: `${theme.colors.info}10`,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.info}`
        }}>
          <h3 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.info,
            marginBottom: theme.spacing.md
          }}>
            💡 Video Call Features
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: theme.spacing.md,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.info
          }}>
            <div>📹 HD Video & Audio Quality</div>
            <div>🖥️ Screen Sharing Capabilities</div>
            <div>📼 Call Recording (Optional)</div>
            <div>📱 Mobile & Desktop Support</div>
            <div>🔒 End-to-End Encryption</div>
            <div>⚡ Real-time Quality Monitoring</div>
          </div>
        </div>
      </div>
    </div>
  );
}