'use client';

import React from 'react';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    online: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    read: boolean;
  };
  jobTitle?: string;
  unreadCount: number;
}

type FilterType = 'all' | 'unread' | 'archived';

interface MessagesConversationSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conv: Conversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  loading: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function MessagesConversationSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  loading,
}: MessagesConversationSidebarProps) {
  const filteredConversations = conversations.filter(conv => {
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    if (filter === 'archived') return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return conv.otherUser.name.toLowerCase().includes(query) ||
             conv.jobTitle?.toLowerCase().includes(query) ||
             conv.lastMessage.text.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="w-[30%] border-r border-gray-200 flex flex-col">
      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'unread', 'archived'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => onFilterChange(filterOption)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === filterOption
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 mb-2 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm text-gray-500">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-gray-100' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {conv.otherUser.avatar ? (
                  <img
                    src={conv.otherUser.avatar}
                    alt={conv.otherUser.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-700 font-semibold text-sm">
                      {getInitials(conv.otherUser.name)}
                    </span>
                  </div>
                )}
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">
                    {conv.otherUser.name}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTime(conv.lastMessage.timestamp)}
                  </span>
                </div>
                {conv.jobTitle && (
                  <p className="text-xs text-teal-600 mb-0.5 truncate">{conv.jobTitle}</p>
                )}
                <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  {conv.lastMessage.text}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
