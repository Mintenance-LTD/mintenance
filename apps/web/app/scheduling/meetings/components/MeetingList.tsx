'use client';

import React, { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card.unified';
import { Badge } from '@/components/ui/Badge.unified';
import { Button } from '@/components/ui/Button';
import { MapPin, Clock, Calendar, User as UserIcon } from 'lucide-react';
import type { User } from '@mintenance/types';
import { ContractorMeeting } from './MeetingScheduler';

interface MeetingListProps {
    userId: string;
    userRole: 'contractor' | 'homeowner';
    onScheduleNew: () => void;
}

export function MeetingList(props: MeetingListProps) {
    // Defensive prop destructuring with defaults to prevent test crashes
    const {
        userId = '',
        userRole = 'homeowner',
        onScheduleNew = () => {},
    } = props || {};

    const [meetings, setMeetings] = useState<ContractorMeeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return; // Guard against empty userId
        fetchMeetings();
        subscribeToMeetings();
    }, [userId]);

    const fetchMeetings = async () => {
        try {
            const roleColumn = userRole === 'homeowner' ? 'homeowner_id' : 'contractor_id';

            const { data, error } = await supabase
                .from('contractor_meetings')
                .select(`
          *,
          homeowner:homeowner_id (
            id, first_name, last_name, email
          ),
          contractor:contractor_id (
            id, first_name, last_name, email
          ),
          job:job_id (
            id, title, location
          )
        `)
                .eq(roleColumn, userId)
                .order('scheduled_datetime', { ascending: true });

            if (error) throw error;

            interface MeetingDbResponse {
                id: string;
                job_id: string;
                homeowner_id: string;
                contractor_id: string;
                scheduled_datetime: string;
                status: string;
                meeting_type: string;
                latitude?: number;
                longitude?: number;
                address?: string;
                duration: number;
                notes?: string;
                created_at: string;
                updated_at: string;
                homeowner?: { id: string; first_name: string; last_name: string; email: string } | Array<{ id: string; first_name: string; last_name: string; email: string }>;
                contractor?: { id: string; first_name: string; last_name: string; email: string } | Array<{ id: string; first_name: string; last_name: string; email: string }>;
                job?: { id: string; title: string; location: string } | Array<{ id: string; title: string; location: string }>;
            }

            if (data) {
                // Map DB response to frontend type
                const mappedMeetings: ContractorMeeting[] = data.map((m: MeetingDbResponse) => ({
                    id: m.id,
                    jobId: m.job_id,
                    homeownerId: m.homeowner_id,
                    contractorId: m.contractor_id,
                    scheduledDateTime: m.scheduled_datetime,
                    status: m.status,
                    meetingType: m.meeting_type,
                    location: {
                        latitude: m.latitude,
                        longitude: m.longitude,
                        address: m.address
                    },
                    duration: m.duration,
                    notes: m.notes,
                    createdAt: m.created_at,
                    updatedAt: m.updated_at,
                    homeowner: (Array.isArray(m.homeowner) ? m.homeowner[0] : m.homeowner) as User | undefined,
                    contractor: (Array.isArray(m.contractor) ? m.contractor[0] : m.contractor) as User | undefined,
                    job: Array.isArray(m.job) ? m.job[0] : m.job
                }));
                setMeetings(mappedMeetings);
            }
        } catch (error) {
            logger.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMeetings = () => {
        const roleColumn = userRole === 'homeowner' ? 'homeowner_id' : 'contractor_id';

        const subscription = supabase
            .channel('meetings_list_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contractor_meetings',
                    filter: `${roleColumn}=eq.${userId}`,
                },
                () => {
                    fetchMeetings();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'primary';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            case 'rescheduled': return 'warning';
            default: return 'neutral';
        }
    };

    const formatMeetingType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return <div style={{ padding: theme.spacing[4], textAlign: 'center' }}>Loading meetings...</div>;
    }

    const upcomingMeetings = meetings.filter(m => new Date(m.scheduledDateTime) >= new Date() && m.status !== 'cancelled');
    const pastMeetings = meetings.filter(m => new Date(m.scheduledDateTime) < new Date() || m.status === 'cancelled');

    return (
        <div className="space-y-8">
            {/* Upcoming Meetings Section */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">Upcoming Meetings</h2>
                </div>

                {upcomingMeetings.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <Calendar size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No upcoming meetings scheduled.</p>
                        <button
                            onClick={onScheduleNew}
                            className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                        >
                            Schedule Your First Meeting
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {upcomingMeetings.map(meeting => (
                            <MeetingCard key={meeting.id} meeting={meeting} userRole={userRole} />
                        ))}
                    </div>
                )}
            </section>

            {/* Past Meetings Section */}
            {pastMeetings.length > 0 && (
                <section>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Past Meetings</h2>
                    <div className="grid gap-4 opacity-75">
                        {pastMeetings.map(meeting => (
                            <MeetingCard key={meeting.id} meeting={meeting} userRole={userRole} isPast />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function MeetingCard({ meeting, userRole, isPast }: { meeting: ContractorMeeting, userRole: string, isPast?: boolean }) {
    const otherParty = userRole === 'contractor' ? meeting.homeowner : meeting.contractor;
    const otherPartyName = otherParty ? `${otherParty.first_name} ${otherParty.last_name}` : 'Unknown User';

    return (
        <div className={`bg-white rounded-xl border-l-4 ${isPast ? 'border-gray-300' : 'border-teal-600'} border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start flex-wrap gap-6">
                <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${isPast ? 'bg-gray-100 text-gray-700' : 'bg-teal-100 text-teal-700'}`}>
                            {formatMeetingType(meeting.meetingType)}
                        </span>
                        {meeting.status === 'cancelled' && (
                            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">
                                Cancelled
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {meeting.job?.title || 'Untitled Job'}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <UserIcon size={16} />
                        <span>Meeting with {otherPartyName}</span>
                    </div>

                    {meeting.notes && (
                        <p className="text-sm text-gray-600 mt-3 italic bg-gray-50 p-3 rounded-lg">
                            "{meeting.notes}"
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-teal-600" />
                        <span className="font-medium text-gray-900">
                            {new Date(meeting.scheduledDateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock size={18} className="text-teal-600" />
                        <span className="text-gray-700">
                            {new Date(meeting.scheduledDateTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            {' '}({meeting.duration} min)
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-teal-600" />
                        <span className="text-sm text-gray-700">{meeting.location.address}</span>
                    </div>

                    {!isPast && (
                        <div className="flex gap-2 mt-2">
                            <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Reschedule
                            </button>
                            <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatMeetingType(type: string) {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
