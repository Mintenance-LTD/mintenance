/**
 * Social feed types for contractor networking features
 */

import type { User } from '@mintenance/types';

/**
 * Social post from contractor
 */
export interface SocialPost {
  id: string;
  author_id: string;
  content: string;
  content_html?: string;
  post_type: 'update' | 'project_showcase' | 'tip' | 'question' | 'announcement' | 'job_completed';
  images: string[];
  video_url?: string;
  tags: string[];
  location?: string;
  job_id?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  visibility: 'public' | 'connections' | 'private';
  created_at: string;
  updated_at: string;
  // Populated fields
  author?: User;
  liked?: boolean;
  saved?: boolean;
  comments?: SocialComment[];
}

/**
 * Comment on a social post
 */
export interface SocialComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id?: string;
  content: string;
  content_html?: string;
  images: string[];
  likes_count: number;
  replies_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // Populated fields
  author?: User;
  liked?: boolean;
  replies?: SocialComment[];
}

/**
 * Like on a post or comment
 */
export interface SocialLike {
  id: string;
  user_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  created_at: string;
}

/**
 * Share of a post
 */
export interface SocialShare {
  id: string;
  user_id: string;
  post_id: string;
  share_type: 'repost' | 'quote' | 'external';
  quote_content?: string;
  external_platform?: string;
  created_at: string;
}

/**
 * Connection between contractors
 */
export interface SocialConnection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  requested_at: string;
  responded_at?: string;
  // Populated fields
  requester?: User;
  receiver?: User;
}

/**
 * Follow relationship (one-way)
 */
export interface SocialFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * Social feed filter options
 */
export interface SocialFeedFilters {
  post_types?: SocialPost['post_type'][];
  tags?: string[];
  author_id?: string;
  connections_only?: boolean;
  has_images?: boolean;
  has_video?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: 'recent' | 'popular' | 'relevant';
}

/**
 * Social feed response
 */
export interface SocialFeedResponse {
  posts: SocialPost[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * Notification for social activity
 */
export interface SocialNotification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'reply' | 'mention' | 'share' | 'follow' | 'connection_request' | 'connection_accepted';
  actor_id: string;
  target_type: 'post' | 'comment' | 'profile';
  target_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  // Populated fields
  actor?: User;
}

/**
 * Mention in a post or comment
 */
export interface SocialMention {
  id: string;
  post_id?: string;
  comment_id?: string;
  mentioned_user_id: string;
  mentioned_by_id: string;
  created_at: string;
}

/**
 * Hashtag tracking
 */
export interface SocialHashtag {
  id: string;
  tag: string;
  post_count: number;
  trending_score: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create post request
 */
export interface CreatePostRequest {
  content: string;
  post_type: SocialPost['post_type'];
  images?: File[];
  video_url?: string;
  tags?: string[];
  location?: string;
  job_id?: string;
  visibility?: SocialPost['visibility'];
}

/**
 * Update post request
 */
export interface UpdatePostRequest {
  content?: string;
  tags?: string[];
  visibility?: SocialPost['visibility'];
  is_pinned?: boolean;
}

/**
 * Create comment request
 */
export interface CreateCommentRequest {
  post_id: string;
  parent_comment_id?: string;
  content: string;
  images?: File[];
}

