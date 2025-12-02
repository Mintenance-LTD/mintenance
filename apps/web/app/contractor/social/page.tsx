'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { SocialFeedCard2025 } from './components/SocialFeedCard2025';
import { LoadingSpinner } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import toast from 'react-hot-toast';
import { redirect } from 'next/navigation';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface SocialPost {
  id: string;
  contractor: {
    id: string;
    name: string;
    company?: string;
    avatar?: string;
    verified: boolean;
  };
  content: string;
  images?: string[];
  postType: 'portfolio' | 'announcement' | 'tip' | 'update';
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked: boolean;
}

export default function ContractorSocialPage2025() {
  return (
    <ErrorBoundary componentName="ContractorSocialPage">
      <ContractorSocialContent />
    </ErrorBoundary>
  );
}

function ContractorSocialContent() {
  const { user, loading: loadingUser } = useCurrentUser();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [filter, setFilter] = useState<'all' | 'portfolio' | 'following'>('all');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<File[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Fetch posts
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      try {
        const response = await fetch(`/api/contractor/social/posts?filter=${filter}`);
        if (!response.ok) throw new Error('Failed to fetch posts');

        const data = await response.json();

        interface SocialPostApiResponse {
          id: string;
          contractor_id: string;
          content: string;
          media_urls?: string[];
          post_type?: 'portfolio' | 'announcement' | 'tip' | 'update';
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          created_at: string;
          is_liked?: boolean;
          contractor?: {
            first_name?: string;
            last_name?: string;
            company_name?: string;
            profile_image_url?: string;
            admin_verified?: boolean;
          };
        }

        // Transform API data
        const transformedPosts: SocialPost[] = (data.posts || []).map((post: SocialPostApiResponse) => ({
          id: post.id,
          contractor: {
            id: post.contractor_id,
            name: `${post.contractor?.first_name || ''} ${post.contractor?.last_name || ''}`.trim() || 'Unknown',
            company: post.contractor?.company_name,
            avatar: post.contractor?.profile_image_url,
            verified: post.contractor?.admin_verified || false,
          },
          content: post.content || '',
          images: post.media_urls || [],
          postType: post.post_type || 'update',
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          shares: post.shares_count || 0,
          timestamp: post.created_at,
          isLiked: post.is_liked || false,
        }));

        setPosts(transformedPosts);
      } catch (error) {
        toast.error('Failed to load posts');
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [user, filter]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && newPostImages.length === 0) {
      toast.error('Please add content or images');
      return;
    }

    setIsPosting(true);
    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (newPostImages.length > 0) {
        const formData = new FormData();
        newPostImages.forEach(file => formData.append('images', file));

        const uploadResponse = await fetch('/api/upload/images', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload images');
        const uploadData = await uploadResponse.json();
        imageUrls = uploadData.urls || [];
      }

      // Create post
      const response = await fetch('/api/contractor/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent,
          media_urls: imageUrls,
          post_type: imageUrls.length > 0 ? 'portfolio' : 'update',
        }),
      });

      if (!response.ok) throw new Error('Failed to create post');

      toast.success('Post created successfully!');
      setNewPostContent('');
      setNewPostImages([]);
      setShowCreatePost(false);

      // Refresh posts
      setLoadingPosts(true);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    try {
      const response = await fetch(`/api/contractor/social/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });

      if (!response.ok) throw new Error('Failed to toggle like');

      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, isLiked: !isLiked, likes: isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      ));

      toast.success(isLiked ? 'Post unliked' : 'Post liked!');
    } catch (error) {
      toast.error('Failed to toggle like');
    }
  };

  const handleComment = async (postId: string) => {
    // Open comment modal or navigate to comments section
    // For now, just show a toast
    toast('Comment feature coming soon', { icon: '💬' });
  };

  const handleShare = async (postId: string) => {
    try {
      await fetch(`/api/contractor/social/posts/${postId}/share`, {
        method: 'POST',
      });

      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, shares: post.shares + 1 } : post
      ));

      toast.success('Post shared!');
    } catch (error) {
      toast.error('Failed to share post');
    }
  };

  // Redirect if not contractor
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'contractor')) {
      redirect('/login');
    }
  }, [user, loadingUser]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: 'profile_image_url' in user ? (user.profile_image_url as string | undefined) : undefined,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1200px] mx-auto px-8 py-10">
            <h1 className="text-4xl font-bold mb-2">Contractor Network</h1>
            <p className="text-teal-100 text-lg">Connect, share your work, and get inspired</p>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1200px] mx-auto px-8 py-8 w-full">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Filters & Stats */}
            <div className="col-span-12 lg:col-span-3">
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-8"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Feed Filters</h2>
                <div className="space-y-2">
                  {[
                    { label: 'All Posts', value: 'all', icon: '🌐' },
                    { label: 'Portfolio', value: 'portfolio', icon: '📸' },
                    { label: 'Following', value: 'following', icon: '👥' },
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => setFilter(item.value as 'all' | 'portfolio' | 'following')}
                      className={`w-full px-4 py-3 rounded-xl font-medium text-left transition-all flex items-center gap-3 ${
                        filter === item.value
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">Your Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Followers</span>
                      <span className="text-lg font-bold text-gray-900">324</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Following</span>
                      <span className="text-lg font-bold text-gray-900">142</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Posts</span>
                      <span className="text-lg font-bold text-gray-900">67</span>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            </div>

            {/* Main Feed */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              {/* Create Post Card */}
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-teal-600">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-gray-500 transition-colors"
                  >
                    Share your latest project or tip...
                  </button>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
                  >
                    Post
                  </button>
                </div>
              </MotionDiv>

              {/* Create Post Modal */}
              <AnimatePresence>
                {showCreatePost && (
                  <MotionDiv
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCreatePost(false)}
                  >
                    <MotionDiv
                      className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Post</h2>
                      <textarea
                        rows={6}
                        placeholder="Share your latest project, tips, or updates..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                      />

                      {/* Image Upload */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Add Photos (Optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setNewPostImages(Array.from(e.target.files || []))}
                          className="w-full"
                        />
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => setShowCreatePost(false)}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreatePost}
                          disabled={isPosting}
                          className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                        >
                          {isPosting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </MotionDiv>
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* Posts Feed */}
              {loadingPosts ? (
                <LoadingSpinner message="Loading posts..." />
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-600">Be the first to share something!</p>
                </div>
              ) : (
                <MotionDiv
                  className="space-y-6"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {posts.map((post, index) => {
                    // Transform SocialPost to ContractorPost format
                    const contractorPost = {
                      id: post.id,
                      contractorId: post.contractor.id,
                      type: post.postType === 'portfolio' ? 'portfolio' as const : 
                            post.postType === 'announcement' ? 'social' as const :
                            post.postType === 'tip' ? 'social' as const :
                            'social' as const,
                      content: post.content,
                      photos: post.images || [],
                      likes: post.likes,
                      comments: post.comments,
                      createdAt: post.timestamp,
                      contractor: {
                        first_name: post.contractor.name.split(' ')[0] || '',
                        last_name: post.contractor.name.split(' ').slice(1).join(' ') || '',
                        profile_image_url: post.contractor.avatar,
                      },
                      isLikedByUser: post.isLiked,
                    };
                    
                    return (
                      <MotionDiv key={post.id} variants={staggerItem}>
                        <SocialFeedCard2025
                          post={contractorPost}
                          onLike={(postId, isLiked) => handleLikePost(postId, isLiked)}
                          onComment={(postId) => handleComment(postId)}
                          onShare={(postId) => handleShare(postId)}
                        />
                      </MotionDiv>
                    );
                  })}
                </MotionDiv>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
