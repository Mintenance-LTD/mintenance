'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { LoadingSpinner } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import toast from 'react-hot-toast';
import { MotionArticle, MotionDiv } from '@/components/ui/MotionDiv';

interface VideoCall {
  id: string;
  title: string;
  scheduled_time?: string;
  duration_minutes: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  room_id?: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }>;
  job_id?: string;
  job_title?: string;
  created_at: string;
}

export default function VideoCallsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [newCall, setNewCall] = useState({
    title: '',
    scheduled_time: '',
    duration_minutes: 30,
    participant_id: '',
  });

  // Fetch calls
  useEffect(() => {
    if (!user) return;

    const fetchCalls = async () => {
      try {
        const response = await fetch('/api/video-calls');
        if (!response.ok) throw new Error('Failed to fetch calls');

        const data = await response.json();

        interface VideoCallApiResponse {
          id: string;
          title: string;
          scheduled_time?: string;
          duration_minutes: number;
          status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
          room_id?: string;
          participants?: Array<{
            id: string;
            name: string;
            avatar?: string;
            role: string;
          }>;
          job_id?: string;
          job_title?: string;
          created_at: string;
        }

        const transformedCalls: VideoCall[] = (data.calls || []).map((c: VideoCallApiResponse) => ({
          id: c.id,
          title: c.title,
          scheduled_time: c.scheduled_time,
          duration_minutes: c.duration_minutes,
          status: c.status,
          room_id: c.room_id,
          participants: c.participants || [],
          job_id: c.job_id,
          job_title: c.job_title,
          created_at: c.created_at,
        }));

        setCalls(transformedCalls);
      } catch (error) {
        toast.error('Failed to load video calls');
      } finally {
        setLoadingCalls(false);
      }
    };

    fetchCalls();
  }, [user]);

  const handleScheduleCall = async () => {
    if (!newCall.title || !newCall.participant_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/video-calls/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCall),
      });

      if (!response.ok) throw new Error('Failed to schedule call');

      toast.success('Video call scheduled successfully!');
      setShowScheduler(false);
      setNewCall({ title: '', scheduled_time: '', duration_minutes: 30, participant_id: '' });
      window.location.reload();
    } catch (error) {
      toast.error('Failed to schedule call');
    }
  };

  const handleJoinCall = (callId: string) => {
    router.push(`/video-calls/${callId}`);
  };

  const handleCancelCall = async (callId: string) => {
    if (!confirm('Are you sure you want to cancel this call?')) return;

    try {
      const response = await fetch(`/api/video-calls/${callId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to cancel call');

      toast.success('Call cancelled');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to cancel call');
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/video-calls');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // Filter calls
  const now = new Date();
  const filteredCalls = calls.filter((call) => {
    if (filter === 'upcoming') {
      return call.status === 'scheduled' && (!call.scheduled_time || new Date(call.scheduled_time) > now);
    }
    if (filter === 'past') {
      return call.status === 'completed' || call.status === 'cancelled';
    }
    return true;
  });

  // Stats
  const upcomingCount = calls.filter(c => c.status === 'scheduled').length;
  const completedCount = calls.filter(c => c.status === 'completed').length;
  const totalMinutes = calls
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + c.duration_minutes, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-600';
      case 'ongoing': return 'bg-emerald-100 text-emerald-700 border-emerald-600';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-600';
      case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-600';
      default: return 'bg-gray-100 text-gray-700 border-gray-600';
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole={user.role}
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: 'profile_image_url' in user ? (user.profile_image_url as string | undefined) : undefined,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">Video Calls</h1>
                <p className="text-teal-100 text-lg">Schedule and manage video consultations</p>
              </div>

              <button
                onClick={() => setShowScheduler(true)}
                className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Schedule Call
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Calls', value: calls.length, icon: '📹' },
                { label: 'Upcoming', value: upcomingCount, icon: '📅' },
                { label: 'Completed', value: completedCount, icon: '✅' },
                { label: 'Total Minutes', value: totalMinutes, icon: '⏱️' },
              ].map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-teal-100 text-sm">{stat.label}</div>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Filter:</span>
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Upcoming', value: 'upcoming' },
                  { label: 'Past', value: 'past' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value as 'all' | 'upcoming' | 'past')}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                      filter === tab.value
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </MotionDiv>

            {/* Calls List */}
            {loadingCalls ? (
              <LoadingSpinner message="Loading calls..." />
            ) : filteredCalls.length === 0 ? (
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No video calls</h3>
                <p className="text-gray-600 mb-6">Schedule a call to get started</p>
                <button
                  onClick={() => setShowScheduler(true)}
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                >
                  Schedule Your First Call
                </button>
              </MotionDiv>
            ) : (
              <MotionDiv
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {filteredCalls.map((call) => (
                  <MotionArticle
                    key={call.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                    variants={cardHover}
                    initial="rest"
                    whileHover="hover"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{call.title}</h3>
                          {call.job_title && (
                            <p className="text-sm text-gray-600 mb-2">Job: {call.job_title}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(call.status)}`}>
                          {call.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 mb-4">
                        {call.scheduled_time && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(call.scheduled_time).toLocaleString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Duration: {call.duration_minutes} minutes
                        </div>
                      </div>

                      {/* Participants */}
                      {call.participants.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2">Participants</p>
                          <div className="flex items-center gap-2">
                            {call.participants.slice(0, 3).map((participant) => (
                              <div
                                key={participant.id}
                                className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center"
                              >
                                {participant.avatar ? (
                                  <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-teal-600 font-semibold">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                            {call.participants.length > 3 && (
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                                +{call.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        {call.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleJoinCall(call.id)}
                              className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
                            >
                              Join Call
                            </button>
                            <button
                              onClick={() => handleCancelCall(call.id)}
                              className="px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-medium hover:bg-rose-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {call.status === 'completed' && call.job_id && (
                          <button
                            onClick={() => router.push(`/jobs/${call.job_id}`)}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                          >
                            View Job
                          </button>
                        )}
                      </div>
                    </div>
                  </MotionArticle>
                ))}
              </MotionDiv>
            )}
          </div>
        </div>

        {/* Schedule Call Modal */}
        <AnimatePresence>
          {showScheduler && (
            <MotionDiv
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScheduler(false)}
            >
              <MotionDiv
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule Video Call</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Call Title <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Property inspection walkthrough"
                      value={newCall.title}
                      onChange={(e) => setNewCall({ ...newCall, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Scheduled Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newCall.scheduled_time}
                      onChange={(e) => setNewCall({ ...newCall, scheduled_time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <select
                      value={newCall.duration_minutes}
                      onChange={(e) => setNewCall({ ...newCall, duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleCall}
                    disabled={!newCall.title}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Schedule Call
                  </button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
