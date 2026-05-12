'use client';

/**
 * Mint Editorial chat area — canonical layout from
 * design-system/project/redesign-v2/homeowner-screens.jsx lines 354-403.
 *
 * Key differences from the legacy chat area:
 *   - Header right side adds Phone (btn-ghost) + "View bid" (btn-secondary)
 *     buttons and a `Re: {job} · Verified · Gas Safe #####` sub-meta.
 *   - Body uses `var(--me-bg-2)` mint-tinted backdrop, not white.
 *   - Date separators ("Today · 11:14") between message clusters.
 *   - Self-bubble = brand bg + white text + 4px top-right radius;
 *     other-bubble = surface + 1px line + 4px top-left radius.
 *   - In-thread system pill: centered, brand-soft bg + Shield icon
 *     ("Bid approved · £145 held in escrow").
 *   - Input row: Camera btn-secondary + .field + "Send" btn-primary
 *     (icon + text label, not icon-only).
 */

import React from 'react';
import Image from 'next/image';
import { Phone, Camera, Send, Shield, Loader2 } from 'lucide-react';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    online: boolean;
  };
  lastMessage: { text: string; timestamp: string; read: boolean };
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

interface Props {
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

function formatBubbleTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDayHeader(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = formatBubbleTime(timestamp);
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return (
    d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) +
    ` · ${time}`
  );
}

/** Group messages by day so we can render canonical date separators. */
function groupByDay(
  messages: Message[]
): { header: string; items: Message[] }[] {
  const groups: { header: string; items: Message[] }[] = [];
  let currentKey = '';
  for (const m of messages) {
    const key = new Date(m.created_at).toDateString();
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ header: formatDayHeader(m.created_at), items: [m] });
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }
  return groups;
}

export function MintEditorialMessagesChat({
  conversation,
  messages,
  currentUserId,
  loadingMessages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  sending,
  isTyping = false,
}: Props) {
  const groups = groupByDay(messages);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--me-bg-2)',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 24px',
          background: 'var(--me-bg)',
          borderBottom: '1px solid var(--me-line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {conversation.otherUser.avatar ? (
          <Image
            src={conversation.otherUser.avatar}
            alt={conversation.otherUser.name}
            width={36}
            height={36}
            className='avatar avatar-md'
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span
            className='avatar avatar-md'
            style={{
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
            }}
          >
            {getInitials(conversation.otherUser.name)}
          </span>
        )}
        <div className='col' style={{ gap: 2, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {conversation.otherUser.name}
          </div>
          {conversation.jobTitle ? (
            <div className='t-meta'>Re: {conversation.jobTitle}</div>
          ) : null}
        </div>
        <div style={{ flex: 1 }} />
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          aria-label='Call contractor'
        >
          <Phone size={14} strokeWidth={1.75} />
        </button>
        {conversation.jobTitle ? (
          <a
            href={`/jobs/${conversation.id}`}
            className='btn btn-secondary btn-sm'
          >
            View bid
          </a>
        ) : null}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: 24,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {loadingMessages ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--me-ink-3)',
            }}
          >
            <Loader2 className='animate-spin' size={20} strokeWidth={1.75} />
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--me-ink-3)',
              fontSize: 13,
            }}
          >
            No messages yet — start the conversation.
          </div>
        ) : (
          groups.map((group, gi) => (
            <React.Fragment key={gi}>
              <div className='t-meta' style={{ textAlign: 'center' }}>
                {group.header}
              </div>
              {group.items.map((m) => {
                const isSelf = m.sender_id === currentUserId;
                const isSystem = m.message_type === 'system';
                if (isSystem) {
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: 'center',
                        padding: '8px 14px',
                        borderRadius: 9999,
                        background: 'var(--me-brand-soft)',
                        color: 'var(--me-brand)',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Shield size={11} strokeWidth={1.75} />
                      {m.content}
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isSelf ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                    }}
                  >
                    <div
                      style={
                        isSelf
                          ? {
                              background: 'var(--me-brand)',
                              color: 'var(--me-on-brand)',
                              borderRadius: 14,
                              borderTopRightRadius: 4,
                              padding: '10px 14px',
                              fontSize: 14,
                            }
                          : {
                              background: 'var(--me-surface)',
                              border: '1px solid var(--me-line)',
                              borderRadius: 14,
                              borderTopLeftRadius: 4,
                              padding: '10px 14px',
                              fontSize: 14,
                              color: 'var(--me-ink-2)',
                            }
                      }
                    >
                      {m.content}
                    </div>
                    <div
                      className='t-meta'
                      style={{
                        marginTop: 4,
                        textAlign: isSelf ? 'right' : 'left',
                      }}
                    >
                      {isSelf
                        ? 'You'
                        : conversation.otherUser.name.split(' ')[0]}{' '}
                      · {formatBubbleTime(m.created_at)}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}

        {isTyping ? (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              background: 'var(--me-surface)',
              border: '1px solid var(--me-line)',
              borderRadius: 14,
              borderTopLeftRadius: 4,
              display: 'inline-flex',
              gap: 6,
            }}
          >
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className='animate-bounce'
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--me-ink-3)',
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '14px 24px',
          background: 'var(--me-bg)',
          borderTop: '1px solid var(--me-line)',
        }}
      >
        <div className='row' style={{ gap: 8 }}>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            aria-label='Attach photo'
            title='Attach photo (coming soon)'
            disabled
          >
            <Camera size={14} strokeWidth={1.75} />
          </button>
          <input
            type='text'
            className='field'
            placeholder={`Reply to ${conversation.otherUser.name.split(' ')[0]}…`}
            value={messageInput}
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={onSendMessage}
            disabled={!messageInput.trim() || sending}
          >
            {sending ? (
              <Loader2 size={13} strokeWidth={1.75} className='animate-spin' />
            ) : (
              <>
                <Send size={13} strokeWidth={1.75} /> Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
