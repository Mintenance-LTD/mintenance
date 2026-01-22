import { AuthService } from '../../../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../services/AuthService');

describe('Session Management - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Persistence', () => {
    it('should persist session on app launch', async () => {
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() + 3600000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSession));
      (AuthService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      const session = await AuthService.getCurrentSession();

      expect(session).toEqual(mockSession);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@auth_session');
    });

    it('should clear session on logout', async () => {
      (AuthService.signOut as jest.Mock).mockResolvedValue(undefined);

      await AuthService.signOut();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_session');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_user');
    });
  });

  describe('Session Refresh', () => {
    it('should refresh expired token automatically', async () => {
      const expiredSession = {
        access_token: 'old_token',
        refresh_token: 'refresh',
        expires_at: Date.now() - 1000, // Expired
      };

      const newSession = {
        access_token: 'new_token',
        refresh_token: 'refresh',
        expires_at: Date.now() + 3600000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredSession));
      (AuthService.refreshSession as jest.Mock).mockResolvedValue(newSession);

      const session = await AuthService.getCurrentSession();

      expect(AuthService.refreshSession).toHaveBeenCalledWith('refresh');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@auth_session',
        JSON.stringify(newSession)
      );
    });

    it('should handle refresh token failure', async () => {
      (AuthService.refreshSession as jest.Mock).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const result = await AuthService.refreshSession('invalid_token').catch(e => e);

      expect(result).toBeInstanceOf(Error);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_session');
    });
  });

  describe('Session Security', () => {
    it('should validate session token format', async () => {
      const invalidSession = { invalid: 'data' };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(invalidSession));

      const session = await AuthService.getCurrentSession();

      expect(session).toBeNull();
    });

    it('should handle corrupted session data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted{data');

      const session = await AuthService.getCurrentSession();

      expect(session).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_session');
    });
  });
});