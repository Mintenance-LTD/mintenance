'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useCSRF } from '@/lib/hooks/useCSRF';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Archive,
  Trash2,
  Star,
  Clock,
  CheckCheck,
  Briefcase,
  MapPin,
  Calendar,
  Image as ImageIcon,
  X,
} from 'lucide-react';

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

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  created_at: string;
  read: boolean;
}

interface JobContext {
  id: string;
  title: string;
  status: string;
  budget?: number;
  deadline?: string;
}

export function MessagesClient() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { csrfToken } = useCSRF();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadUserAndMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserAndMessages = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Load conversations from real API
      const response = await fetch('/api/messages/threads');
      if (!response.ok) throw new Error('Failed to fetch conversations');

      const data = await response.json();

      // Transform threads to conversations
      const transformedConversations: Conversation[] = (data.threads || []).map((thread: any) => {
        const otherParticipant = thread.participants.find((p: any) => p.id !== currentUser.id);
        return {
          id: thread.jobId,
          otherUser: {
            id: otherParticipant?.id || '',
            name: otherParticipant?.name || 'Unknown User',
            avatar: otherParticipant?.profile_image_url,
            online: false,
          },
          lastMessage: thread.lastMessage ? {
            text: thread.lastMessage.content || thread.lastMessage.messageText || '',
            timestamp: thread.lastMessage.createdAt,
            read: true,
          } : {
            text: 'No messages yet',
            timestamp: new Date().toISOString(),
            read: true,
          },
          jobTitle: thread.jobTitle,
          unreadCount: thread.unreadCount || 0,
        };
      });

      setConversations(transformedConversations);
    } catch (err) {
      logger.error('Error loading messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(`/api/messages/threads/${selectedConversation.id}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();

        const transformedMessages = (data.messages || []).map((msg: any): Message => ({
          id: msg.id,
          sender_id: msg.senderId || msg.sender_id,
          content: msg.content || msg.messageText || '',
          message_type: msg.messageType || msg.message_type || 'text',
          created_at: msg.createdAt || msg.created_at,
          read: msg.read !== undefined ? msg.read : true,
        }));

        setMessages(transformedMessages);

        // Fetch job context
        try {
          const jobResponse = await fetch(`/api/jobs/${selectedConversation.id}`);
          if (jobResponse.ok) {
            const jobData = await jobResponse.json();
            setJobContext({
              id: jobData.job.id,
              title: jobData.job.title,
              status: jobData.job.status,
              budget: jobData.job.budget,
              deadline: jobData.job.deadline,
            });
          }
        } catch (error) {
          logger.warn('Failed to load job context', { error });
        }

        // Mark as read
        await fetch(`/api/messages/threads/${selectedConversation.id}/read`, {
          method: 'POST',
        });
      } catch (error) {
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user || sending) return;

    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/messages/threads/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          content: messageInput.trim(),
          messageType: 'text',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      const newMessage: Message = {
        id: data.message?.id || Date.now().toString(),
        sender_id: user.id,
        content: messageInput.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        read: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');

      // Update conversation last message
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              lastMessage: {
                text: newMessage.content,
                timestamp: newMessage.created_at,
                read: false,
              },
            }
          : conv
      ));
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Quick action handlers
  const handleSendQuote = () => {
    if (!selectedConversation || !jobContext) {
      toast.error('Please select a conversation first');
      return;
    }

    // Navigate to quote creation with pre-filled context
    const params = new URLSearchParams({
      jobId: selectedConversation.id,
      clientName: selectedConversation.otherUser.name,
      clientEmail: '', // We don't have email in conversation data
      jobTitle: jobContext.title || selectedConversation.jobTitle || '',
    });

    router.push(`/contractor/quotes/create?${params.toString()}`);
  };

  const handleScheduleMeeting = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }

    // Navigate to scheduling page with context
    const params = new URLSearchParams({
      jobId: selectedConversation.id,
      clientName: selectedConversation.otherUser.name,
      prefill: 'true',
    });

    router.push(`/contractor/scheduling?${params.toString()}`);
  };

  const handleShareDocument = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }

    // Navigate to documents page with share context
    const params = new URLSearchParams({
      shareWith: selectedConversation.otherUser.id,
      shareWithName: selectedConversation.otherUser.name,
      jobId: selectedConversation.id,
    });

    router.push(`/contractor/documents?${params.toString()}`);
  };

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

  const formatTime = (timestamp: string) => {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'posted':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-teal-100 text-teal-700';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500" />
          <p className="text-sm text-slate-500 font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-8">You must be logged in to view messages.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-teal-500 text-white rounded-2xl font-semibold hover:bg-teal-600 transition-all shadow-sm hover:shadow-xl"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Conversation List Sidebar */}
      <div className="w-[380px] border-r border-slate-200 flex flex-col bg-slate-50">
        {/* Sidebar Header */}
        <div className="p-8 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
            <button className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all">
              <MoreVertical className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                filter === 'unread'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                filter === 'archived'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Archived
            </button>
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
          ) : filteredConversations.length === 0 ? (
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
                {filteredConversations.map((conv) => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-6 flex items-start gap-4 rounded-2xl transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-white shadow-sm border border-teal-100'
                        : 'bg-white hover:shadow-xl border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {/* Avatar with Online Status */}
                    <div className="relative flex-shrink-0">
                      {conv.otherUser.avatar ? (
                        <img
                          src={conv.otherUser.avatar}
                          alt={conv.otherUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {getInitials(conv.otherUser.name)}
                          </span>
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

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-sm text-slate-900 truncate">
                          {conv.otherUser.name}
                        </h3>
                        <span className="text-xs text-slate-500 flex-shrink-0 font-medium">
                          {formatTime(conv.lastMessage.timestamp)}
                        </span>
                      </div>
                      {conv.jobTitle && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Briefcase className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          <p className="text-xs text-teal-600 font-medium truncate">{conv.jobTitle}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <p className={`text-sm truncate flex-1 ${
                          conv.unreadCount > 0 ? 'text-slate-900 font-semibold' : 'text-slate-600'
                        }`}>
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-8 py-5 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    {selectedConversation.otherUser.avatar ? (
                      <img
                        src={selectedConversation.otherUser.avatar}
                        alt={selectedConversation.otherUser.name}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {getInitials(selectedConversation.otherUser.name)}
                        </span>
                      </div>
                    )}
                    {selectedConversation.otherUser.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* User Info */}
                  <div>
                    <h2 className="font-semibold text-slate-900 text-base">{selectedConversation.otherUser.name}</h2>
                    {selectedConversation.jobTitle && (
                      <button
                        onClick={() => router.push(`/contractor/jobs/${selectedConversation.id}`)}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1.5 transition-all"
                      >
                        <Briefcase className="w-4 h-4" />
                        {selectedConversation.jobTitle}
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button className="p-3 hover:bg-slate-100 rounded-2xl transition-all" title="Voice Call">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </button>
                  <button className="p-3 hover:bg-slate-100 rounded-2xl transition-all" title="Video Call">
                    <Video className="w-5 h-5 text-slate-600" />
                  </button>
                  <button className="p-3 hover:bg-slate-100 rounded-2xl transition-all" title="More Options">
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Job Context Card */}
            {jobContext && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-8 mt-6 p-6 bg-gradient-to-r from-teal-50 to-teal-50/50 border border-teal-100 rounded-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">{jobContext.title}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className={`px-3 py-1 rounded-xl font-semibold ${getStatusColor(jobContext.status)}`}>
                          {jobContext.status.replace('_', ' ')}
                        </span>
                        {jobContext.budget && (
                          <span className="font-semibold text-slate-900">£{jobContext.budget.toLocaleString()}</span>
                        )}
                        {jobContext.deadline && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>Due {new Date(jobContext.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/contractor/jobs/${jobContext.id}`)}
                    className="px-5 py-2.5 text-xs font-semibold text-teal-600 hover:bg-teal-100 rounded-2xl transition-all"
                  >
                    View Job
                  </button>
                </div>
              </motion.div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-6">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-teal-500" />
                    <p className="text-sm text-slate-500 font-medium">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl flex items-center justify-center mb-6">
                    <Send className="w-12 h-12 text-teal-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No messages yet</h3>
                  <p className="text-slate-600 max-w-sm mb-8">
                    Start the conversation and discuss the project details
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const isCurrentUser = message.sender_id === user.id;
                      const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-end gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {/* Avatar */}
                          {!isCurrentUser && (
                            <div className="w-8 h-8 flex-shrink-0">
                              {showAvatar ? (
                                selectedConversation.otherUser.avatar ? (
                                  <img
                                    src={selectedConversation.otherUser.avatar}
                                    alt={selectedConversation.otherUser.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                    <span className="text-white font-semibold text-xs">
                                      {getInitials(selectedConversation.otherUser.name)}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="w-8 h-8" />
                              )}
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className={`flex flex-col max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-5 py-3.5 rounded-2xl shadow-sm ${
                                isCurrentUser
                                  ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-br-md'
                                  : 'bg-white text-slate-900 rounded-bl-md border border-slate-200'
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            </div>
                            <div className={`flex items-center gap-2 mt-1.5 text-xs ${
                              isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                            }`}>
                              <span className="text-slate-500 font-medium">
                                {formatMessageTime(message.created_at)}
                              </span>
                              {isCurrentUser && (
                                <CheckCheck className={`w-4 h-4 ${
                                  message.read ? 'text-teal-500' : 'text-slate-400'
                                }`} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {getInitials(selectedConversation.otherUser.name)}
                    </span>
                  </div>
                  <div className="px-5 py-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Message Input Area */}
            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-4">
                {/* Attachment Button */}
                <button
                  className="p-3.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-600 flex-shrink-0"
                  title="Attach File"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Input Field */}
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl hover:from-slate-800 hover:to-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-xl flex-shrink-0"
                  title="Send Message"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs text-slate-500 font-medium">Quick actions:</span>
                <button
                  onClick={handleSendQuote}
                  disabled={!selectedConversation || !jobContext}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Quote
                </button>
                <button
                  onClick={handleScheduleMeeting}
                  disabled={!selectedConversation}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule Meeting
                </button>
                <button
                  onClick={handleShareDocument}
                  disabled={!selectedConversation}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Share Document
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State - No Conversation Selected */
          <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-slate-50">
            <div className="w-28 h-28 bg-gradient-to-br from-teal-100 to-teal-50 rounded-3xl flex items-center justify-center mb-8">
              <Send className="w-14 h-14 text-teal-500" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Select a conversation</h2>
            <p className="text-slate-600 max-w-md mb-8">
              Choose a conversation from the sidebar to start messaging with homeowners about their projects
            </p>
            <div className="flex flex-col gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-3">
                <CheckCheck className="w-5 h-5 text-teal-500" />
                <span>Real-time messaging</span>
              </div>
              <div className="flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-teal-500" />
                <span>Share files and documents</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-teal-500" />
                <span>Track job progress</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
