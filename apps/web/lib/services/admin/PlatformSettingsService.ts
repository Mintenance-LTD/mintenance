import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'array';
export type SettingCategory = 'general' | 'email' | 'security' | 'features' | 'payment' | 'notifications';

export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: SettingType;
  category: SettingCategory;
  description?: string;
  is_public: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing platform settings
 */
export class PlatformSettingsService {
  /**
   * Get a setting by key
   */
  static async getSetting(key: string): Promise<PlatformSetting | null> {
    try {
      const { data, error } = await serverSupabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Setting not found
        }
        logger.error('Failed to get platform setting', {
          service: 'PlatformSettingsService',
          error: error.message,
          key,
        });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Exception getting platform setting', error, {
        service: 'PlatformSettingsService',
        key,
      });
      return null;
    }
  }

  /**
   * Get setting value (typed)
   */
  static async getSettingValue<T>(key: string, defaultValue?: T): Promise<T> {
    const setting = await this.getSetting(key);
    if (!setting) {
      return defaultValue as T;
    }

    return setting.setting_value as T;
  }

  /**
   * Get all settings by category
   */
  static async getSettingsByCategory(category: SettingCategory): Promise<PlatformSetting[]> {
    try {
      const { data, error } = await serverSupabase
        .from('platform_settings')
        .select('*')
        .eq('category', category)
        .order('setting_key', { ascending: true });

      if (error) {
        logger.error('Failed to get settings by category', {
          service: 'PlatformSettingsService',
          error: error.message,
          category,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Exception getting settings by category', error, {
        service: 'PlatformSettingsService',
        category,
      });
      return [];
    }
  }

  /**
   * Get all settings
   */
  static async getAllSettings(): Promise<PlatformSetting[]> {
    try {
      const { data, error } = await serverSupabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('setting_key', { ascending: true });

      if (error) {
        logger.error('Failed to get all platform settings', {
          service: 'PlatformSettingsService',
          error: error.message,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Exception getting all platform settings', error, {
        service: 'PlatformSettingsService',
      });
      return [];
    }
  }

  /**
   * Update a setting
   */
  static async updateSetting(
    key: string,
    value: any,
    updatedBy: string
  ): Promise<PlatformSetting | null> {
    try {
      // Get existing setting to determine type
      const existing = await this.getSetting(key);
      if (!existing) {
        logger.error('Setting not found for update', {
          service: 'PlatformSettingsService',
          key,
        });
        return null;
      }

      const { data, error } = await serverSupabase
        .from('platform_settings')
        .update({
          setting_value: value,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update platform setting', {
          service: 'PlatformSettingsService',
          error: error.message,
          key,
        });
        return null;
      }

      logger.info('Platform setting updated', {
        service: 'PlatformSettingsService',
        key,
        updatedBy,
      });

      return data;
    } catch (error) {
      logger.error('Exception updating platform setting', error, {
        service: 'PlatformSettingsService',
        key,
      });
      return null;
    }
  }

  /**
   * Create a new setting
   */
  static async createSetting(
    key: string,
    value: any,
    type: SettingType,
    category: SettingCategory,
    description: string | undefined,
    isPublic: boolean = false,
    createdBy: string
  ): Promise<PlatformSetting | null> {
    try {
      const { data, error } = await serverSupabase
        .from('platform_settings')
        .insert({
          setting_key: key,
          setting_value: value,
          setting_type: type,
          category,
          description,
          is_public: isPublic,
          updated_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create platform setting', {
          service: 'PlatformSettingsService',
          error: error.message,
          key,
        });
        return null;
      }

      logger.info('Platform setting created', {
        service: 'PlatformSettingsService',
        key,
        createdBy,
      });

      return data;
    } catch (error) {
      logger.error('Exception creating platform setting', error, {
        service: 'PlatformSettingsService',
        key,
      });
      return null;
    }
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key: string): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('platform_settings')
        .delete()
        .eq('setting_key', key);

      if (error) {
        logger.error('Failed to delete platform setting', {
          service: 'PlatformSettingsService',
          error: error.message,
          key,
        });
        return false;
      }

      logger.info('Platform setting deleted', {
        service: 'PlatformSettingsService',
        key,
      });

      return true;
    } catch (error) {
      logger.error('Exception deleting platform setting', error, {
        service: 'PlatformSettingsService',
        key,
      });
      return false;
    }
  }
}

