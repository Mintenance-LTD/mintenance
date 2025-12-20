'use client';

import React, { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.unified';
import { Video, Calendar, Clock } from 'lucide-react';
import { DBVideoCall } from './VideoCallScheduler';

interface VideoCallHistoryProps {
    userId: string;
    onScheduleNew: () => void;
    onJoinCall: (call: DBVideoCall) => void;
}

export function VideoCallHistory({ userId, onScheduleNew, onJoinCall }: VideoCallHistoryProps) {
    const [calls, setCalls] = useState<DBVideoCall[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalls();

        const channel = supabase
            .channel('video_calls_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'video_calls',
                    filter: `participants=cs.{${userId}}`
                },
                () => {
                    fetchCalls();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const fetchCalls = async () => {
        try {
            const { data, error } = await supabase
                .from('video_calls')
                .select('*')
                .contains('participants', [userId])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCalls(data as DBVideoCall[]);
        } catch (error) {
            logger.error('Error fetching calls:', error);
        } finally {
            setLoading(false);
        }
    };

    const isCallActive = (call: DBVideoCall) => {
        if (call.status === 'active') return true;
        if (call.status === 'scheduled' && call.scheduled_time) {
            const now = new Date();
            const scheduled = new Date(call.scheduled_time);
            const diff = (now.getTime() - scheduled.getTime()) / 1000 / 60;
            return diff >= -10 && diff <= 60;
        }
        return false;
    };

    if (loading) return <div>Loading history...</div>;

    return (
        <Card>
            <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CardTitle>Recent Calls</CardTitle>
                    <Button variant="outline" size="sm" onClick={onScheduleNew}>
                        Schedule New
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {calls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>
                        <Video size={48} style={{ marginBottom: theme.spacing[4], opacity: 0.5 }} />
                        <p>No video calls found.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                        {calls.map((call) => (
                            <div
                                key={call.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: theme.spacing[4],
                                    backgroundColor: theme.colors.backgroundSecondary,
                                    borderRadius: theme.borderRadius.md,
                                    borderLeft: `4px solid ${call.status === 'active' ? theme.colors.success :
                                            call.status === 'scheduled' ? theme.colors.primary :
                                                theme.colors.border
                                        }`
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                                        {call.metadata?.callPurpose ? (
                                            <span style={{ textTransform: 'capitalize' }}>
                                                {String(call.metadata.callPurpose).replace('_', ' ')}
                                            </span>
                                        ) : 'Video Call'}
                                        {call.status === 'active' && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 6px',
                                                backgroundColor: theme.colors.success,
                                                color: 'white',
                                                borderRadius: '4px'
                                            }}>
                                                LIVE
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, display: 'flex', gap: theme.spacing[3] }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                                            <Calendar size={14} />
                                            {new Date(call.scheduled_time || call.created_at).toLocaleDateString()}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                                            <Clock size={14} />
                                            {new Date(call.scheduled_time || call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    {isCallActive(call) ? (
                                        <Button variant="primary" size="sm" onClick={() => onJoinCall(call)}>
                                            Join Call
                                        </Button>
                                    ) : (
                                        <span style={{
                                            fontSize: '0.875rem',
                                            color: theme.colors.textSecondary,
                                            textTransform: 'capitalize'
                                        }}>
                                            {call.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
