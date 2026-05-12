'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import {
  Send,
  CheckCheck,
  Paperclip,
  Briefcase,
  X,
  Video,
  Calendar,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import type {
  Conversation,
  Message,
  JobContext,
  ApiThread,
  ApiMessageResponse,
  Participant,
} from './messagesTypes';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatPanel } from './ChatPanel';
import { CreateContractDialog } from './CreateContractDialog';
import { ShareDocumentDialog } from './ShareDocumentDialog';
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator';
import { MintEditorialMessagesSidebar } from '@/app/messages/components/MintEditorialMessagesSidebar';
import { MintEditorialMessagesChat } from '@/app/messages/components/MintEditorialMessagesChat';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

export function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { csrfToken } = useCSRF();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [showVideoCallDialog, setShowVideoCallDialog] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showShareDocDialog, setShowShareDocDialog] = useState(false);

  const { isOtherTyping: isTyping, broadcastTyping } = useTypingIndicator({
    channelId: selectedConversation?.id ?? null,
    userId: user?.id ?? null,
  });

  useEffect(() => {
    loadUserAndMessages();
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUserAndMessages = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      const response = await fetch('/api/messages/threads');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();

      const transformedConversations: Conversation[] = (data.threads || []).map(
        (thread: ApiThread) => {
          const otherParticipant = thread.participants.find(
            (p: Participant) => p.id !== currentUser.id
          );
          return {
            id: thread.jobId,
            otherUser: {
              id: otherParticipant?.id || '',
              name: otherParticipant?.name || 'Unknown User',
              avatar: otherParticipant?.profile_image_url,
              online: false,
            },
            lastMessage: thread.lastMessage
              ? {
                  text:
                    thread.lastMessage.content ||
                    thread.lastMessage.messageText ||
                    '',
                  timestamp: thread.lastMessage.createdAt,
                  read: true,
                }
              : {
                  text: 'No messages yet',
                  timestamp: new Date().toISOString(),
                  read: true,
                },
            jobTitle: thread.jobTitle,
            unreadCount: thread.unreadCount || 0,
          };
        }
      );
      setConversations(transformedConversations);

      // Auto-select conversation if jobId is in URL params
      const targetJobId = searchParams.get('jobId');
      if (targetJobId) {
        const match = transformedConversations.find(
          (c: Conversation) => c.id === targetJobId
        );
        if (match) setSelectedConversation(match);
      }
    } catch (err) {
      logger.error('Error loading messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(
          '/api/messages/threads/' + selectedConversation.id + '/messages'
        );
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        const transformedMessages = (data.messages || []).map(
          (msg: ApiMessageResponse): Message => ({
            id: msg.id,
            sender_id: msg.senderId || msg.sender_id || '',
            content: msg.content || msg.messageText || '',
            message_type: msg.messageType || msg.message_type || 'text',
            attachment_url:
              msg.attachmentUrl || msg.attachment_url || undefined,
            created_at: msg.createdAt || msg.created_at || '',
            read: msg.read !== undefined ? msg.read : true,
          })
        );
        setMessages(transformedMessages);
        try {
          const jobResponse = await fetch(
            '/api/jobs/' + selectedConversation.id
          );
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
        await fetch(
          '/api/messages/threads/' + selectedConversation.id + '/read',
          { method: 'POST', headers: { 'Content-Type': 'application/json' } }
        );
      } catch {
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user || sending)
      return;
    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch(
        '/api/messages/threads/' + selectedConversation.id + '/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({
            content: messageInput.trim(),
            messageType: 'text',
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to send message' }));
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
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      setConversations((prev) =>
        prev.map((conv) =>
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
        )
      );
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendQuote = () => {
    if (!selectedConversation || !jobContext) {
      toast.error('Please select a conversation first');
      return;
    }
    const params = new URLSearchParams({
      jobId: selectedConversation.id,
      clientName: selectedConversation.otherUser.name,
      clientEmail: '',
      jobTitle: jobContext.title || selectedConversation.jobTitle || '',
    });
    router.push('/contractor/quotes/create?' + params.toString());
  };

  const handleScheduleMeeting = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    const params = new URLSearchParams({
      jobId: selectedConversation.id,
      clientName: selectedConversation.otherUser.name,
      prefill: 'true',
    });
    router.push('/contractor/scheduling?' + params.toString());
  };

  const handleVideoCall = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    setShowVideoCallDialog(true);
  };

  const handleVoiceCall = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    // Audit P1 (2026-04-23): used to push to /video-calls, but that page
    // is a "Coming Soon" placeholder — user landed on a dead-end with no
    // call session. Replaced with a clear toast until the call surface
    // ships. Keep handleScheduleMeeting as the working alternative.
    toast('Voice calls are coming soon. Use Schedule to book a call.', {
      icon: '📞',
    });
  };

  const handleShareDocument = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    setShowShareDocDialog(true);
  };

  const handleDocumentSelected = async (doc: {
    name: string;
    url: string;
    type: string;
  }) => {
    if (!selectedConversation || !user || !csrfToken) return;
    try {
      const content = `Shared document: ${doc.name}`;
      const response = await fetch(
        '/api/messages/threads/' + selectedConversation.id + '/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({
            content,
            messageType: 'file',
            attachments: [doc.url],
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to send');
      const data = await response.json();
      const newMessage: Message = {
        id: data.message?.id || Date.now().toString(),
        sender_id: user.id,
        content,
        message_type: 'file',
        created_at: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => [...prev, newMessage]);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: {
                  text: content,
                  timestamp: newMessage.created_at,
                  read: false,
                },
              }
            : conv
        )
      );
      setShowShareDocDialog(false);
      toast.success(`Shared "${doc.name}"`);
    } catch {
      toast.error('Failed to share document');
    }
  };

  const handlePrepareContract = () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    setShowContractDialog(true);
  };

  const handleViewJob = (jobId: string) => {
    router.push('/contractor/jobs/' + jobId);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    if (filter === 'archived') return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.otherUser.name.toLowerCase().includes(query) ||
        conv.jobTitle?.toLowerCase().includes(query) ||
        conv.lastMessage.text.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Phase-4 (Mint Editorial): hydration-safe theme detection. Must
  // live ABOVE the early returns below — see the homeowner-side
  // MessagesClient comment for the rules-of-hooks rationale (early
  // returns first would change the hook count once `user` flips,
  // crashing the component).
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (loading && !user) {
    return (
      <div className='flex items-center justify-center min-h-[600px]'>
        <div className='flex flex-col items-center gap-6'>
          <div className='animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500' />
          <p className='text-sm text-slate-500 font-medium'>
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className='flex items-center justify-center min-h-[600px]'>
        <div className='text-center max-w-md'>
          <div className='w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6'>
            <X className='w-8 h-8 text-red-600' />
          </div>
          <h1 className='text-2xl font-semibold text-slate-900 mb-2'>
            Access Denied
          </h1>
          <p className='text-slate-600 mb-8'>
            You must be logged in to view messages.
          </p>
          <button
            onClick={() => router.push('/login')}
            className='px-8 py-3 bg-teal-500 text-white rounded-2xl font-semibold hover:bg-teal-600 transition-all shadow-sm hover:shadow-xl'
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Mint Editorial branch — reuses the canonical sidebar + chat from
  // the homeowner side, with a contractor-flavoured "Open job" CTA
  // pointing at /contractor/jobs/[id] and a "More" overflow menu that
  // exposes the contractor-only actions (Schedule, Send quote, Share
  // document, Prepare contract). Voice/Video are routed through the
  // shared `Phone` button which fires the same coming-soon toast. The
  // three dialogs (Video / ShareDoc / Contract) live at the bottom of
  // the return and work for both themes.
  if (isMintEditorial) {
    return (
      <>
        <div className='between' style={{ marginBottom: 14 }}>
          <div className='col' style={{ gap: 4 }}>
            <h1 className='t-h1'>Messages</h1>
            <p className='t-body'>
              Conversations with your homeowners — quotes, scheduling, and job
              sign-off.
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            height: 'calc(100vh - 220px)',
            background: 'var(--me-surface)',
            border: '1px solid var(--me-line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <MintEditorialMessagesSidebar
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
          />
          {selectedConversation ? (
            <MintEditorialMessagesChat
              conversation={selectedConversation}
              messages={messages}
              currentUserId={user.id}
              loadingMessages={loadingMessages}
              messageInput={messageInput}
              onMessageInputChange={(val: string) => {
                setMessageInput(val);
                broadcastTyping();
              }}
              onSendMessage={handleSendMessage}
              sending={sending}
              isTyping={isTyping}
              viewJobHref={`/contractor/jobs/${selectedConversation.id}`}
              viewJobLabel='Open job'
              headerExtras={
                <div style={{ position: 'relative' }}>
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm'
                    aria-label='More actions'
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                  >
                    <MoreHorizontal size={14} strokeWidth={1.75} />
                  </button>
                  {showMoreOptions ? (
                    <div
                      className='card'
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        minWidth: 200,
                        padding: 6,
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                      role='menu'
                    >
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => {
                          setShowMoreOptions(false);
                          handleScheduleMeeting();
                        }}
                      >
                        Schedule meeting
                      </button>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => {
                          setShowMoreOptions(false);
                          handleSendQuote();
                        }}
                      >
                        Send quote
                      </button>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => {
                          setShowMoreOptions(false);
                          handleShareDocument();
                        }}
                      >
                        Share document
                      </button>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => {
                          setShowMoreOptions(false);
                          handlePrepareContract();
                        }}
                      >
                        Prepare contract
                      </button>
                    </div>
                  ) : null}
                </div>
              }
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                background: 'var(--me-bg-2)',
              }}
            >
              <MintEditorialEmptyState
                icon={MessageSquare}
                title='Select a conversation'
                body='Choose a conversation from the left to message homeowners about their job, send a quote, or share documents.'
              />
            </div>
          )}
        </div>

        {/* Shared dialogs — modal overlays render fine over either
            theme's underlying chrome. */}
        <ShareDocumentDialog
          open={showShareDocDialog}
          onOpenChange={setShowShareDocDialog}
          onShareDocument={handleDocumentSelected}
        />
        {selectedConversation && (
          <CreateContractDialog
            open={showContractDialog}
            onOpenChange={setShowContractDialog}
            jobId={selectedConversation.id}
            jobTitle={selectedConversation.jobTitle || 'Contract'}
            onContractCreated={() => {
              setShowContractDialog(false);
              toast.success('Contract sent to homeowner for review');
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className='h-[calc(100vh-180px)] flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'>
      <ConversationSidebar
        loading={loading}
        conversations={filteredConversations}
        selectedConversationId={selectedConversation?.id || null}
        searchQuery={searchQuery}
        filter={filter}
        onSelectConversation={setSelectedConversation}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilter}
      />

      <div className='flex-1 flex flex-col bg-white'>
        {selectedConversation ? (
          <ChatPanel
            conversation={selectedConversation}
            userId={user.id}
            messages={messages}
            loadingMessages={loadingMessages}
            messageInput={messageInput}
            sending={sending}
            isTyping={isTyping}
            jobContext={jobContext}
            showMoreOptions={showMoreOptions}
            messagesEndRef={messagesEndRef}
            onMessageInputChange={(val: string) => {
              setMessageInput(val);
              broadcastTyping();
            }}
            onSendMessage={handleSendMessage}
            onVoiceCall={handleVoiceCall}
            onVideoCall={handleVideoCall}
            onToggleMoreOptions={() => setShowMoreOptions(!showMoreOptions)}
            onScheduleMeeting={handleScheduleMeeting}
            onSendQuote={handleSendQuote}
            onShareDocument={handleShareDocument}
            onPrepareContract={handlePrepareContract}
            onViewJob={handleViewJob}
          />
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center px-8 bg-slate-50'>
            <div className='w-28 h-28 bg-gradient-to-br from-teal-100 to-teal-50 rounded-3xl flex items-center justify-center mb-8'>
              <Send className='w-14 h-14 text-teal-500' />
            </div>
            <h2 className='text-2xl font-semibold text-slate-900 mb-3'>
              Select a conversation
            </h2>
            <p className='text-slate-600 max-w-md mb-8'>
              Choose a conversation from the sidebar to start messaging with
              homeowners about their projects
            </p>
            <div className='flex flex-col gap-4 text-sm text-slate-500'>
              <div className='flex items-center gap-3'>
                <CheckCheck className='w-5 h-5 text-teal-500' />
                <span>Real-time messaging</span>
              </div>
              <div className='flex items-center gap-3'>
                <Paperclip className='w-5 h-5 text-teal-500' />
                <span>Share files and documents</span>
              </div>
              <div className='flex items-center gap-3'>
                <Briefcase className='w-5 h-5 text-teal-500' />
                <span>Track job progress</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Call Dialog */}
      {showVideoCallDialog && selectedConversation && (
        <div
          className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
          onClick={() => setShowVideoCallDialog(false)}
        >
          <div
            className='bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-lg font-semibold text-slate-900'>
                Schedule Video Call
              </h3>
              <button
                onClick={() => setShowVideoCallDialog(false)}
                className='p-2 hover:bg-slate-100 rounded-xl'
              >
                <X className='w-5 h-5 text-slate-500' />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>
                  With
                </label>
                <p className='text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl'>
                  {selectedConversation.otherUser.name}
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>
                  Job
                </label>
                <p className='text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl'>
                  {selectedConversation.jobTitle || 'General'}
                </p>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  onClick={() => {
                    // Audit P1 (2026-04-23): used to push to /video-calls
                    // (a dead-end placeholder). Replaced with a toast until
                    // the live-call surface ships. Schedule still works.
                    toast(
                      'Video calls are coming soon. Use Schedule to book a call.',
                      {
                        icon: '🎥',
                      }
                    );
                    setShowVideoCallDialog(false);
                  }}
                  className='flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-medium text-sm'
                >
                  <Video className='w-4 h-4' /> Start Now
                </button>
                <button
                  onClick={() => {
                    handleScheduleMeeting();
                    setShowVideoCallDialog(false);
                  }}
                  className='flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium text-sm'
                >
                  <Calendar className='w-4 h-4' /> Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Document Dialog */}
      <ShareDocumentDialog
        open={showShareDocDialog}
        onOpenChange={setShowShareDocDialog}
        onShareDocument={handleDocumentSelected}
      />

      {/* Prepare Contract Dialog */}
      {selectedConversation && (
        <CreateContractDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          jobId={selectedConversation.id}
          jobTitle={selectedConversation.jobTitle || 'Contract'}
          onContractCreated={() => {
            setShowContractDialog(false);
            toast.success('Contract sent to homeowner for review');
          }}
        />
      )}
    </div>
  );
}
