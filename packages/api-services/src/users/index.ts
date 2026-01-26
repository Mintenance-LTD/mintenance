/**
 * User Module Exports
 * Provides all user-related services and controllers
 */
// Export services
export { UserService } from './UserService';
export { UserRepository } from './UserRepository';
// Export controllers
export { UserProfileController } from './UserProfileController';
export { UserSettingsController } from './UserSettingsController';
export { UserAvatarController } from './UserAvatarController';
// Export types
export type {
  User,
  UserProfile,
  UserSettings,
  NotificationPreferences,
  PrivacySettings,
  DisplaySettings,
  UserStats,
} from './UserService';
export type {
  HomeownerStats,
  ContractorStats,
} from './UserRepository';
// Module info
export const MODULE_INFO = {
  name: '@mintenance/api-services/users',
  version: '1.0.0',
  description: 'User management module for Mintenance platform',
  controllers: [
    'UserProfileController',
    'UserSettingsController',
    'UserAvatarController',
  ],
  endpoints: [
    'GET /api/users/profile',
    'PUT /api/users/profile',
    'GET /api/users/settings',
    'PUT /api/users/settings',
    'GET /api/users/avatar',
    'POST /api/users/avatar',
    'DELETE /api/users/avatar',
  ],
  readiness: {
    score: 10,
    status: 'ready',
    missing: [],
    notes: 'Module fully implemented and ready for Phase 2 migration',
  },
};