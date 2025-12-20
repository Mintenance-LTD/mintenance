'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { fetchCurrentUser } from '@/lib/auth-client';
import Link from 'next/link';
import { User } from '@mintenance/types';
import { Calendar, Clock, MapPin, Video, Plus, User as UserIcon, X } from 'lucide-react';
import { MeetingScheduler, ContractorMeeting } from './components/MeetingScheduler';
import { MeetingList } from './components/MeetingList';
import toast from 'react-hot-toast';

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
        toast.success('Meeting scheduled successfully!');
    };

    const handleCancelScheduler = () => {
        setShowScheduler(false);
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-600">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Clean Header - Airbnb Style */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900">Meetings</h1>
                            <p className="text-gray-600 mt-1">
                                Manage your site visits and consultations
                            </p>
                        </div>
                        <button
                            onClick={handleScheduleNew}
                            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Schedule Meeting
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
