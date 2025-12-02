'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import Logo from '@/app/components/Logo';
import Link from 'next/link';
import { User } from '@mintenance/types';
import { MeetingScheduler, ContractorMeeting } from './components/MeetingScheduler';
import { MeetingList } from './components/MeetingList';

export default function MeetingsPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showScheduler, setShowScheduler] = useState(false);

    // Set page title
    useEffect(() => {
        document.title = 'Meetings | Mintenance';
    }, []);

    useEffect(() => {
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

    const handleScheduleNew = () => {
        setShowScheduler(true);
    };

    const handleMeetingScheduled = (meeting: ContractorMeeting) => {
        setShowScheduler(false);
        // The list will auto-update due to real-time subscription
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
                maxWidth: '1000px',
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
                        🗓️ Meeting Scheduler
                    </h1>
                    <p style={{
                        fontSize: theme.typography.fontSize.lg,
                        color: theme.colors.textSecondary,
                        margin: 0
                    }}>
                        Coordinate site visits and in-person consultations
                    </p>
                </div>

                {/* Meeting List */}
                <MeetingList
                    userId={currentUser.id}
                    userRole={currentUser.role as 'contractor' | 'homeowner'}
                    onScheduleNew={handleScheduleNew}
                />

                {/* Scheduler Modal */}
                <MeetingScheduler
                    currentUserId={currentUser.id}
                    userRole={currentUser.role as 'contractor' | 'homeowner'}
                    onScheduled={handleMeetingScheduled}
                    onCancel={handleCancelScheduler}
                    isVisible={showScheduler}
                />
            </div>
        </div>
    );
}
