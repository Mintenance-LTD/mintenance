import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Verified portfolio item from contractor_posts table
 */
export interface VerifiedPortfolioItem {
  id: string;
  contractor_id: string;
  post_type: 'portfolio';
  image_url?: string;
  media_urls?: string[];
  description?: string;
  title?: string;
  skills_demonstrated?: string[];
  materials_used?: string[];
  project_duration?: string;
  project_cost?: number;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown; // Allow additional fields from database
}

/**
 * Service for portfolio verification
 */
export class PortfolioVerificationService {
  /**
   * Verify portfolio item (admin)
   */
  static async verifyPortfolioItem(
    portfolioId: string,
    adminId: string
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('contractor_posts')
        .update({
          is_verified: true,
          verified_by: adminId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', portfolioId);

      if (error) {
        logger.error('Failed to verify portfolio item', {
          service: 'PortfolioVerificationService',
          portfolioId,
          adminId,
          error: error.message,
        });
        return false;
      }

      logger.info('Portfolio item verified', {
        service: 'PortfolioVerificationService',
        portfolioId,
        adminId,
      });

      return true;
    } catch (error) {
      logger.error('Error verifying portfolio item', error, {
        service: 'PortfolioVerificationService',
        portfolioId,
      });
      return false;
    }
  }

  /**
   * Unverify portfolio item (admin)
   */
  static async unverifyPortfolioItem(portfolioId: string): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('contractor_posts')
        .update({
          is_verified: false,
          verified_by: null,
          verified_at: null,
        })
        .eq('id', portfolioId);

      if (error) {
        logger.error('Failed to unverify portfolio item', {
          service: 'PortfolioVerificationService',
          portfolioId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error unverifying portfolio item', error, {
        service: 'PortfolioVerificationService',
        portfolioId,
      });
      return false;
    }
  }

  /**
   * Get verified portfolio items for a contractor
   */
  static async getVerifiedPortfolio(contractorId: string): Promise<VerifiedPortfolioItem[]> {
    try {
      const { data, error } = await serverSupabase
        .from('contractor_posts')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('is_verified', true)
        .eq('post_type', 'portfolio')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch verified portfolio', {
          service: 'PortfolioVerificationService',
          contractorId,
          error: error.message,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching verified portfolio', error, {
        service: 'PortfolioVerificationService',
        contractorId,
      });
      return [];
    }
  }
}

