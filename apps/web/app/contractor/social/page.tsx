'use client';

import React, { useState, useEffect } from 'react';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { PageLayout, PageHeader } from '@/components/ui/PageLayout';
import { ContractorFeed } from './components/ContractorFeed';
import { CreatePost } from './components/CreatePost';
import { User } from '@mintenance/types';
import { redirect } from 'next/navigation';

export default function ContractorSocialPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!user) {
          // Handle redirect in client component effect or use server component
          window.location.href = '/login';
          return;
        }
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };

    loadUser();
  }, []);

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!currentUser) {
    return <div style={{ padding: theme.spacing[8], textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <PageLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <PageHeader
          title="Contractor Network"
          description="Connect with other professionals, share your work, and get advice."
        />

        <CreatePost
          currentUserId={currentUser.id}
          onPostCreated={handlePostCreated}
        />

        <ContractorFeed
          key={refreshKey}
          currentUserId={currentUser.id}
        />
      </div>
    </PageLayout>
  );
}
