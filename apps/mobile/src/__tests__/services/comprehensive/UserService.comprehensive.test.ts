
jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));


jest.mock('../../services/UserService', () => ({
  UserService: {
    ...jest.requireActual('../../services/UserService').UserService,
    initialize: jest.fn(),
    cleanup: jest.fn(),
  }
}));

import { UserService } from '../../services/UserService';
import { supabase } from '../../../config/supabase';

jest.mock('../../../../config/supabase');

describe('UserService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Profile Management', () => {
    it('should get current user profile', async () => {
      const mockProfile = {
        id: 'user_123',
        email: 'user@example.com',
        full_name: 'John Doe',
        role: 'homeowner',
        created_at: '2024-01-01T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      const profile = await UserService.getCurrentUserProfile();

      expect(profile).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should update user profile', async () => {
      const updates = {
        full_name: 'Jane Doe',
        phone: '+1234567890',
        address: '123 Main St',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { ...updates }, error: null }),
      });

      const result = await UserService.updateProfile('user_123', updates);

      expect(result.full_name).toBe('Jane Doe');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle profile update errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' }
        }),
      });

      await expect(
        UserService.updateProfile('user_123', { full_name: 'Test' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('User Preferences', () => {
    it('should save user preferences', async () => {
      const preferences = {
        notifications: true,
        email_updates: false,
        theme: 'dark',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ data: preferences, error: null }),
      });

      const result = await UserService.savePreferences('user_123', preferences);

      expect(result).toEqual(preferences);
    });

    it('should get user preferences', async () => {
      const mockPreferences = {
        notifications: true,
        email_updates: true,
        theme: 'light',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPreferences, error: null }),
      });

      const preferences = await UserService.getPreferences('user_123');

      expect(preferences).toEqual(mockPreferences);
    });
  });

  describe('User Deletion', () => {
    it('should delete user account', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await UserService.deleteAccount('user_123');

      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle deletion with active jobs', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User has active jobs' }
        }),
      });

      await expect(UserService.deleteAccount('user_123')).rejects.toThrow(
        'User has active jobs'
      );
    });
  });
});