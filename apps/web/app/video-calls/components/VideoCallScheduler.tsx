'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card.unified';
import { X } from 'lucide-react';

// Local type matching DB schema
export interface DBVideoCall {
    id: string;
    job_id: string;
    initiator_id: string;
    participants: string[];
    status: string;
    scheduled_time?: string;
    metadata?: any;
    created_at: string;
}

interface VideoCallSchedulerProps {
    currentUserId: string;
    onScheduled: (call: DBVideoCall) => void;
    onCancel: () => void;
    isVisible: boolean;
    initialJobId?: string;
}

export function VideoCallScheduler({
    currentUserId,
    onScheduled,
    onCancel,
    isVisible,
    initialJobId
}: VideoCallSchedulerProps) {
    const [scheduledTime, setScheduledTime] = useState('');
    const [purpose, setPurpose] = useState('consultation');
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isVisible) {
            fetchJobs();
        }
    }, [isVisible]);

    const fetchJobs = async () => {
        const { data, error } = await supabase
            .from('jobs')
            .select('id, title, contractor_id, client_id') // client_id might be homeowner_id in DB?
            // Checking types/index.ts: homeowner_id is the field.
            // But let's check if I can select homeowner_id aliased or just check both.
            // I'll select * to be safe or check the type definition again.
            // Type says: homeowner_id.
            .select('id, title, contractor_id, homeowner_id')
            .eq('status', 'in_progress')
            .limit(10);

        if (data) {
            setJobs(data);
            if (initialJobId && data.some(j => j.id === initialJobId)) {
                setSelectedJobId(initialJobId);
            } else if (data.length > 0) {
                setSelectedJobId(data[0].id);
            }
        }
    };

    const handleSchedule = async () => {
        if (!selectedJobId || !scheduledTime) return;

        setLoading(true);
        try {
            const job = jobs.find(j => j.id === selectedJobId);
            if (!job) throw new Error('Job not found');

            // Determine the other participant
            // If current user is contractor, other is homeowner.
            const otherParticipantId = job.contractor_id === currentUserId ? job.homeowner_id : job.contractor_id;

            const { data, error } = await supabase
                .from('video_calls')
                .insert({
                    job_id: selectedJobId,
                    initiator_id: currentUserId,
                    participants: [currentUserId, otherParticipantId],
                    status: 'scheduled',
                    scheduled_time: new Date(scheduledTime).toISOString(),
                    metadata: {
                        callPurpose: purpose,
                    },
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                onScheduled(data as DBVideoCall);
            }
        } catch (error) {
            console.error('Error scheduling call:', error);
            alert('Failed to schedule call');
        } finally {
            setLoading(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40
        }}>
            <Card style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                <button
                    onClick={onCancel}
                    style={{
                        position: 'absolute',
                        top: theme.spacing[4],
                        right: theme.spacing[4],
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <CardHeader>
                    <CardTitle>Schedule Video Call</CardTitle>
                    <CardDescription>Select a job to meet about</CardDescription>
                </CardHeader>

                <CardContent>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 'bold' }}>Select Job</label>
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: theme.spacing[2],
                                    borderRadius: theme.borderRadius.md,
                                    border: `1px solid ${theme.colors.border}`
                                }}
                            >
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                                {jobs.length === 0 && <option value="">No active jobs found</option>}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontWeight: 'bold' }}>Date & Time</label>
                            <input
                                type="datetime-local"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                style={{
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: `1px solid ${theme.colors.border}`,
                                    width: '100%'
                                }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 'bold' }}>Purpose</label>
                            <select
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: theme.spacing[2],
                                    borderRadius: theme.borderRadius.md,
                                    border: `1px solid ${theme.colors.border}`
                                }}
                            >
                                <option value="consultation">Initial Consultation</option>
                                <option value="progress_update">Progress Update</option>
                                <option value="problem_discussion">Problem Discussion</option>
                                <option value="final_walkthrough">Final Walkthrough</option>
                            </select>
                        </div>

                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSchedule}
                            disabled={loading || !selectedJobId || !scheduledTime}
                        >
                            {loading ? 'Scheduling...' : 'Schedule Call'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
