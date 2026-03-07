'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

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
  attachment_url?: string;
  created_at: string;
  read: boolean;
}

interface MessagesChatAreaProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  loadingMessages: boolean;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  sending: boolean;
  isTyping?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MessagesChatArea({
  conversation,
  messages,
  currentUserId,
  loadingMessages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  sending,
  isTyping = false,
}: MessagesChatAreaProps) {
  const router = useRouter();

  return (
    <>
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          {conversation.otherUser.avatar ? (
            <img
              src={conversation.otherUser.avatar}
              alt={conversation.otherUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 font-semibold text-sm">
                {getInitials(conversation.otherUser.name)}
              </span>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{conversation.otherUser.name}</h2>
            {conversation.jobTitle && (
              <button
                onClick={() => router.push(`/jobs/${conversation.id}`)}
                className="text-sm text-teal-600 hover:underline"
              >
                {conversation.jobTitle}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner message="Loading messages..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isCurrentUser && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {conversation.otherUser.avatar ? (
                      <img
                        src={conversation.otherUser.avatar}
                        alt={conversation.otherUser.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-700 font-semibold text-xs">
                          {getInitials(conversation.otherUser.name)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className={`max-w-md ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                  {message.message_type === 'file' && message.attachment_url ? (
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isCurrentUser
                          ? 'bg-teal-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrentUser ? 'bg-white/15' : 'bg-teal-50'}`}>
                          <svg className={`w-5 h-5 ${isCurrentUser ? 'text-white/80' : 'text-teal-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.content.replace(/^Shared document:\s*/i, '')}</p>
                          <p className={`text-xs mt-0.5 ${isCurrentUser ? 'text-white/60' : 'text-gray-500'}`}>Shared document</p>
                        </div>
                      </div>
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-2.5 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isCurrentUser ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        View Document
                      </a>
                    </div>
                  ) : message.message_type === 'system' ? (
                    <div
                      className={`px-4 py-2.5 rounded-2xl ${
                        isCurrentUser
                          ? 'bg-teal-700 text-white rounded-br-sm'
                          : 'bg-teal-50 text-teal-900 rounded-bl-sm border border-teal-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCurrentUser ? 'text-teal-200' : 'text-teal-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-2.5 rounded-2xl ${
                        isCurrentUser
                          ? 'bg-teal-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{formatMessageTime(message.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="flex items-center gap-3 px-2 pb-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 font-semibold text-xs">
                {getInitials(conversation.otherUser.name)}
              </span>
            </div>
            <div className="px-4 py-2.5 bg-gray-100 rounded-2xl">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            disabled
            title="Attachments -- coming soon"
            aria-label="Attach file (coming soon)"
            className="p-2 rounded-lg transition-colors text-gray-300 cursor-not-allowed relative group"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Coming soon
            </span>
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && onSendMessage()}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
          />

          <button
            onClick={onSendMessage}
            disabled={!messageInput.trim() || sending}
            className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </button>
        </div>
      </div>
    </>
  );
}
