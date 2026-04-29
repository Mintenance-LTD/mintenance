'use client';

import React, { use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { MessageInput } from '@/components/messaging/MessageInput';
import { logger } from '@/lib/logger';
import { CreateContractDialog } from '@/app/contractor/messages/components/CreateContractDialog';
import { QuoteViewDialog } from './components/QuoteViewDialog';
import { VideoCallScheduler } from '@/app/video-calls/components/VideoCallScheduler';
import { useChatData } from './components/useChatData';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessagesArea } from './components/ChatMessagesArea';

interface ChatPageProps {
  params: Promise<{ jobId: string }>;
}

function ChatContent({ params }: ChatPageProps) {
  const { jobId } = use(params);
  const router = useRouter();

  const chat = useChatData(jobId);

  // Auth loading state
  if (!chat.user) {
    if (chat.loading) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundSecondary,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '4px solid #d1d5db',
              borderTopColor: '#4b5563',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      );
    }
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md,
            }}
          >
            Access Denied
          </h1>
          <p
            style={{
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.lg,
            }}
          >
            You must be logged in to view messages.
          </p>
          <Button onClick={() => router.push('/login')} variant='primary'>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.backgroundSecondary,
      }}
    >
      <ChatHeader
        homeownerProfile={chat.homeownerProfile}
        otherUserName={chat.otherUserName}
        jobTitle={chat.jobTitle}
        loading={chat.loading}
        showProfileMenu={chat.showProfileMenu}
        profileMenuRef={chat.profileMenuRef as React.RefObject<HTMLDivElement>}
        onRefresh={chat.loadUserAndMessages}
        onToggleProfileMenu={() =>
          chat.setShowProfileMenu(!chat.showProfileMenu)
        }
        onShowContract={() => {
          chat.setShowContractModal(true);
          chat.setShowProfileMenu(false);
        }}
        onShowQuote={() => {
          chat.setShowQuoteModal(true);
          chat.setShowProfileMenu(false);
        }}
        onShowVideoCall={() => {
          chat.setShowVideoCallDialog(true);
          chat.setShowProfileMenu(false);
        }}
        getBackRoute={chat.getBackRoute}
      />

      <ChatMessagesArea
        messages={chat.messages}
        loading={chat.loading}
        error={chat.error}
        userId={chat.user.id}
        messagesEndRef={chat.messagesEndRef as React.RefObject<HTMLDivElement>}
        onRetry={chat.loadUserAndMessages}
      />

      <div style={{ flexShrink: 0 }}>
        <MessageInput
          onSendMessage={chat.handleSendMessage}
          disabled={chat.sending || !chat.otherUserId}
          placeholder={chat.sending ? 'Sending...' : 'Type a message...'}
        />
      </div>

      <CreateContractDialog
        open={chat.showContractModal}
        onOpenChange={chat.setShowContractModal}
        jobId={jobId}
        jobTitle={chat.jobTitle || 'Contract'}
        onContractCreated={async () => {
          chat.setShowContractModal(false);
          logger.info('Contract created, refreshing messages', { jobId });
          setTimeout(async () => {
            await chat.loadUserAndMessages();
          }, 500);
        }}
      />

      <QuoteViewDialog
        open={chat.showQuoteModal}
        onOpenChange={chat.setShowQuoteModal}
        jobId={jobId}
      />

      {chat.user && (
        <VideoCallScheduler
          currentUserId={chat.user.id}
          isVisible={chat.showVideoCallDialog}
          onCancel={() => chat.setShowVideoCallDialog(false)}
          initialJobId={jobId}
          onScheduled={() => {
            chat.setShowVideoCallDialog(false);
            // Audit P1 (2026-04-23): the prior path prompted the user to
            // navigate to /video-calls for "details" but that page is a
            // dead-end placeholder. Drop the redirect and fall back to
            // a simple confirmation alert; the schedule itself is real
            // (created via VideoCallScheduler against video_calls table).
            //
            // Audit follow-up (2026-04-29): rewrote the alert copy.
            // "Coming soon" implied the schedule itself wasn't real,
            // when in fact the row was already created. The new
            // wording confirms the action and points back at the
            // existing surface (this same messages thread) so the
            // user knows where to find it.
            alert(
              'Video call scheduled. You can view it from this messages thread.'
            );
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600' />
        </div>
      }
    >
      <ChatContent params={params} />
    </Suspense>
  );
}
