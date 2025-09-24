import { ContractorPostType } from '../../types';
import type { ContractorPost } from '../../types';

export type FeedPost = ContractorPost & {
  contractor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    rating?: number;
    totalJobsCompleted?: number;
  };
  isLikedByUser?: boolean;
  liked?: boolean;
  saved?: boolean;
};

export class SocialFeedUtils {
  static normalizeFeedPost(post: ContractorPost): FeedPost {
    const enriched = post as FeedPost;

    return {
      ...post,
      contractor: enriched.contractor,
      hashtags: post.hashtags || [],
      likes: post.likes ?? 0,
      comments: post.comments ?? 0,
      shares: post.shares ?? 0,
      liked: enriched.liked ?? enriched.isLikedByUser ?? false,
      saved: enriched.saved ?? false,
    };
  }

  static extractHashtags(content: string): string[] {
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    return hashtags.slice(0, 10);
  }

  static getPostTypeDisplayName(type: ContractorPostType): string {
    const displayNames: Record<ContractorPostType, string> = {
      project_showcase: '🏗️ Project Showcase',
      tip: '💡 Pro Tip',
      before_after: '🔄 Before & After',
      milestone: '🎯 Milestone',
      general: '💬 General',
      question: '❓ Question',
    };
    return displayNames[type] || '💬 General';
  }

  static formatRelativeTime(isoDate: string): string {
    const date = isoDate ? new Date(isoDate) : null;
    if (!date || isNaN(date.getTime())) {
      return 'Unknown time';
    }

    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return 'Just now';
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      return `${diffWeeks}w ago`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}mo ago`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y ago`;
  }

  static getContractorName(post: FeedPost, fallbackUser?: { firstName?: string; lastName?: string }): string {
    const first = post.contractor?.firstName ?? '';
    const last = post.contractor?.lastName ?? '';
    const fullName = `${first} ${last}`.trim();

    if (fullName) {
      return fullName;
    }

    if (fallbackUser) {
      const fallback = `${fallbackUser.firstName || ''} ${fallbackUser.lastName || ''}`.trim();
      return fallback || 'Anonymous Contractor';
    }

    return 'Anonymous Contractor';
  }

  static isContractorVerified(post: FeedPost): boolean {
    return (post.contractor?.totalJobsCompleted ?? 0) >= 5 && (post.contractor?.rating ?? 0) >= 4.5;
  }

  static validatePostContent(content: string): { isValid: boolean; error?: string } {
    if (!content.trim()) {
      return { isValid: false, error: 'Post content cannot be empty' };
    }

    if (content.length > 500) {
      return { isValid: false, error: 'Post content cannot exceed 500 characters' };
    }

    if (content.trim().length < 10) {
      return { isValid: false, error: 'Post content should be at least 10 characters' };
    }

    return { isValid: true };
  }

  static getPostActionLabel(action: 'like' | 'comment' | 'share', count: number, isActive?: boolean): string {
    switch (action) {
      case 'like':
        if (count === 0) return isActive ? 'Unlike' : 'Like';
        return count === 1 ? '1 like' : `${count} likes`;
      case 'comment':
        if (count === 0) return 'Comment';
        return count === 1 ? '1 comment' : `${count} comments`;
      case 'share':
        if (count === 0) return 'Share';
        return count === 1 ? '1 share' : `${count} shares`;
      default:
        return '';
    }
  }
}