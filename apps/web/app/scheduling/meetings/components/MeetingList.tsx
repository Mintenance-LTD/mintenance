'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card.unified';
import { Badge } from '@/components/ui/Badge.unified';
import { Button } from '@/components/ui/Button';
import { MapPin, Clock, Calendar, User as UserIcon } from 'lucide-react';
import { ContractorMeeting } from './MeetingScheduler';

interface MeetingListProps {
    userId: string;
    userRole: 'contractor' | 'homeowner';
    onScheduleNew: () => void;
}

export function MeetingList({ userId, userRole, onScheduleNew }: MeetingListProps) {
    const [meetings, setMeetings] = useState<ContractorMeeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

            if (data) {
                // Map DB response to frontend type
                const mappedMeetings: ContractorMeeting[] = data.map((m: any) => ({
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
                    homeowner: m.homeowner,
                    contractor: m.contractor,
                    job: m.job
                }));
                setMeetings(mappedMeetings);
            }
        } catch (error) {
            console.error('Error fetching meetings:', error);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>

            {/* Upcoming Meetings Section */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] }}>
                    <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: 'bold' }}>Upcoming Meetings</h2>
                    <Button onClick={onScheduleNew} variant="primary" size="sm">
                        + Schedule Meeting
                    </Button>
                </div>

                {upcomingMeetings.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-500">
                            <Calendar size={48} style={{ marginBottom: theme.spacing[4], opacity: 0.5 }} />
                            <p>No upcoming meetings scheduled.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div style={{ display: 'grid', gap: theme.spacing[4] }}>
                        {upcomingMeetings.map(meeting => (
                            <MeetingCard key={meeting.id} meeting={meeting} userRole={userRole} />
                        ))}
                    </div>
                )}
            </section>

            {/* Past Meetings Section */}
            {pastMeetings.length > 0 && (
                <section>
                    <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: 'bold', marginBottom: theme.spacing[4] }}>Past Meetings</h2>
                    <div style={{ display: 'grid', gap: theme.spacing[4], opacity: 0.8 }}>
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
        <Card style={{ borderLeft: `4px solid ${isPast ? theme.colors.border : theme.colors.primary}` }}>
            <CardContent className="p-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: theme.spacing[4] }}>

                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                            <Badge variant={isPast ? 'neutral' : 'primary'}>
                                {formatMeetingType(meeting.meetingType)}
                            </Badge>
                            {meeting.status === 'cancelled' && <Badge variant="error">Cancelled</Badge>}
                        </div>

                        <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: 'bold', marginBottom: theme.spacing[1] }}>
                            {meeting.job?.title || 'Untitled Job'}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing[2] }}>
                            <UserIcon size={14} />
                            <span>Meeting with {otherPartyName}</span>
                        </div>

                        {meeting.notes && (
                            <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing[2], fontStyle: 'italic' }}>
                                "{meeting.notes}"
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                            <Calendar size={16} color={theme.colors.primary} />
                            <span style={{ fontWeight: 'bold' }}>
                                {new Date(meeting.scheduledDateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                            <Clock size={16} color={theme.colors.primary} />
                            <span>
                                {new Date(meeting.scheduledDateTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                {' '}({meeting.duration} min)
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                            <MapPin size={16} color={theme.colors.primary} />
                            <span style={{ fontSize: theme.typography.fontSize.sm }}>{meeting.location.address}</span>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}

function formatMeetingType(type: string) {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
