'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card.unified';
import { X } from 'lucide-react';
import { User } from '@mintenance/types';

// Mirroring mobile app types
export interface ContractorMeeting {
    id: string;
    jobId: string;
    homeownerId: string;
    contractorId: string;
    scheduledDateTime: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    meetingType: 'site_visit' | 'consultation' | 'work_session';
    location: {
        latitude: number;
        longitude: number;
        address: string;
    };
    duration: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Expanded fields
    homeowner?: User;
    contractor?: User;
    job?: {
        id: string;
        title: string;
        location?: string;
    };
}

interface MeetingSchedulerProps {
    currentUserId: string;
    userRole: 'contractor' | 'homeowner';
    onScheduled: (meeting: ContractorMeeting) => void;
    onCancel: () => void;
    isVisible: boolean;
}

export function MeetingScheduler({
    currentUserId,
    userRole,
    onScheduled,
    onCancel,
    isVisible
}: MeetingSchedulerProps) {
    const [scheduledTime, setScheduledTime] = useState('');
    const [meetingType, setMeetingType] = useState<'site_visit' | 'consultation' | 'work_session'>('site_visit');
    const [duration, setDuration] = useState(60);
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isVisible) {
            fetchJobs();
        }
    }, [isVisible]);

    const fetchJobs = async () => {
        // Fetch active jobs where the user is involved
        let query = supabase
            .from('jobs')
            .select('id, title, location, contractor_id, homeowner_id')
            .eq('status', 'in_progress')
            .limit(10);

        if (userRole === 'contractor') {
            query = query.eq('contractor_id', currentUserId);
        } else {
            query = query.eq('homeowner_id', currentUserId);
        }

        const { data, error } = await query;

        if (data) {
            setJobs(data);
            if (data.length > 0) {
                setSelectedJobId(data[0].id);
                setAddress(data[0].location || '');
            }
        }
    };

    const handleJobChange = (jobId: string) => {
        setSelectedJobId(jobId);
        const job = jobs.find(j => j.id === jobId);
        if (job && job.location) {
            setAddress(job.location);
        }
    };

    const handleSchedule = async () => {
        if (!selectedJobId || !scheduledTime || !address) return;

        setLoading(true);
        try {
            const job = jobs.find(j => j.id === selectedJobId);
            if (!job) throw new Error('Job not found');

            const contractorId = job.contractor_id;
            const homeownerId = job.homeowner_id;

            // Basic geocoding placeholder (in real app, use Google Maps API or similar)
            const location = {
                latitude: 0,
                longitude: 0,
                address: address
            };

            const { data, error } = await supabase
                .from('contractor_meetings')
                .insert({
                    job_id: selectedJobId,
                    homeowner_id: homeownerId,
                    contractor_id: contractorId,
                    scheduled_datetime: new Date(scheduledTime).toISOString(),
                    meeting_type: meetingType,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address,
                    duration: duration,
                    notes: notes,
                    status: 'scheduled',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Map DB response to frontend type
                const newMeeting: ContractorMeeting = {
                    id: data.id,
                    jobId: data.job_id,
                    homeownerId: data.homeowner_id,
                    contractorId: data.contractor_id,
                    scheduledDateTime: data.scheduled_datetime,
                    status: data.status,
                    meetingType: data.meeting_type,
                    location: {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        address: data.address
                    },
                    duration: data.duration,
                    notes: data.notes,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };

                onScheduled(newMeeting);
            }
        } catch (error) {
            console.error('Error scheduling meeting:', error);
            alert('Failed to schedule meeting');
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
            zIndex: 50
        }}>
            <Card style={{ width: '100%', maxWidth: '500px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
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
                    <CardTitle>Schedule Meeting</CardTitle>
                    <CardDescription>Coordinate a site visit or consultation</CardDescription>
                </CardHeader>

                <CardContent>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 'bold' }}>Select Job</label>
                            <select
                                value={selectedJobId}
                                onChange={(e) => handleJobChange(e.target.value)}
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

                        <div>
                            <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 'bold' }}>Meeting Type</label>
                            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                                <Button
                                    variant={meetingType === 'site_visit' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setMeetingType('site_visit')}
                                    style={{ flex: 1 }}
                                >
                                    Site Visit
                                </Button>
                                <Button
                                    variant={meetingType === 'consultation' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setMeetingType('consultation')}
                                    style={{ flex: 1 }}
                                >
                                    Consultation
                                </Button>
                                <Button
                                    variant={meetingType === 'work_session' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setMeetingType('work_session')}
                                    style={{ flex: 1 }}
                                >
                                    Work Session
                                </Button>
                            </div>
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

                        <Input
                            label="Duration (minutes)"
                            type="number"
                            value={duration.toString()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(Number(e.target.value))}
                            min="15"
                            step="15"
                        />

                        <Input
                            label="Location Address"
                            value={address}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                            placeholder="123 Main St, London"
                        />

                        <div>
                            <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 'bold' }}>Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: theme.spacing[2],
                                    borderRadius: theme.borderRadius.md,
                                    border: `1px solid ${theme.colors.border}`,
                                    fontFamily: 'inherit'
                                }}
                                placeholder="Any specific instructions or agenda..."
                            />
                        </div>

                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSchedule}
                            disabled={loading || !selectedJobId || !scheduledTime || !address}
                        >
                            {loading ? 'Scheduling...' : 'Schedule Meeting'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
