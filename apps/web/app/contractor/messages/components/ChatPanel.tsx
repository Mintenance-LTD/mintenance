'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, MoreVertical, Phone, Video,
  Briefcase, Calendar, CheckCheck, FileText, Download, ClipboardList,
} from 'lucide-react';
import type { Conversation, Message, JobContext } from './messagesTypes';
import { formatMessageTime, getInitials, getStatusColor } from './messagesTypes';

interface ChatPanelProps {
  conversation: Conversation;
  userId: string;
  messages: Message[];
  loadingMessages: boolean;
  messageInput: string;
  sending: boolean;
  isTyping: boolean;
  jobContext: JobContext | null;
  showMoreOptions: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleMoreOptions: () => void;
  onScheduleMeeting: () => void;
  onSendQuote: () => void;
  onShareDocument: () => void;
  onPrepareContract: () => void;
  onViewJob: (jobId: string) => void;
}

export function ChatPanel({
  conversation, userId, messages, loadingMessages, messageInput,
  sending, isTyping, jobContext, showMoreOptions, messagesEndRef,
  onMessageInputChange, onSendMessage, onVoiceCall, onVideoCall,
  onToggleMoreOptions, onScheduleMeeting, onSendQuote, onShareDocument, onPrepareContract, onViewJob,
}: ChatPanelProps) {
  return (
    <>
      {/* Chat Header */}
      <div className="px-8 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {conversation.otherUser.avatar ? (
                <Image src={conversation.otherUser.avatar} alt={conversation.otherUser.name} width={44} height={44} className="rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{getInitials(conversation.otherUser.name)}</span>
                </div>
              )}
              {conversation.otherUser.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">{conversation.otherUser.name}</h2>
              {conversation.jobTitle && (
                <button
                  onClick={() => onViewJob(conversation.id)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1.5 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  {conversation.jobTitle}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onVoiceCall} className="p-3 hover:bg-slate-100 rounded-2xl transition-all" title="Voice Call">
              <Phone className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={onVideoCall} className="p-3 hover:bg-slate-100 rounded-2xl transition-all" title="Video Call">
              <Video className="w-5 h-5 text-slate-600" />
            </button>
            <div className="relative">
              <button onClick={onToggleMoreOptions} className="p-3 hover:bg-slate-100 rounded-2xl transition-all" title="More Options">
                <MoreVertical className="w-5 h-5 text-slate-600" />
              </button>
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                  <button onClick={() => { onPrepareContract(); onToggleMoreOptions(); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <FileText className="w-4 h-4" /> Prepare Contract
                  </button>
                  <button onClick={() => { onScheduleMeeting(); onToggleMoreOptions(); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <Calendar className="w-4 h-4" /> Schedule Meeting
                  </button>
                  <button onClick={() => { onSendQuote(); onToggleMoreOptions(); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <Briefcase className="w-4 h-4" /> Send Quote
                  </button>
                  <button onClick={() => { onShareDocument(); onToggleMoreOptions(); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <Paperclip className="w-4 h-4" /> Share Document
                  </button>
                  <button onClick={() => { onViewJob(conversation.id); onToggleMoreOptions(); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <Briefcase className="w-4 h-4" /> View Job Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Job Context Card */}
      {jobContext && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-8 mt-6 p-6 bg-gradient-to-r from-teal-50 to-teal-50/50 border border-teal-100 rounded-2xl">
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
                  {jobContext.budget && <span className="font-semibold text-slate-900">£{jobContext.budget.toLocaleString()}</span>}
                  {jobContext.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Due {new Date(jobContext.deadline).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => onViewJob(jobContext.id)} className="px-5 py-2.5 text-xs font-semibold text-teal-600 hover:bg-teal-100 rounded-2xl transition-all">
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
            <p className="text-slate-600 max-w-sm mb-8">Start the conversation and discuss the project details</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => {
                const isCurrentUser = message.sender_id === userId;
                const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex items-end gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isCurrentUser && (
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar ? (
                          conversation.otherUser.avatar ? (
                            <Image src={conversation.otherUser.avatar} alt={conversation.otherUser.name} width={32} height={32} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-xs">{getInitials(conversation.otherUser.name)}</span>
                            </div>
                          )
                        ) : <div className="w-8 h-8" />}
                      </div>
                    )}
                    <div className={`flex flex-col max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {message.message_type === 'file' && message.attachment_url ? (
                        <div className={`px-5 py-3.5 rounded-2xl shadow-sm ${isCurrentUser ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-br-md' : 'bg-white text-slate-900 rounded-bl-md border border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrentUser ? 'bg-white/10' : 'bg-teal-50'}`}>
                              <FileText className={`w-5 h-5 ${isCurrentUser ? 'text-white/80' : 'text-teal-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{message.content.replace(/^Shared document:\s*/i, '')}</p>
                              <p className={`text-xs mt-0.5 ${isCurrentUser ? 'text-white/60' : 'text-slate-500'}`}>Shared document</p>
                            </div>
                          </div>
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${isCurrentUser ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200'}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            View Document
                          </a>
                        </div>
                      ) : message.message_type === 'system' ? (
                        <div className={`px-5 py-3.5 rounded-2xl shadow-sm ${isCurrentUser ? 'bg-gradient-to-r from-teal-700 to-teal-800 text-white rounded-br-md' : 'bg-teal-50 text-teal-900 rounded-bl-md border border-teal-200'}`}>
                          <div className="flex items-start gap-2">
                            <ClipboardList className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCurrentUser ? 'text-teal-200' : 'text-teal-600'}`} />
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`px-5 py-3.5 rounded-2xl shadow-sm ${isCurrentUser ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-br-md' : 'bg-white text-slate-900 rounded-bl-md border border-slate-200'}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 mt-1.5 text-xs ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-slate-500 font-medium">{formatMessageTime(message.created_at)}</span>
                        {isCurrentUser && <CheckCheck className={`w-4 h-4 ${message.read ? 'text-teal-500' : 'text-slate-400'}`} />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <span className="text-white font-semibold text-xs">{getInitials(conversation.otherUser.name)}</span>
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
          <button className="p-3.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-600 flex-shrink-0" title="Attach File">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => onMessageInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
              rows={1}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={onSendMessage}
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
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-slate-500 font-medium">Quick actions:</span>
          <button onClick={onSendQuote} disabled={!jobContext} className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">Send Quote</button>
          <button onClick={onScheduleMeeting} className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">Schedule Meeting</button>
          <button onClick={onShareDocument} className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">Share Document</button>
        </div>
      </div>
    </>
  );
}
