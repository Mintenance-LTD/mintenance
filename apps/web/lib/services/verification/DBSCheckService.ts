import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * UK DBS Check Levels
 */
export type DBSCheckLevel = 'basic' | 'standard' | 'enhanced';

/**
 * DBS Check Status
 */
export type DBSCheckStatus = 'pending' | 'in_progress' | 'clear' | 'flagged' | 'expired' | 'rejected';

/**
 * UK DBS Provider Options
 */
export type DBSProvider = 'dbs_online' | 'gbgroup' | 'ucheck' | 'custom';

/**
 * DBS Check Result
 */
export interface DBSCheckResult {
  id: string;
  contractorId: string;
  dbsType: DBSCheckLevel;
  status: DBSCheckStatus;
  certificateNumber?: string;
  checkDate?: Date;
  issueDate?: Date;
  expiryDate?: Date;
  provider?: DBSProvider;
  providerCheckId?: string;
  boostPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DBS Check Pricing (UK 2025)
 */
export const DBS_PRICING = {
  basic: { price: 23, boost: 10, description: 'Unspent convictions and conditional cautions' },
  standard: { price: 26, boost: 15, description: 'Spent and unspent convictions, cautions, reprimands, warnings' },
  enhanced: { price: 50, boost: 25, description: 'Everything in Standard + local police information' },
} as const;

/**
 * Service for managing UK DBS (Disclosure and Barring Service) checks
 * Integrates with UK DBS providers for background screening
 */
export class DBSCheckService {
  /**
   * Initiate a DBS check for a contractor
   */
  static async initiateCheck(
    contractorId: string,
    dbsType: DBSCheckLevel = 'basic',
    provider: DBSProvider = 'dbs_online'
  ): Promise<{ success: boolean; checkId?: string; error?: string }> {
    try {
      // Verify contractor exists and is a contractor role
      const { data: contractor, error: contractorError } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role, date_of_birth, address_line1, address_line2, city, postal_code, country')
        .eq('id', contractorId)
        .single();

      if (contractorError || !contractor) {
        logger.error('Contractor not found for DBS check', {
          service: 'DBSCheckService',
          contractorId,
          error: contractorError?.message,
        });
        return { success: false, error: 'Contractor not found' };
      }

      if (contractor.role !== 'contractor') {
        return { success: false, error: 'DBS checks are only available for contractors' };
      }

      // Check for existing active DBS check
      const { data: existingCheck } = await serverSupabase
        .from('contractor_dbs_checks')
        .select('id, status, expiry_date')
        .eq('contractor_id', contractorId)
        .in('status', ['in_progress', 'clear'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCheck) {
        if (existingCheck.status === 'in_progress') {
          return { success: false, error: 'A DBS check is already in progress' };
        }
        if (existingCheck.status === 'clear' && existingCheck.expiry_date) {
          const expiryDate = new Date(existingCheck.expiry_date);
          if (expiryDate > new Date()) {
            return { success: false, error: 'An active DBS check already exists' };
          }
        }
      }

      // Calculate expiry date (3 years from now for UK DBS)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);

      // Calculate boost percentage
      const boostPercentage = DBS_PRICING[dbsType].boost;

      // Create DBS check record
      const { data: dbsCheck, error: insertError } = await serverSupabase
        .from('contractor_dbs_checks')
        .insert({
          contractor_id: contractorId,
          dbs_type: dbsType,
          status: 'in_progress',
          provider: provider,
          expiry_date: expiryDate.toISOString().split('T')[0],
          boost_percentage: boostPercentage,
        })
        .select()
        .single();

      if (insertError || !dbsCheck) {
        logger.error('Failed to create DBS check record', {
          service: 'DBSCheckService',
          contractorId,
          error: insertError?.message,
        });
        return { success: false, error: 'Failed to initiate DBS check' };
      }

      // Initiate check with provider
      let providerCheckId: string;
      try {
        switch (provider) {
          case 'dbs_online':
            providerCheckId = await this.initiateDBSOnlineCheck(contractor, dbsType);
            break;
          case 'gbgroup':
            providerCheckId = await this.initiateGBGroupCheck(contractor, dbsType);
            break;
          case 'ucheck':
            providerCheckId = await this.initiateUCheckCheck(contractor, dbsType);
            break;
          default:
            providerCheckId = await this.initiateCustomCheck(contractor, dbsType);
        }
      } catch (providerError) {
        logger.error('DBS provider error', providerError, {
          service: 'DBSCheckService',
          contractorId,
          provider,
        });
        // Revert status
        await serverSupabase
          .from('contractor_dbs_checks')
          .update({ status: 'pending' })
          .eq('id', dbsCheck.id);
        return { success: false, error: 'Failed to initiate check with provider' };
      }

      // Update record with provider check ID
      await serverSupabase
        .from('contractor_dbs_checks')
        .update({ provider_check_id: providerCheckId })
        .eq('id', dbsCheck.id);

      // Log verification event
      await this.logVerificationEvent(contractorId, 'dbs_check_initiated', {
        dbs_type: dbsType,
        provider: provider,
        check_id: dbsCheck.id,
      });

      logger.info('DBS check initiated successfully', {
        service: 'DBSCheckService',
        contractorId,
        dbsType,
        provider,
        checkId: dbsCheck.id,
      });

      return { success: true, checkId: dbsCheck.id };
    } catch (error) {
      logger.error('Error initiating DBS check', error, {
        service: 'DBSCheckService',
        contractorId,
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * DBS Online integration (UK provider)
   * https://www.dbscheckonline.org.uk/
   */
  private static async initiateDBSOnlineCheck(
    contractor: unknown,
    dbsType: DBSCheckLevel
  ): Promise<string> {
    const apiKey = process.env.DBS_ONLINE_API_KEY;

    if (!apiKey) {
      logger.warn('DBS Online API key not configured, using mock', {
        service: 'DBSCheckService',
      });
      return `dbs_online_mock_${Date.now()}`;
    }

    // TODO: Implement actual DBS Online API integration
    // Example API call structure:
    // const response = await fetch('https://api.dbscheckonline.org.uk/v1/checks', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     first_name: contractor.first_name,
    //     last_name: contractor.last_name,
    //     email: contractor.email,
    //     date_of_birth: contractor.date_of_birth,
    //     address: {
    //       line1: contractor.address_line1,
    //       line2: contractor.address_line2,
    //       city: contractor.city,
    //       postcode: contractor.postal_code,
    //     },
    //     check_type: dbsType,
    //   }),
    // });
    // const data = await response.json();
    // return data.check_id;

    return `dbs_online_${dbsType}_${Date.now()}`;
  }

  /**
   * GB Group integration (UK provider)
   * https://www.gbgplc.com/en/solutions/identity/criminal-record-checks/
   */
  private static async initiateGBGroupCheck(
    contractor: unknown,
    dbsType: DBSCheckLevel
  ): Promise<string> {
    const apiKey = process.env.GBGROUP_API_KEY;

    if (!apiKey) {
      return `gbgroup_mock_${Date.now()}`;
    }

    // TODO: Implement GB Group API integration
    return `gbgroup_${dbsType}_${Date.now()}`;
  }

  /**
   * uCheck integration (UK provider)
   * https://ucheck.co.uk/
   */
  private static async initiateUCheckCheck(
    contractor: unknown,
    dbsType: DBSCheckLevel
  ): Promise<string> {
    const apiKey = process.env.UCHECK_API_KEY;

    if (!apiKey) {
      return `ucheck_mock_${Date.now()}`;
    }

    // TODO: Implement uCheck API integration
    return `ucheck_${dbsType}_${Date.now()}`;
  }

  /**
   * Custom/placeholder implementation
   */
  private static async initiateCustomCheck(
    contractor: unknown,
    dbsType: DBSCheckLevel
  ): Promise<string> {
    return `custom_${dbsType}_${Date.now()}`;
  }

  /**
   * Update DBS check status (called by webhook or manual admin action)
   */
  static async updateCheckStatus(
    checkId: string,
    status: DBSCheckStatus,
    data?: {
      certificateNumber?: string;
      checkDate?: string;
      issueDate?: string;
      disclosureDetails?: unknown;
      adminNotes?: string;
    }
  ): Promise<boolean> {
    try {
      const updateData: unknown = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'clear' || status === 'flagged') {
        if (data?.certificateNumber) updateData.certificate_number = data.certificateNumber;
        if (data?.checkDate) updateData.check_date = data.checkDate;
        if (data?.issueDate) updateData.issue_date = data.issueDate;
        if (data?.disclosureDetails) updateData.disclosure_details = data.disclosureDetails;
        if (data?.adminNotes) updateData.admin_notes = data.adminNotes;
        updateData.profile_boost_applied = status === 'clear';
      }

      const { error } = await serverSupabase
        .from('contractor_dbs_checks')
        .update(updateData)
        .eq('id', checkId);

      if (error) {
        logger.error('Failed to update DBS check status', {
          service: 'DBSCheckService',
          checkId,
          error: error.message,
        });
        return false;
      }

      // If status is clear, recalculate profile boost
      if (status === 'clear') {
        const { data: check } = await serverSupabase
          .from('contractor_dbs_checks')
          .select('contractor_id')
          .eq('id', checkId)
          .single();

        if (check) {
          await this.recalculateProfileBoost(check.contractor_id);
          await this.logVerificationEvent(check.contractor_id, 'dbs_check_completed', {
            status: 'clear',
            check_id: checkId,
          });
        }
      }

      logger.info('DBS check status updated', {
        service: 'DBSCheckService',
        checkId,
        status,
      });

      return true;
    } catch (error) {
      logger.error('Error updating DBS check status', error, {
        service: 'DBSCheckService',
        checkId,
      });
      return false;
    }
  }

  /**
   * Get DBS check status for a contractor
   */
  static async getCheckStatus(contractorId: string): Promise<DBSCheckResult | null> {
    try {
      const { data: check, error } = await serverSupabase
        .from('contractor_dbs_checks')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !check) {
        return null;
      }

      return {
        id: check.id,
        contractorId: check.contractor_id,
        dbsType: check.dbs_type as DBSCheckLevel,
        status: check.status as DBSCheckStatus,
        certificateNumber: check.certificate_number || undefined,
        checkDate: check.check_date ? new Date(check.check_date) : undefined,
        issueDate: check.issue_date ? new Date(check.issue_date) : undefined,
        expiryDate: check.expiry_date ? new Date(check.expiry_date) : undefined,
        provider: check.provider as DBSProvider,
        providerCheckId: check.provider_check_id || undefined,
        boostPercentage: check.boost_percentage || 0,
        createdAt: new Date(check.created_at),
        updatedAt: new Date(check.updated_at),
      };
    } catch (error) {
      logger.error('Error getting DBS check status', error, {
        service: 'DBSCheckService',
        contractorId,
      });
      return null;
    }
  }

  /**
   * Check if contractor has valid DBS check
   */
  static async hasValidDBSCheck(contractorId: string): Promise<boolean> {
    try {
      const { data: check } = await serverSupabase
        .from('contractor_dbs_checks')
        .select('status, expiry_date')
        .eq('contractor_id', contractorId)
        .eq('status', 'clear')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!check) return false;

      if (check.expiry_date) {
        const expiryDate = new Date(check.expiry_date);
        return expiryDate > new Date();
      }

      return true;
    } catch (error) {
      logger.error('Error checking valid DBS status', error, {
        service: 'DBSCheckService',
        contractorId,
      });
      return false;
    }
  }

  /**
   * Get contractors with expiring DBS checks (for reminder emails)
   */
  static async getExpiringChecks(daysUntilExpiry: number = 30): Promise<DBSCheckResult[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

      const { data: checks, error } = await serverSupabase
        .from('contractor_dbs_checks')
        .select('*')
        .eq('status', 'clear')
        .eq('expiry_reminder_sent', false)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0]);

      if (error || !checks) {
        return [];
      }

      return checks.map(check => ({
        id: check.id,
        contractorId: check.contractor_id,
        dbsType: check.dbs_type as DBSCheckLevel,
        status: check.status as DBSCheckStatus,
        certificateNumber: check.certificate_number || undefined,
        checkDate: check.check_date ? new Date(check.check_date) : undefined,
        issueDate: check.issue_date ? new Date(check.issue_date) : undefined,
        expiryDate: check.expiry_date ? new Date(check.expiry_date) : undefined,
        provider: check.provider as DBSProvider,
        providerCheckId: check.provider_check_id || undefined,
        boostPercentage: check.boost_percentage || 0,
        createdAt: new Date(check.created_at),
        updatedAt: new Date(check.updated_at),
      }));
    } catch (error) {
      logger.error('Error getting expiring DBS checks', error, {
        service: 'DBSCheckService',
      });
      return [];
    }
  }

  /**
   * Mark expiry reminder as sent
   */
  static async markExpiryReminderSent(checkId: string): Promise<void> {
    await serverSupabase
      .from('contractor_dbs_checks')
      .update({ expiry_reminder_sent: true })
      .eq('id', checkId);
  }

  /**
   * Recalculate profile boost for contractor
   */
  private static async recalculateProfileBoost(contractorId: string): Promise<void> {
    try {
      await serverSupabase.rpc('calculate_contractor_profile_boost', {
        p_contractor_id: contractorId,
      });

      await this.logVerificationEvent(contractorId, 'profile_boost_recalculated', {
        trigger: 'dbs_check_completion',
      });
    } catch (error) {
      logger.error('Error recalculating profile boost', error, {
        service: 'DBSCheckService',
        contractorId,
      });
    }
  }

  /**
   * Log verification event
   */
  private static async logVerificationEvent(
    contractorId: string,
    eventType: string,
    eventData: unknown
  ): Promise<void> {
    try {
      await serverSupabase.from('contractor_verification_events').insert({
        contractor_id: contractorId,
        event_type: eventType,
        event_category: 'dbs',
        event_data: eventData,
        trigger_source: 'system_automated',
      });
    } catch (error) {
      logger.error('Error logging verification event', error, {
        service: 'DBSCheckService',
        contractorId,
        eventType,
      });
    }
  }
}
