import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export type BackgroundCheckStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'not_required';
export type BackgroundCheckProvider = 'checkr' | 'goodhire' | 'sterling' | 'custom';

/**
 * Background check result data structure
 */
export interface BackgroundCheckResultData {
  criminalRecords?: Array<{
    type: string;
    date: string;
    description: string;
    disposition?: string;
  }>;
  employmentHistory?: Array<{
    employer: string;
    position: string;
    startDate: string;
    endDate?: string;
    verified: boolean;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    graduationDate?: string;
    verified: boolean;
  }>;
  creditCheck?: {
    score?: number;
    reportDate?: string;
  };
  [key: string]: unknown; // Allow additional provider-specific fields
}

interface BackgroundCheckResult {
  status: BackgroundCheckStatus;
  provider: BackgroundCheckProvider;
  checkId: string;
  completedAt?: Date;
  result?: BackgroundCheckResultData;
}

/**
 * Service for managing background checks
 * Supports multiple providers (Checkr, GoodHire, Sterling)
 */
export class BackgroundCheckService {
  /**
   * Initiate background check for a contractor
   */
  static async initiateCheck(
    userId: string,
    provider: BackgroundCheckProvider = 'checkr'
  ): Promise<{ success: boolean; checkId?: string; error?: string }> {
    try {
      // Get user data
      const { data: user, error: userError } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.error('Failed to fetch user for background check', {
          service: 'BackgroundCheckService',
          userId,
          error: userError?.message,
        });
        return { success: false, error: 'User not found' };
      }

      if (user.role !== 'contractor') {
        return { success: false, error: 'Background checks are only available for contractors' };
      }

      // Update status to in_progress
      const { error: updateError } = await serverSupabase
        .from('profiles')
        .update({
          background_check_status: 'in_progress',
          background_check_provider: provider,
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('Failed to update background check status', {
          service: 'BackgroundCheckService',
          userId,
          error: updateError.message,
        });
        return { success: false, error: 'Failed to initiate background check' };
      }

      // Call provider-specific integration
      let checkId: string;
      try {
        switch (provider) {
          case 'checkr':
            checkId = await this.initiateCheckrCheck(user);
            break;
          case 'goodhire':
            checkId = await this.initiateGoodHireCheck(user);
            break;
          case 'sterling':
            checkId = await this.initiateSterlingCheck(user);
            break;
          default:
            // Custom/placeholder implementation
            checkId = await this.initiateCustomCheck(user);
        }
      } catch (providerError) {
        logger.error('Background check provider error', providerError, {
          service: 'BackgroundCheckService',
          userId,
          provider,
        });
        // Revert status
        await serverSupabase
          .from('profiles')
          .update({ background_check_status: 'pending' })
          .eq('id', userId);
        return { success: false, error: 'Failed to initiate background check with provider' };
      }

      // Store check ID
      await serverSupabase
        .from('profiles')
        .update({
          background_check_id: checkId,
        })
        .eq('id', userId);

      logger.info('Background check initiated', {
        service: 'BackgroundCheckService',
        userId,
        provider,
        checkId,
      });

      return { success: true, checkId };
    } catch (error) {
      logger.error('Error initiating background check', error, {
        service: 'BackgroundCheckService',
        userId,
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Checkr integration
   * Requires CHECKR_API_KEY environment variable
   */
  private static async initiateCheckrCheck(user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<string> {
    const checkrApiKey = process.env.CHECKR_API_KEY;
    if (!checkrApiKey) {
      throw new Error('Checkr API key not configured. Set CHECKR_API_KEY environment variable.');
    }

    const response = await fetch('https://api.checkr.com/v1/candidates', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(checkrApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Checkr API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * GoodHire integration
   * Requires GOODHIRE_API_KEY environment variable
   */
  private static async initiateGoodHireCheck(user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<string> {
    const goodHireApiKey = process.env.GOODHIRE_API_KEY;
    if (!goodHireApiKey) {
      throw new Error('GoodHire API key not configured. Set GOODHIRE_API_KEY environment variable.');
    }

    const response = await fetch('https://api.goodhire.com/v1/checks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${goodHireApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GoodHire API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Sterling integration
   * Requires STERLING_API_KEY environment variable
   */
  private static async initiateSterlingCheck(user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<string> {
    const sterlingApiKey = process.env.STERLING_API_KEY;
    if (!sterlingApiKey) {
      throw new Error('Sterling API key not configured. Set STERLING_API_KEY environment variable.');
    }

    const response = await fetch('https://api.sterlingcheck.com/v2/screenings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sterlingApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sterling API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Custom/placeholder implementation
   */
  private static async initiateCustomCheck(user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<string> {
    // For development/testing
    return `custom_${Date.now()}`;
  }

  /**
   * Update background check status (called by webhook or polling)
   */
  static async updateCheckStatus(
    userId: string,
    status: BackgroundCheckStatus,
    result?: BackgroundCheckResultData
  ): Promise<boolean> {
    try {
      const updateData: {
        background_check_status: BackgroundCheckStatus;
        background_check_completed_at?: string;
        background_check_result?: BackgroundCheckResultData;
      } = {
        background_check_status: status,
      };

      if (status === 'passed' || status === 'failed') {
        updateData.background_check_completed_at = new Date().toISOString();
        if (result) {
          updateData.background_check_result = result;
        }
      }

      const { error } = await serverSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        logger.error('Failed to update background check status', {
          service: 'BackgroundCheckService',
          userId,
          error: error.message,
        });
        return false;
      }

      logger.info('Background check status updated', {
        service: 'BackgroundCheckService',
        userId,
        status,
      });

      return true;
    } catch (error) {
      logger.error('Error updating background check status', error, {
        service: 'BackgroundCheckService',
        userId,
      });
      return false;
    }
  }

  /**
   * Get background check status for a user
   */
  static async getCheckStatus(userId: string): Promise<BackgroundCheckResult | null> {
    try {
      const { data: user, error } = await serverSupabase
        .from('profiles')
        .select('background_check_status, background_check_provider, background_check_id, background_check_completed_at, background_check_result')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      return {
        status: (user.background_check_status as BackgroundCheckStatus) || 'pending',
        provider: (user.background_check_provider as BackgroundCheckProvider) || 'checkr',
        checkId: user.background_check_id || '',
        completedAt: user.background_check_completed_at ? new Date(user.background_check_completed_at) : undefined,
        result: user.background_check_result || undefined,
      };
    } catch (error) {
      logger.error('Error getting background check status', error, {
        service: 'BackgroundCheckService',
        userId,
      });
      return null;
    }
  }
}

