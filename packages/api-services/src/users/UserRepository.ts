/**
 * User Repository - Data Access Layer
 * Handles all user-related database operations
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';
import type { UserSettings } from './UserService';
// Temporary logger until @mintenance/shared is available

export interface HomeownerStats {
  jobs_posted: number;
  jobs_completed: number;
}
export interface ContractorStats {
  bids_placed: number;
  bids_won: number;
  average_rating: number;
  total_reviews: number;
  response_time: string;
}
export class UserRepository {
  constructor(private supabase: SupabaseClient) {}
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }
      return this.mapToUser(data);
    } catch (error) {
      logger.error('Failed to find user by ID', { error, id });
      throw error;
    }
  }
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }
      return this.mapToUser(data);
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      throw error;
    }
  }
  /**
   * Create new user
   */
  async create(userData: unknown): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          email: userData.email?.toLowerCase(),
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          phone: userData.phone,
          email_verified: userData.email_verified || false,
          phone_verified: userData.phone_verified || false,
          profile_image_url: userData.profile_image_url,
          company_name: userData.company_name,
          bio: userData.bio,
          location: userData.location,
          settings: userData.settings || this.getDefaultSettings(),
          notification_preferences: userData.notification_preferences || this.getDefaultNotificationPreferences(),
        })
        .select()
        .single();
      if (error) {
        throw error;
      }
      logger.info('User created successfully', { id: data.id });
      return this.mapToUser(data);
    } catch (error) {
      logger.error('Failed to create user', { error });
      throw error;
    }
  }
  /**
   * Update user
   */
  async update(id: string, updates: unknown): Promise<User> {
    try {
      // Remove undefined values and system fields
      const cleanedUpdates = Object.entries(updates)
        .filter(([_, value]) => value !== undefined)
        .filter(([key, _]) => !['id', 'created_at', 'updated_at'].includes(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      if (Object.keys(cleanedUpdates).length === 0) {
        logger.warn('No valid updates provided', { id });
        const user = await this.findById(id);
        if (!user) throw new Error('User not found');
        return user;
      }
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...cleanedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        throw error;
      }
      logger.info('User updated successfully', { id });
      return this.mapToUser(data);
    } catch (error) {
      logger.error('Failed to update user', { error, id });
      throw error;
    }
  }
  /**
   * Update user settings
   */
  async updateSettings(id: string, settings: UserSettings): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          settings,
          notification_preferences: settings.notifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) {
        throw error;
      }
      logger.info('User settings updated', { id });
    } catch (error) {
      logger.error('Failed to update settings', { error, id });
      throw error;
    }
  }
  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) {
        throw error;
      }
      logger.info('User soft deleted', { id });
    } catch (error) {
      logger.error('Failed to delete user', { error, id });
      throw error;
    }
  }
  /**
   * Search users
   */
  async search(query: string, filters?: unknown): Promise<User[]> {
    try {
      let queryBuilder = this.supabase
        .from('users')
        .select('*')
        .is('deleted_at', null);
      // Add search conditions
      if (query) {
        queryBuilder = queryBuilder.or(
          `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,company_name.ilike.%${query}%`
        );
      }
      // Add filters
      if (filters?.role) {
        queryBuilder = queryBuilder.eq('role', filters.role);
      }
      if (filters?.email_verified !== undefined) {
        queryBuilder = queryBuilder.eq('email_verified', filters.email_verified);
      }
      if (filters?.created_after) {
        queryBuilder = queryBuilder.gte('created_at', filters.created_after);
      }
      if (filters?.created_before) {
        queryBuilder = queryBuilder.lte('created_at', filters.created_before);
      }
      // Add pagination
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);
      // Add sorting
      const orderBy = filters?.order_by || 'created_at';
      const orderDirection = filters?.order_direction || 'desc';
      queryBuilder = queryBuilder.order(orderBy, { ascending: orderDirection === 'asc' });
      const { data, error } = await queryBuilder;
      if (error) {
        throw error;
      }
      return (data || []).map(this.mapToUser);
    } catch (error) {
      logger.error('Failed to search users', { error });
      throw error;
    }
  }
  /**
   * Get homeowner stats
   */
  async getHomeownerStats(userId: string): Promise<HomeownerStats> {
    try {
      // Count jobs posted
      const { count: jobsPosted, error: postedError } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('homeowner_id', userId);
      if (postedError) {
        throw postedError;
      }
      // Count jobs completed
      const { count: jobsCompleted, error: completedError } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('homeowner_id', userId)
        .eq('status', 'completed');
      if (completedError) {
        throw completedError;
      }
      return {
        jobs_posted: jobsPosted || 0,
        jobs_completed: jobsCompleted || 0,
      };
    } catch (error) {
      logger.error('Failed to get homeowner stats', { error, userId });
      return { jobs_posted: 0, jobs_completed: 0 };
    }
  }
  /**
   * Get contractor stats
   */
  async getContractorStats(userId: string): Promise<ContractorStats> {
    try {
      // Count bids placed
      const { count: bidsPlaced, error: placedError } = await this.supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('contractor_id', userId);
      if (placedError) {
        throw placedError;
      }
      // Count bids won
      const { count: bidsWon, error: wonError } = await this.supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('contractor_id', userId)
        .eq('status', 'accepted');
      if (wonError) {
        throw wonError;
      }
      // Get reviews and ratings
      const { data: reviews, error: reviewsError } = await this.supabase
        .from('reviews')
        .select('rating')
        .eq('contractor_id', userId);
      if (reviewsError) {
        throw reviewsError;
      }
      const totalReviews = reviews?.length || 0;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;
      // TODO: Calculate actual response time from message data
      const responseTime = '< 1 hour';
      return {
        bids_placed: bidsPlaced || 0,
        bids_won: bidsWon || 0,
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: totalReviews,
        response_time: responseTime,
      };
    } catch (error) {
      logger.error('Failed to get contractor stats', { error, userId });
      return {
        bids_placed: 0,
        bids_won: 0,
        average_rating: 0,
        total_reviews: 0,
        response_time: 'N/A',
      };
    }
  }
  /**
   * Map database record to User type
   */
  private mapToUser(data: Record<string, unknown>): unknown {
    return {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      created_at: data.created_at,
      updated_at: data.updated_at,
      email_verified: data.email_verified,
      phone: data.phone,
      phone_verified: data.phone_verified,
      profile_image_url: data.profile_image_url,
      company_name: data.company_name,
      bio: data.bio,
      location: data.location,
      notification_preferences: data.notification_preferences,
      settings: data.settings,
    };
  }
  /**
   * Get default settings
   */
  private getDefaultSettings() {
    return {
      notifications: this.getDefaultNotificationPreferences(),
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
   * Get default notification preferences
   */
  private getDefaultNotificationPreferences() {
    return {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      new_jobs: true,
      bid_updates: true,
      messages: true,
      marketing: false,
    };
  }
}
