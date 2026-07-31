'use client';

import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';

export interface Quote {
  id: string;
  jobTitle: string;
  customerName: string;
  customerEmail?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  amount: number;
  createdDate: string;
  sentDate?: string;
  expiryDate: string | null;
  templateUsed?: string;
  items?: number;
}

export type FilterTab =
  | 'all'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired';

export function useQuotesData() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contractor/quotes');
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (error) {
      logger.error('Error loading quotes:', error, { service: 'app' });
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = quotes.length;
    const pending = quotes.filter((q) => q.status === 'sent').length;
    const pendingAmount = quotes
      .filter((q) => q.status === 'sent')
      .reduce((sum, q) => sum + q.amount, 0);
    const accepted = quotes.filter((q) => q.status === 'accepted').length;
    const acceptedAmount = quotes
      .filter((q) => q.status === 'accepted')
      .reduce((sum, q) => sum + q.amount, 0);
    const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;
    return {
      total,
      pending,
      pendingAmount,
      accepted,
      acceptedAmount,
      acceptanceRate,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    let filtered = quotes;
    if (activeFilter !== 'all') {
      filtered = filtered.filter((q) => q.status === activeFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.jobTitle.toLowerCase().includes(query) ||
          q.customerName.toLowerCase().includes(query) ||
          q.customerEmail?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [quotes, activeFilter, searchQuery]);

  const filterTabs: { value: FilterTab; label: string; count: number }[] = [
    { value: 'all', label: 'All Quotes', count: quotes.length },
    {
      value: 'draft',
      label: 'Draft',
      count: quotes.filter((q) => q.status === 'draft').length,
    },
    {
      value: 'sent',
      label: 'Sent',
      count: quotes.filter((q) => q.status === 'sent').length,
    },
    {
      value: 'accepted',
      label: 'Accepted',
      count: quotes.filter((q) => q.status === 'accepted').length,
    },
    {
      value: 'declined',
      label: 'Declined',
      count: quotes.filter((q) => q.status === 'declined').length,
    },
  ];

  return {
    quotes,
    loading,
    stats,
    filteredQuotes,
    filterTabs,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    showActionMenu,
    setShowActionMenu,
  };
}
