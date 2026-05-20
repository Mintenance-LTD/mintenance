'use client';

/**
 * Mint Editorial conversation sidebar — canonical layout from
 * design-system/project/redesign-v2/homeowner-screens.jsx lines 311-352.
 *
 * Differences from the legacy sidebar:
 *   - 320px fixed width (not responsive 80/96).
 *   - Search-only header (no All/Unread/Archived filter tabs — those
 *     do not exist in the canonical design and Archived was a dead
 *     branch anyway).
 *   - Selected row: `var(--brand-soft)` background + brand-filled
 *     avatar. Legacy used `bg-gray-100`.
 *   - Unread pill is a right-side mini-pill (18px round), not an
 *     absolute-positioned avatar corner badge.
 *   - Job title shown as third meta line (11px ink-3) under the
 *     snippet, not above it in teal-600.
 */

import React from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';

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

interface Props {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conv: Conversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function MintEditorialMessagesSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  loading,
}: Props) {
  const filtered = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.otherUser.name.toLowerCase().includes(q) ||
      conv.jobTitle?.toLowerCase().includes(q) ||
      conv.lastMessage.text.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        width: 320,
        borderRight: '1px solid var(--me-line)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--me-bg)',
        flexShrink: 0,
      }}
    >
      {/* Search row — canonical uses .search; we keep the input
          editable using .field-style focus ring via inline overrides. */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div
          className='search-pill'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
          }}
        >
          <Search size={14} strokeWidth={1.75} />
          <input
            type='text'
            placeholder='Search messages'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--me-ink)',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--me-bg-3)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 12,
                      width: '70%',
                      background: 'var(--me-bg-3)',
                      borderRadius: 4,
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      width: '50%',
                      background: 'var(--me-bg-3)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--me-ink-3)',
              fontSize: 13,
            }}
          >
            No conversations found.
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = selectedConversation?.id === conv.id;
            return (
              <button
                key={conv.id}
                type='button'
                onClick={() => onSelectConversation(conv)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'var(--me-brand-soft)'
                    : 'transparent',
                  borderBottom: '1px solid var(--me-line-2)',
                  border: 'none',
                  borderRadius: 0,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                {conv.otherUser.avatar ? (
                  <Image
                    src={conv.otherUser.avatar}
                    alt={conv.otherUser.name}
                    width={36}
                    height={36}
                    className='avatar avatar-md'
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    className='avatar avatar-md'
                    style={
                      isSelected
                        ? {
                            background: 'var(--me-brand)',
                            color: 'var(--me-on-brand)',
                          }
                        : undefined
                    }
                  >
                    {getInitials(conv.otherUser.name)}
                  </span>
                )}
                <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className='row'>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {conv.otherUser.name}
                    </div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      {formatTime(conv.lastMessage.timestamp)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--me-ink-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conv.lastMessage.text}
                  </div>
                  {conv.jobTitle ? (
                    <div className='t-meta' style={{ fontSize: 11 }}>
                      {conv.jobTitle}
                    </div>
                  ) : null}
                </div>
                {conv.unreadCount > 0 ? (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      padding: '0 6px',
                      background: 'var(--me-brand)',
                      color: 'var(--me-on-brand)',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {conv.unreadCount}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
