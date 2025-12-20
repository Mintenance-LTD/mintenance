'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

interface MessageThread {
  jobId: string;
  jobTitle: string;
  participants: Array<{
    id: string;
    name: string;
    role?: string;
    profile_image_url?: string;
  }>;
  lastMessage?: {
    senderId: string;
    messageText: string;
    messageType?: string;
    content?: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface ConversationList2025Props {
  conversations: MessageThread[];
  currentUserId: string;
  onConversationClick: (conversation: MessageThread) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ConversationList2025({
  conversations,
  currentUserId,
  onConversationClick,
  searchQuery,
  onSearchChange,
}: ConversationList2025Props) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread'>('all');

  const filteredConversations = conversations.filter((c) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const otherParticipant = c.participants.find((p) => p.id !== currentUserId);
      const matchesSearch =
        c.jobTitle.toLowerCase().includes(query) ||
        otherParticipant?.name.toLowerCase().includes(query) ||
        c.lastMessage?.content?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Filter by status
    if (filterStatus === 'unread' && c.unreadCount === 0) {
      return false;
    }

    return true;
  });

  const totalUnread = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MotionDiv
      className="h-full flex flex-col bg-white border-r border-gray-200"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          {totalUnread > 0 && (
            <span className="px-2.5 py-1 bg-teal-600 text-white rounded-full text-xs font-bold">
              {totalUnread}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            onClick={() => setFilterStatus('unread')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === 'unread'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread ({totalUnread})
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Start a conversation by posting a job'}
            </p>
          </div>
        ) : (
          <MotionDiv
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="divide-y divide-gray-100"
          >
            <AnimatePresence>
              {filteredConversations.map((conversation) => {
                const otherParticipant = conversation.participants.find(
                  (p) => p.id !== currentUserId
                );
                const isUnread = conversation.unreadCount > 0;
                const lastMessagePreview = conversation.lastMessage?.content || 'No messages yet';

                return (
                  <MotionButton
                    key={conversation.jobId}
                    variants={staggerItem}
                    layout
                    onClick={() => onConversationClick(conversation)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      isUnread ? 'bg-teal-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {otherParticipant?.profile_image_url ? (
                          <img
                            src={otherParticipant.profile_image_url}
                            alt={otherParticipant.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-teal-700 font-semibold text-sm">
                              {getInitials(otherParticipant?.name || 'U')}
                            </span>
                          </div>
                        )}
                        {isUnread && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {conversation.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name & Time */}
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <h3
                            className={`font-semibold text-sm truncate ${
                              isUnread ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {otherParticipant?.name || 'Unknown'}
                          </h3>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        {/* Job Title */}
                        <p className="text-xs text-teal-600 mb-1 truncate">
                          {conversation.jobTitle}
                        </p>

                        {/* Last Message */}
                        <p
                          className={`text-sm truncate ${
                            isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}
                        >
                          {lastMessagePreview}
                        </p>
                      </div>
                    </div>
                  </MotionButton>
                );
              })}
            </AnimatePresence>
          </MotionDiv>
        )}
      </div>
    </MotionDiv>
  );
}
