/**
 * Protected Services
 * Wraps existing services with API protection and rate limiting
 */

import { ProtectedSupabaseClient, ApiProtectionError } from '../utils/ApiMiddleware';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// Create protected Supabase client
const protectedSupabase = new ProtectedSupabaseClient(supabase, {
  enableProtection: true,
  bypassEndpoints: ['/health', '/status'],
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
});

/**
 * Protected Authentication Service
 */
export class ProtectedAuthService {
  /**
   * Sign up with rate limiting protection
   */
  static async signUp(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'homeowner' | 'contractor';
  }): Promise<any> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                first_name: userData.firstName,
                last_name: userData.lastName,
                role: userData.role,
                full_name: `${userData.firstName} ${userData.lastName}`,
              },
            },
          });

          if (error) throw error;
          return data;
        },
        {
          table: 'auth_signups',
          operation: 'INSERT',
          userTier: 'free', // New users start as free tier
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedAuthService', 'Sign up rate limited', {
          email: userData.email,
          reason: error.details.reason,
        });
        throw new Error('Too many sign up attempts. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Sign in with rate limiting protection
   */
  static async signIn(email: string, password: string): Promise<any> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;
          return data;
        },
        {
          table: 'auth_signin',
          operation: 'POST',
          userTier: 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedAuthService', 'Sign in rate limited', {
          email,
          reason: error.details.reason,
        });
        throw new Error('Too many login attempts. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Password reset with rate limiting
   */
  static async resetPassword(email: string): Promise<any> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) throw error;
          return data;
        },
        {
          table: 'auth_password_reset',
          operation: 'POST',
          userTier: 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedAuthService', 'Password reset rate limited', {
          email,
          reason: error.details.reason,
        });
        throw new Error('Too many password reset attempts. Please try again later.');
      }
      throw error;
    }
  }
}

/**
 * Protected Payment Service
 */
export class ProtectedPaymentService {
  /**
   * Create payment intent with protection
   */
  static async createPaymentIntent(params: {
    amount: number;
    jobId: string;
    contractorId: string;
    userId?: string;
    userTier?: string;
  }): Promise<{ client_secret: string }> {
    try {
      return await protectedSupabase.invokeFunction(
        'create-payment-intent',
        {
          body: {
            amount: Math.round(params.amount * 100), // Convert to cents
            jobId: params.jobId,
            contractorId: params.contractorId,
          },
        },
        {
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedPaymentService', 'Payment intent rate limited', {
          userId: params.userId,
          amount: params.amount,
          reason: error.details.reason,
        });
        throw new Error('Too many payment attempts. Please wait before trying again.');
      }
      throw error;
    }
  }

  /**
   * Release escrow with protection
   */
  static async releaseEscrow(params: {
    paymentIntentId: string;
    jobId: string;
    contractorId: string;
    amount: number;
    userId?: string;
    userTier?: string;
  }): Promise<{ success: boolean; transfer_id?: string }> {
    try {
      return await protectedSupabase.invokeFunction(
        'release-escrow-payment',
        {
          body: {
            paymentIntentId: params.paymentIntentId,
            jobId: params.jobId,
            contractorId: params.contractorId,
            amount: params.amount,
          },
        },
        {
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedPaymentService', 'Escrow release rate limited', {
          userId: params.userId,
          paymentIntentId: params.paymentIntentId,
          reason: error.details.reason,
        });
        throw new Error('Too many escrow operations. Please wait before trying again.');
      }
      throw error;
    }
  }

  /**
   * Process refund with protection
   */
  static async processRefund(params: {
    paymentIntentId: string;
    amount: number;
    reason: string;
    userId?: string;
    userTier?: string;
  }): Promise<{ success: boolean; refund_id?: string }> {
    try {
      return await protectedSupabase.invokeFunction(
        'process-refund',
        { body: params },
        {
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedPaymentService', 'Refund rate limited', {
          userId: params.userId,
          paymentIntentId: params.paymentIntentId,
          reason: error.details.reason,
        });
        throw new Error('Too many refund requests. Please wait before trying again.');
      }
      throw error;
    }
  }
}

/**
 * Protected Job Service
 */
export class ProtectedJobService {
  /**
   * Create job with protection
   */
  static async createJob(jobData: {
    title: string;
    description: string;
    location: string;
    budget: number;
    homeowner_id: string;
    userId?: string;
    userTier?: string;
  }): Promise<any> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase
            .from('jobs')
            .insert([{
              title: jobData.title,
              description: jobData.description,
              location: jobData.location,
              budget: jobData.budget,
              homeowner_id: jobData.homeowner_id,
              status: 'posted',
              created_at: new Date().toISOString(),
            }])
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        {
          table: 'jobs',
          operation: 'INSERT',
          userId: jobData.userId,
          userTier: jobData.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedJobService', 'Job creation rate limited', {
          userId: jobData.userId,
          title: jobData.title,
          reason: error.details.reason,
        });
        throw new Error('Too many job postings. Please wait before creating another job.');
      }
      throw error;
    }
  }

  /**
   * Search jobs with protection
   */
  static async searchJobs(params: {
    query?: string;
    location?: string;
    maxBudget?: number;
    category?: string;
    userId?: string;
    userTier?: string;
  }): Promise<any[]> {
    try {
      return await protectedSupabase.query(
        async () => {
          let queryBuilder = supabase
            .from('jobs')
            .select('*')
            .eq('status', 'posted');

          if (params.query) {
            queryBuilder = queryBuilder.textSearch('title,description', params.query);
          }

          if (params.location) {
            queryBuilder = queryBuilder.ilike('location', `%${params.location}%`);
          }

          if (params.maxBudget) {
            queryBuilder = queryBuilder.lte('budget', params.maxBudget);
          }

          if (params.category) {
            queryBuilder = queryBuilder.eq('category', params.category);
          }

          const { data, error } = await queryBuilder
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;
          return data || [];
        },
        {
          table: 'jobs',
          operation: 'SELECT',
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedJobService', 'Job search rate limited', {
          userId: params.userId,
          query: params.query,
          reason: error.details.reason,
        });
        throw new Error('Too many search requests. Please wait before searching again.');
      }
      throw error;
    }
  }
}

/**
 * Protected Messaging Service
 */
export class ProtectedMessagingService {
  /**
   * Send message with protection
   */
  static async sendMessage(params: {
    jobId: string;
    senderId: string;
    receiverId: string;
    content: string;
    userId?: string;
    userTier?: string;
  }): Promise<any> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .insert([{
              job_id: params.jobId,
              sender_id: params.senderId,
              receiver_id: params.receiverId,
              content: params.content,
              created_at: new Date().toISOString(),
            }])
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        {
          table: 'messages',
          operation: 'INSERT',
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedMessagingService', 'Message sending rate limited', {
          userId: params.userId,
          senderId: params.senderId,
          reason: error.details.reason,
        });
        throw new Error('Too many messages sent. Please wait before sending another message.');
      }
      throw error;
    }
  }

  /**
   * Get messages with protection
   */
  static async getMessages(params: {
    jobId: string;
    userId: string;
    userTier?: string;
  }): Promise<any[]> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(first_name, last_name),
              receiver:users!messages_receiver_id_fkey(first_name, last_name)
            `)
            .eq('job_id', params.jobId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          return data || [];
        },
        {
          table: 'messages',
          operation: 'SELECT',
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedMessagingService', 'Message retrieval rate limited', {
          userId: params.userId,
          jobId: params.jobId,
          reason: error.details.reason,
        });
        throw new Error('Too many message requests. Please wait before refreshing.');
      }
      throw error;
    }
  }
}

/**
 * Protected File Upload Service
 */
export class ProtectedFileUploadService {
  /**
   * Upload file with protection
   */
  static async uploadFile(params: {
    file: File | Blob;
    bucket: string;
    path: string;
    userId?: string;
    userTier?: string;
  }): Promise<{ path: string; publicUrl: string }> {
    try {
      return await protectedSupabase.query(
        async () => {
          const { data, error } = await supabase.storage
            .from(params.bucket)
            .upload(params.path, params.file);

          if (error) throw error;

          const { data: publicUrlData } = supabase.storage
            .from(params.bucket)
            .getPublicUrl(params.path);

          return {
            path: data.path,
            publicUrl: publicUrlData.publicUrl,
          };
        },
        {
          table: 'storage_uploads',
          operation: 'INSERT',
          userId: params.userId,
          userTier: params.userTier || 'free',
        }
      );
    } catch (error) {
      if (error instanceof ApiProtectionError) {
        logger.warn('ProtectedFileUploadService', 'File upload rate limited', {
          userId: params.userId,
          bucket: params.bucket,
          reason: error.details.reason,
        });
        throw new Error('Too many file uploads. Please wait before uploading again.');
      }
      throw error;
    }
  }
}

/**
 * Service to get protection statistics
 */
export class ProtectionStatsService {
  /**
   * Get current protection statistics
   */
  static getStats(): {
    activeRequests: number;
    protection: any;
  } {
    return protectedSupabase.getStats();
  }

  /**
   * Get security violations summary
   */
  static getSecuritySummary(): {
    recentViolations: number;
    blockedIPs: number;
    blockedUsers: number;
    rateLimitHits: number;
  } {
    const stats = protectedSupabase.getStats();

    return {
      recentViolations: stats.protection.recentViolations || 0,
      blockedIPs: stats.protection.blockedIPs || 0,
      blockedUsers: stats.protection.blockedUsers || 0,
      rateLimitHits: Object.values(stats.protection.rateLimiterStats || {})
        .reduce((total: number, limiter: any) => total + (limiter.limitedKeys || 0), 0),
    };
  }
}

// Re-export error for easy handling
export { ApiProtectionError };

// Export the protected supabase client for direct use if needed
export { protectedSupabase };