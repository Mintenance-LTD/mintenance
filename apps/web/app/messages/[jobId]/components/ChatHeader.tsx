'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';
import {
  FileText,
  Phone,
  FileCheck,
  ClipboardList,
  RotateCw,
} from 'lucide-react';
import type { HomeownerProfile } from './useChatData';

interface ChatHeaderProps {
  homeownerProfile: HomeownerProfile | null;
  otherUserName: string | null;
  jobTitle: string | null;
  loading: boolean;
  showProfileMenu: boolean;
  profileMenuRef: React.RefObject<HTMLDivElement>;
  onRefresh: () => void;
  onToggleProfileMenu: () => void;
  onShowContract: () => void;
  onShowQuote: () => void;
  onShowVideoCall: () => void;
  getBackRoute: () => string;
}

export function ChatHeader({
  homeownerProfile,
  otherUserName,
  jobTitle,
  loading,
  showProfileMenu,
  profileMenuRef,
  onRefresh,
  onToggleProfileMenu,
  onShowContract,
  onShowQuote,
  onShowVideoCall,
  getBackRoute,
}: ChatHeaderProps) {
  const router = useRouter();
  const displayName = homeownerProfile?.name || otherUserName || 'Unknown User';
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'H';

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: theme.spacing.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          onClick={() => router.push(getBackRoute())}
          variant='ghost'
          size='sm'
          style={{ marginRight: theme.spacing.sm }}
        >
          ← Back
        </Button>
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: '2px',
            }}
          >
            {displayName}
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ClipboardList size={14} /> {jobTitle || 'Job Discussion'}
          </p>
        </div>
      </div>
      <div
        style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}
      >
        <Button
          onClick={onRefresh}
          variant='ghost'
          size='sm'
          disabled={loading}
        >
          <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>

        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <Button
            variant='ghost'
            size='sm'
            onClick={onToggleProfileMenu}
            aria-label='Homeowner profile menu'
            aria-expanded={showProfileMenu}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {homeownerProfile?.profile_image_url ? (
              <Image
                src={homeownerProfile.profile_image_url}
                alt={displayName}
                fill
                sizes='40px'
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span
                style={{
                  color: 'white',
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                }}
              >
                {initials}
              </span>
            )}
          </Button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: theme.spacing[1],
                backgroundColor: theme.colors.white,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                boxShadow: theme.shadows.lg,
                minWidth: '180px',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <Button
                variant='ghost'
                size='sm'
                onClick={onShowContract}
                className='w-full justify-start'
                leftIcon={<FileCheck className='h-4 w-4' />}
              >
                Contract
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={onShowQuote}
                className='w-full justify-start'
                leftIcon={<FileText className='h-4 w-4' />}
              >
                View Quote
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={onShowVideoCall}
                className='w-full justify-start'
                leftIcon={<Phone className='h-4 w-4' />}
              >
                Call
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
