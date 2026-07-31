'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { MessagingService } from '@/lib/services/MessagingService';
import { useRealTimeMessages } from '@/hooks/useRealTimeMessages';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import type { Message, User } from '@mintenance/types';

export interface HomeownerProfile {
  profile_image_url?: string | null;
  name?: string;
}

export function useChatData(jobId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [homeownerProfile, setHomeownerProfile] =
    useState<HomeownerProfile | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showVideoCallDialog, setShowVideoCallDialog] = useState(false);

  const otherUserId = searchParams.get('userId');
  const otherUserName = searchParams.get('userName');
  const jobTitle = searchParams.get('jobTitle');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadUserAndMessages = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      const jobMessages = await MessagingService.getJobMessages(jobId);
      const uniqueMessages = Array.from(
        new Map(jobMessages.map((msg) => [msg.id, msg])).values()
      );
      setMessages(uniqueMessages);
      await MessagingService.markMessagesAsRead(jobId, currentUser.id);
    } catch (err) {
      logger.error('Error loading chat', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  // Redirect to proper messages page
  useEffect(() => {
    if (!user || !jobId) return;
    const target =
      user.role === 'contractor'
        ? `/contractor/messages?jobId=${jobId}`
        : `/messages?jobId=${jobId}`;
    router.replace(target);
  }, [user, jobId, router]);

  useEffect(() => {
    loadUserAndMessages();
  }, [loadUserAndMessages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu)
      document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  // Fetch homeowner profile
  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) return;
        const data = await response.json();
        const job = data.job;
        if (!job?.homeowner) return;
        const homeowner = Array.isArray(job.homeowner)
          ? job.homeowner[0]
          : job.homeowner;
        const first = homeowner?.first_name?.trim() ?? '';
        const last = homeowner?.last_name?.trim() ?? '';
        const full = `${first} ${last}`.trim();
        let name: string;
        if (full) {
          name = full;
        } else if (homeowner?.email) {
          name = homeowner.email
            .split('@')[0]
            .split('.')
            .map(
              (p: string) =>
                p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
            )
            .join(' ');
        } else if (homeowner?.company_name) {
          name = homeowner.company_name;
        } else {
          name = 'Homeowner';
        }
        setHomeownerProfile({
          profile_image_url: homeowner?.profile_image_url || null,
          name,
        });
      } catch (err) {
        logger.error('Error fetching homeowner profile:', err);
      }
    })();
  }, [jobId, otherUserName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Real-time messages
  useRealTimeMessages(jobId, {
    enabled: !!user && !!jobId,
    onNewMessage: (newMessage) => {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === newMessage.id)) return prev;
        setTimeout(scrollToBottom, 100);
        return [...prev, newMessage];
      });
      if (newMessage.senderId !== user?.id && user?.id) {
        MessagingService.markMessagesAsRead(jobId, user.id);
      }
    },
    onMessageUpdate: (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    },
    onError: (err) => {
      logger.error('Real-time messaging error', err);
    },
  });

  const handleSendMessage = async (messageText: string) => {
    if (!user || !jobId || !otherUserId || sending) {
      if (!otherUserId)
        toast.error('Unable to determine recipient. Please refresh the page.');
      return;
    }
    try {
      setSending(true);
      const newMessage = await MessagingService.sendMessage(
        jobId,
        otherUserId,
        messageText,
        user.id
      );
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    } catch (err) {
      logger.error('Error sending message', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to send message. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const getBackRoute = () => {
    if (!user) return '/messages';
    return user.role === 'contractor' ? '/contractor/messages' : '/messages';
  };

  return {
    user,
    messages,
    loading,
    error,
    sending,
    showProfileMenu,
    setShowProfileMenu,
    homeownerProfile,
    showContractModal,
    setShowContractModal,
    showQuoteModal,
    setShowQuoteModal,
    showVideoCallDialog,
    setShowVideoCallDialog,
    otherUserId,
    otherUserName,
    jobTitle,
    messagesEndRef,
    profileMenuRef,
    loadUserAndMessages,
    handleSendMessage,
    getBackRoute,
  };
}
