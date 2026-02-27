'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MoreVertical, Briefcase, CheckCheck } from 'lucide-react';
import type { Conversation } from './messagesTypes';
import { formatTime, getInitials } from './messagesTypes';

interface ConversationSidebarProps {
  loading: boolean;
  conversations: Conversation[];
  selectedConversationId: string | null;
  searchQuery: string;
  filter: 'all' | 'unread' | 'archived';
  onSelectConversation: (conv: Conversation) => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: 'all' | 'unread' | 'archived') => void;
}

export function ConversationSidebar({
  loading,
  conversations,
  selectedConversationId,
  searchQuery,
  filter,
  onSelectConversation,
  onSearchChange,
  onFilterChange,
}: ConversationSidebarProps) {
  return (
    <div className="w-[380px] border-r border-slate-200 flex flex-col bg-slate-50">
      {/* Sidebar Header */}
      <div className="p-8 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
          <button className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all">
            <MoreVertical className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex gap-3 mt-6">
          {(['all', 'unread', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-6 bg-white rounded-2xl animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-slate-200 rounded-2xl mb-3 w-3/4" />
                  <div className="h-3 bg-slate-200 rounded-2xl w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-2">No conversations found</p>
            <p className="text-xs text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            <AnimatePresence>
              {conversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full p-6 flex items-start gap-4 rounded-2xl transition-all ${
                    selectedConversationId === conv.id
                      ? 'bg-white shadow-sm border border-teal-100'
                      : 'bg-white hover:shadow-xl border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {conv.otherUser.avatar ? (
                      <Image src={conv.otherUser.avatar} alt={conv.otherUser.name} width={48} height={48} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{getInitials(conv.otherUser.name)}</span>
                      </div>
                    )}
                    {conv.otherUser.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-teal-500 rounded-full flex items-center justify-center px-1.5 shadow-sm">
                        <span className="text-white text-xs font-semibold">{conv.unreadCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h3 className="font-semibold text-sm text-slate-900 truncate">{conv.otherUser.name}</h3>
                      <span className="text-xs text-slate-500 flex-shrink-0 font-medium">{formatTime(conv.lastMessage.timestamp)}</span>
                    </div>
                    {conv.jobTitle && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        <p className="text-xs text-teal-600 font-medium truncate">{conv.jobTitle}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <p className={`text-sm truncate flex-1 ${conv.unreadCount > 0 ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                        {conv.lastMessage.text}
                      </p>
                      {conv.lastMessage.read && conv.unreadCount === 0 && (
                        <CheckCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
