/**
 * User Service - Business Logic Layer
 * Handles all user-related business operations
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { UserRepository } from './UserRepository';
// User type definitions
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
  email_verified?: boolean;
  phone?: string;
  phone_verified?: boolean;
  profile_image_url?: string;
  company_name?: string;
  bio?: string;
  location?: string;
  notification_preferences?: NotificationPreferences;
  settings?: UserSettings;
}
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  profile_image_url?: string;
  company_name?: string;
  bio?: string;
  location?: string;
  role: string;
  created_at: string;
  stats?: UserStats;
}
export interface UserSettings {
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  display: DisplaySettings;
}
export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  new_jobs: boolean;
  bid_updates: boolean;
  messages: boolean;
  marketing: boolean;
}
export interface PrivacySettings {
  profile_visible: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_location: boolean;
}
export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
}
export interface UserStats {
  jobs_posted?: number;
  jobs_completed?: number;
  bids_placed?: number;
  bids_won?: number;
  average_rating?: number;
  total_reviews?: number;
  response_time?: string;
  member_since?: string;
}
// Validation schemas
const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  company_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});
const UpdateSettingsSchema = z.object({
  notifications: z.object({
    email_notifications: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    sms_notifications: z.boolean().optional(),
    new_jobs: z.boolean().optional(),
    bid_updates: z.boolean().optional(),
    messages: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    profile_visible: z.boolean().optional(),
    show_phone: z.boolean().optional(),
    show_email: z.boolean().optional(),
    show_location: z.boolean().optional(),
  }).optional(),
  display: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    date_format: z.string().optional(),
  }).optional(),
});
// Temporary logger until @mintenance/shared is available

// Placeholder services
class FileUploadService {
  async uploadProfileImage(userId: string, file: unknown): Promise<string> {
    logger.info('Would upload profile image', { userId });
    return `https://storage.example.com/profiles/${userId}/avatar.jpg`;
  }
  async deleteProfileImage(userId: string): Promise<void> {
    logger.info('Would delete profile image', { userId });
  }
}
class CacheService {
  async get(key: string): Promise<unknown> {
    return null;
  }
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    logger.info('Would cache', { key, ttl });
  }
  async delete(key: string): Promise<void> {
    logger.info('Would delete cache', { key });
  }
}
export class UserService {
  private repository: UserRepository;
  private fileUploadService: FileUploadService;
  private cacheService: CacheService;
  constructor(supabase: SupabaseClient) {
    this.repository = new UserRepository(supabase);
    this.fileUploadService = new FileUploadService();
    this.cacheService = new CacheService();
  }
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      logger.info('Getting user profile', { userId });
      // Try cache first
      const cacheKey = `user:profile:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        logger.info('Profile found in cache', { userId });
        return cached;
      }
      // Get from database
      const user = await this.repository.findById(userId);
      if (!user) {
        logger.warn('User not found', { userId });
        return null;
      }
      // Get user stats
      const stats = await this.getUserStats(userId, user.role);
      // Build profile
      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        profile_image_url: user.profile_image_url,
        company_name: user.company_name,
        bio: user.bio,
        location: user.location,
        role: user.role,
        created_at: user.created_at,
        stats,
      };
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, profile, 300);
      return profile;
    } catch (error) {
      logger.error('Failed to get user profile', { error, userId });
      throw error;
    }
  }
  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      logger.info('Updating user profile', { userId, updates });
      // Validate updates
      const validated = UpdateProfileSchema.parse(updates);
      // Update in database
      const updated = await this.repository.update(userId, validated);
      // Clear cache
      await this.cacheService.delete(`user:profile:${userId}`);
      // Get fresh profile
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error('Failed to get updated profile');
      }
      logger.info('Profile updated successfully', { userId });
      return profile;
    } catch (error) {
      logger.error('Failed to update profile', { error, userId });
      throw error;
    }
  }
  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<UserSettings> {
    try {
      logger.info('Getting user settings', { userId });
      const user = await this.repository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      // Return settings or defaults
      return (user as any).settings || this.getDefaultSettings();
    } catch (error) {
      logger.error('Failed to get settings', { error, userId });
      throw error;
    }
  }
  /**
   * Update user settings
   */
  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      logger.info('Updating user settings', { userId, updates });
      // Validate updates
      const validated = UpdateSettingsSchema.parse(updates);
      // Get current settings
      const current = await this.getSettings(userId);
      // Merge updates
      const merged: UserSettings = {
        notifications: { ...current.notifications, ...validated.notifications },
        privacy: { ...current.privacy, ...validated.privacy },
        display: { ...current.display, ...validated.display },
      };
      // Update in database
      await this.repository.updateSettings(userId, merged);
      logger.info('Settings updated successfully', { userId });
      return merged;
    } catch (error) {
      logger.error('Failed to update settings', { error, userId });
      throw error;
    }
  }
  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: unknown): Promise<string> {
    try {
      logger.info('Uploading user avatar', { userId });
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }
      // TODO: Add file validation (size, type, etc.)
      // Delete old avatar if exists
      const user = await this.repository.findById(userId);
      if (user?.profile_image_url) {
        await this.fileUploadService.deleteProfileImage(userId);
      }
      // Upload new avatar
      const url = await this.fileUploadService.uploadProfileImage(userId, file);
      // Update user record
      await this.repository.update(userId, { profile_image_url: url });
      // Clear cache
      await this.cacheService.delete(`user:profile:${userId}`);
      logger.info('Avatar uploaded successfully', { userId, url });
      return url;
    } catch (error) {
      logger.error('Failed to upload avatar', { error, userId });
      throw error;
    }
  }
  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    try {
      logger.info('Deleting user avatar', { userId });
      // Delete from storage
      await this.fileUploadService.deleteProfileImage(userId);
      // Update user record
      await this.repository.update(userId, { profile_image_url: undefined });
      // Clear cache
      await this.cacheService.delete(`user:profile:${userId}`);
      logger.info('Avatar deleted successfully', { userId });
    } catch (error) {
      logger.error('Failed to delete avatar', { error, userId });
      throw error;
    }
  }
  /**
   * Get user stats based on role
   */
  private async getUserStats(userId: string, role: string): Promise<UserStats> {
    try {
      const stats: UserStats = {
        member_since: new Date().toISOString(),
      };
      if (role === 'homeowner') {
        // Get homeowner-specific stats
        const homeownerStats = await this.repository.getHomeownerStats(userId);
        stats.jobs_posted = homeownerStats.jobs_posted;
        stats.jobs_completed = homeownerStats.jobs_completed;
      } else if (role === 'contractor') {
        // Get contractor-specific stats
        const contractorStats = await this.repository.getContractorStats(userId);
        stats.bids_placed = contractorStats.bids_placed;
        stats.bids_won = contractorStats.bids_won;
        stats.average_rating = contractorStats.average_rating;
        stats.total_reviews = contractorStats.total_reviews;
        stats.response_time = contractorStats.response_time;
      }
      return stats;
    } catch (error) {
      logger.error('Failed to get user stats', { error, userId });
      return {};
    }
  }
  /**
   * Get default settings for new users
   */
  private getDefaultSettings(): UserSettings {
    return {
      notifications: {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        new_jobs: true,
        bid_updates: true,
        messages: true,
        marketing: false,
      },
      privacy: {
        profile_visible: true,
        show_phone: false,
        show_email: false,
        show_location: true,
      },
      display: {
        theme: 'system',
        language: 'en',
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
      },
    };
  }
  /**
   * Validate user permissions
   */
  async canUpdateProfile(userId: string, targetUserId: string): Promise<boolean> {
    // Users can only update their own profile (unless admin)
    if (userId === targetUserId) {
      return true;
    }
    // Check if user is admin
    const user = await this.repository.findById(userId);
    return user?.role === 'admin';
  }
  /**
   * Search users (admin only)
   */
  async searchUsers(query: string, filters?: unknown): Promise<User[]> {
    try {
      logger.info('Searching users', { query, filters });
      return await this.repository.search(query, filters);
    } catch (error) {
      logger.error('Failed to search users', { error });
      throw error;
    }
  }
}