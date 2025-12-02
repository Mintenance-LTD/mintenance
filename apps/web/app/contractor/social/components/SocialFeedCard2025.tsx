'use client';

import React, { useState } from 'react';
import { cardHover, fadeIn } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionArticle, MotionButton } from '@/components/ui/MotionDiv';

interface ContractorPost {
  id: string;
  contractorId: string;
  type: 'portfolio' | 'social' | 'gallery' | 'testimonial';
  title?: string;
  content: string;
  photos: string[];
  likes: number;
  comments: number;
  createdAt: string;
  contractor?: {
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  isLikedByUser?: boolean;
}

interface SocialFeedCard2025Props {
  post: ContractorPost;
  onLike: (postId: string, isLiked: boolean) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

export function SocialFeedCard2025({ post, onLike, onComment, onShare }: SocialFeedCard2025Props) {
  const [showAllImages, setShowAllImages] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState<number | null>(null);

  const getContractorName = () => {
    if (!post.contractor) return 'Unknown Contractor';
    return `${post.contractor.first_name} ${post.contractor.last_name}`;
  };

  const getInitials = () => {
    if (!post.contractor) return 'UC';
    return `${post.contractor.first_name[0]}${post.contractor.last_name[0]}`.toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPostTypeColor = (type: string) => {
    const colors = {
      portfolio: 'bg-purple-100 text-purple-700',
      social: 'bg-blue-100 text-blue-700',
      gallery: 'bg-emerald-100 text-emerald-700',
      testimonial: 'bg-amber-100 text-amber-700',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <MotionArticle
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      variants={cardHover}
      initial="rest"
      whileHover="hover"
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Link href={`/contractors/${post.contractorId}`}>
              {post.contractor?.profile_image_url ? (
                <img
                  src={post.contractor.profile_image_url}
                  alt={getContractorName()}
                  className="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-teal-500 transition-all"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center hover:ring-2 hover:ring-teal-500 transition-all">
                  <span className="text-teal-700 font-semibold">{getInitials()}</span>
                </div>
              )}
            </Link>

            {/* Info */}
            <div>
              <Link href={`/contractors/${post.contractorId}`}>
                <h3 className="font-bold text-gray-900 hover:text-teal-600 transition-colors">
                  {getContractorName()}
                </h3>
              </Link>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatTimeAgo(post.createdAt)}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPostTypeColor(post.type)}`}>
                  {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* More Options */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {/* Title & Content */}
        {post.title && (
          <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2">{post.title}</h2>
        )}
        <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
      </div>

      {/* Images */}
      {post.photos && post.photos.length > 0 && (
        <div className="relative">
          {post.photos.length === 1 ? (
            <img
              src={post.photos[0]}
              alt={post.title || 'Post image'}
              className="w-full aspect-video object-cover cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => setImageModalIndex(0)}
            />
          ) : (
            <div className={`grid ${post.photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2'} gap-1`}>
              {post.photos.slice(0, 4).map((photo, index) => (
                <div
                  key={index}
                  className={`relative ${index === 0 && post.photos.length === 3 ? 'col-span-2' : ''} ${index === 3 && post.photos.length > 4 ? 'relative' : ''}`}
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full aspect-square object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => setImageModalIndex(index)}
                  />
                  {index === 3 && post.photos.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">
                      <span className="text-white text-2xl font-bold">+{post.photos.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-6 pt-4">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span>{post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>
          <div className="flex items-center gap-4">
            <span>{post.comments} {post.comments === 1 ? 'comment' : 'comments'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
          <MotionButton
            onClick={() => onLike(post.id, post.isLikedByUser || false)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              post.isLikedByUser
                ? 'bg-teal-50 text-teal-600'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg
              className={`w-5 h-5 ${post.isLikedByUser ? 'fill-current' : ''}`}
              fill={post.isLikedByUser ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span className="hidden sm:inline">Like</span>
          </MotionButton>

          <MotionButton
            onClick={() => onComment(post.id)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="hidden sm:inline">Comment</span>
          </MotionButton>

          <MotionButton
            onClick={() => onShare(post.id)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </MotionButton>
        </div>
      </div>
    </MotionArticle>
  );
}
