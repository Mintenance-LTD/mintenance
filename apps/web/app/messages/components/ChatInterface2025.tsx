'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { fadeIn, slideInFromBottom } from '@/lib/animations/variants';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  created_at: string;
  read: boolean;
  reactions?: Array<{ emoji: string; userId: string }>;
}

interface ChatInterface2025Props {
  messages: Message[];
  currentUserId: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  jobTitle: string;
  onSendMessage: (content: string) => Promise<void>;
  onAddReaction: (messageId: string, emoji: string) => void;
  isTyping?: boolean;
}

const EMOJI_QUICK_REACTIONS = ['👍', '❤️', '😊', '🎉', '👏', '🔥'];

export function ChatInterface2025({
  messages,
  currentUserId,
  otherUser,
  jobTitle,
  onSendMessage,
  onAddReaction,
  isTyping = false,
}: ChatInterface2025Props) {
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(messageInput.trim());
      setMessageInput('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((message) => {
      const date = new Date(message.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {otherUser.avatar ? (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-teal-700 font-semibold">{getInitials(otherUser.name)}</span>
                </div>
              )}
              {otherUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Info */}
            <div>
              <h2 className="font-bold text-gray-900">{otherUser.name}</h2>
              <p className="text-sm text-teal-600 truncate max-w-md">{jobTitle}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-6">
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {date}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {msgs.map((message, index) => {
                const isCurrentUser = message.sender_id === currentUserId;
                const showAvatar = !isCurrentUser && (index === 0 || msgs[index - 1].sender_id !== message.sender_id);

                return (
                  <MotionDiv
                    key={message.id}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar (for other user) */}
                    {!isCurrentUser && (
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-teal-700 font-semibold text-xs">
                              {getInitials(otherUser.name)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`group relative max-w-md ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl ${
                          isCurrentUser
                            ? 'bg-teal-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      </div>

                      {/* Time & Status */}
                      <div
                        className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                          isCurrentUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{formatTime(message.created_at)}</span>
                        {isCurrentUser && (
                          <span>
                            {message.read ? (
                              <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {message.reactions.map((reaction, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs shadow-sm"
                            >
                              {reaction.emoji}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quick Reactions (on hover) */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 p-1 bg-white rounded-full shadow-lg border border-gray-200">
                          {EMOJI_QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => onAddReaction(message.id, emoji)}
                              className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <MotionDiv
              variants={slideInFromBottom}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-end gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-700 font-semibold text-xs">
                  {getInitials(otherUser.name)}
                </span>
              </div>
              <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-3">
          {/* Emoji Button */}
          <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition-all"
              style={{ maxHeight: '120px' }}
            />
          </div>

          {/* Send Button */}
          <MotionButton
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sending}
            className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </MotionButton>
        </div>
      </div>
    </div>
  );
}
