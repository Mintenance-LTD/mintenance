'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Connection {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    company?: string;
  };
  connectedAt: string;
  mutualConnections?: number;
}

interface ConnectionRequest {
  id: string;
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    company?: string;
  };
  status: string;
  createdAt: string;
  message?: string;
}

export default function ContractorConnectionsPage2025() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'suggestions'>('connections');

  // Mock data - would come from API
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: '1',
      user: {
        id: 'u1',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'homeowner',
        company: 'ABC Properties',
      },
      connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      mutualConnections: 3,
    },
    {
      id: '2',
      user: {
        id: 'u2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'contractor',
        company: 'Elite Contractors',
      },
      connectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      mutualConnections: 5,
    },
  ]);

  const [requests, setRequests] = useState<ConnectionRequest[]>([
    {
      id: 'r1',
      requester: {
        id: 'u3',
        name: 'Mike Wilson',
        email: 'mike@example.com',
        role: 'homeowner',
      },
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Looking to hire for a kitchen renovation project',
    },
  ]);

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/contractor/accept-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== requestId));
        toast.success('Connection request accepted!');
      } else {
        toast.error('Failed to accept request');
      }
    } catch (error) {
      toast.error('Error accepting request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/contractor/decline-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== requestId));
        toast.success('Connection request declined');
      } else {
        toast.error('Failed to decline request');
      }
    } catch (error) {
      toast.error('Error declining request');
    }
  };

  const stats = [
    { label: 'Total Connections', value: connections.length, icon: '👥' },
    { label: 'Pending Requests', value: requests.length, icon: '📬' },
    { label: 'This Month', value: 3, icon: '📅' },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
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
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Connections</h1>
                <p className="text-teal-100 text-lg">Manage your professional network</p>
              </div>
            </div>

            {/* Stats Grid */}
            <MotionDiv
              className="grid grid-cols-3 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {stats.map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-teal-100 text-sm">{stat.label}</div>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Tabs */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3">
              {[
                { label: 'Connections', value: 'connections' as const, count: connections.length },
                { label: 'Requests', value: 'requests' as const, count: requests.length },
                { label: 'Suggestions', value: 'suggestions' as const, count: 0 },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      activeTab === tab.value ? 'bg-white/20' : 'bg-teal-600 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'connections' && (
              <MotionDiv
                key="connections"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {connections.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No connections yet</h3>
                    <p className="text-gray-600">Start building your professional network</p>
                  </div>
                ) : (
                  <MotionDiv
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {connections.map((connection) => (
                      <MotionDiv
                        key={connection.id}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition-all"
                        variants={cardHover}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                            {connection.user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 mb-1 truncate">{connection.user.name}</h3>
                            <p className="text-sm text-gray-600 mb-1 truncate">{connection.user.email}</p>
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium capitalize">
                              {connection.user.role}
                            </span>
                          </div>
                        </div>

                        {connection.user.company && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Company</p>
                            <p className="text-sm font-medium text-gray-900">{connection.user.company}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <span>Connected {new Date(connection.connectedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          {connection.mutualConnections && connection.mutualConnections > 0 && (
                            <span className="text-teal-600 font-medium">{connection.mutualConnections} mutual</span>
                          )}
                        </div>

                        <button className="w-full px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all">
                          Message
                        </button>
                      </MotionDiv>
                    ))}
                  </MotionDiv>
                )}
              </MotionDiv>
            )}

            {activeTab === 'requests' && (
              <MotionDiv
                key="requests"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {requests.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No pending requests</h3>
                    <p className="text-gray-600">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <MotionDiv
                        key={request.id}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                        variants={fadeIn}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                              {request.requester.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 mb-1">{request.requester.name}</h3>
                              <p className="text-sm text-gray-600 mb-2">{request.requester.email}</p>
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium capitalize mb-3">
                                {request.requester.role}
                              </span>
                              {request.message && (
                                <div className="p-3 bg-gray-50 rounded-lg mt-3">
                                  <p className="text-sm text-gray-700">{request.message}</p>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-3">
                                Requested {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              className="px-6 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(request.id)}
                              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </MotionDiv>
                    ))}
                  </div>
                )}
              </MotionDiv>
            )}

            {activeTab === 'suggestions' && (
              <MotionDiv
                key="suggestions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No suggestions yet</h3>
                  <p className="text-gray-600">Check back later for connection suggestions</p>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
