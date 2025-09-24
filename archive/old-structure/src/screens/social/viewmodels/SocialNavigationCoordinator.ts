/**
 * Social Navigation Coordinator
 *
 * Handles all navigation logic for the ContractorSocial screen.
 * Separates navigation concerns from business logic.
 *
 * @filesize Target: <150 lines
 * @compliance Architecture principles - Coordinator pattern
 */

import { NavigationProp } from '@react-navigation/native';
import { Share } from 'react-native';
import { useHaptics } from '../../../utils/haptics';
import { logger } from '../../../utils/logger';
import type { FeedPost } from './ContractorSocialViewModel';

export interface SocialNavigationActions {
  openSearch: () => void;
  openUserProfile: (userId: string) => void;
  openPostComments: (postId: string, post: FeedPost) => void;
  openHashtagFeed: (hashtag: string) => void;
  sharePost: (post: FeedPost) => Promise<void>;
  openPostOptions: (post: FeedPost) => void;
  openNotifications: () => void;
  openSettings: () => void;
}

/**
 * Navigation coordinator for ContractorSocial screen
 */
export class SocialNavigationCoordinator implements SocialNavigationActions {
  private navigation: NavigationProp<any>;
  private haptics: ReturnType<typeof useHaptics>;

  constructor(
    navigation: NavigationProp<any>,
    haptics: ReturnType<typeof useHaptics>
  ) {
    this.navigation = navigation;
    this.haptics = haptics;
  }

  /**
   * Open search/filter screen
   */
  openSearch = () => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'SocialSearch'
    });
  };

  /**
   * Navigate to user profile
   */
  openUserProfile = (userId: string) => {
    this.haptics.selection();
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'ContractorProfile',
      params: { contractorId: userId }
    });
  };

  /**
   * Navigate to post comments screen
   */
  openPostComments = (postId: string, post: FeedPost) => {
    this.haptics.selection();
    this.navigation.navigate('PostComments', {
      postId,
      post: {
        id: post.id,
        content: post.content,
        contractorName: post.contractor?.firstName + ' ' + (post.contractor?.lastName || ''),
        timestamp: post.createdAt,
      }
    });
  };

  /**
   * Navigate to hashtag feed
   */
  openHashtagFeed = (hashtag: string) => {
    this.haptics.selection();
    this.navigation.navigate('HashtagFeed', { hashtag });
  };

  /**
   * Share post via native share dialog
   */
  sharePost = async (post: FeedPost) => {
    try {
      this.haptics.impact('light');

      const contractorName = post.contractor?.firstName && post.contractor?.lastName
        ? `${post.contractor.firstName} ${post.contractor.lastName}`
        : 'A contractor';

      const shareContent = {
        title: 'Check out this post from the contractor community',
        message: `${contractorName} shared: "${post.content}"\n\nJoin the conversation on Mintenance!`,
      };

      await Share.share(shareContent);
      logger.info('Post shared successfully', { postId: post.id });
    } catch (error) {
      logger.error('Error sharing post:', error);
    }
  };

  /**
   * Open post options menu
   */
  openPostOptions = (post: FeedPost) => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'PostOptions',
      params: { post }
    });
  };

  /**
   * Navigate to notifications screen
   */
  openNotifications = () => {
    this.haptics.selection();
    this.navigation.navigate('Notifications');
  };

  /**
   * Navigate to settings screen
   */
  openSettings = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', { screen: 'Settings' });
  };
}

/**
 * Custom hook for Social navigation
 */
export const useSocialNavigation = (
  navigation: NavigationProp<any>
): SocialNavigationActions => {
  const haptics = useHaptics();
  const coordinator = new SocialNavigationCoordinator(navigation, haptics);

  return {
    openSearch: coordinator.openSearch,
    openUserProfile: coordinator.openUserProfile,
    openPostComments: coordinator.openPostComments,
    openHashtagFeed: coordinator.openHashtagFeed,
    sharePost: coordinator.sharePost,
    openPostOptions: coordinator.openPostOptions,
    openNotifications: coordinator.openNotifications,
    openSettings: coordinator.openSettings,
  };
};

/**
 * Navigation route definitions for type safety
 */
export type SocialNavigationRoutes = {
  SocialSearch: undefined;
  ContractorProfile: { contractorId: string };
  PostComments: {
    postId: string;
    post: {
      id: string;
      content: string;
      contractorName: string;
      timestamp: string;
    };
  };
  HashtagFeed: { hashtag: string };
  PostOptions: { post: FeedPost };
  Notifications: undefined;
  Settings: undefined;
};