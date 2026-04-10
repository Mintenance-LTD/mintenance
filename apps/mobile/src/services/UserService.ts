import { User } from '@mintenance/types';
import { getContractorStats } from './user/stats';
import {
  getUserProfile,
  getHomeownerForJob,
  updateUserProfile,
} from './user/profile';
import {
  getNearbyContractors,
  getPreviousContractors,
} from './user/contractors';

export type { ContractorStats, UserProfile } from './user/types';

export class UserService {
  static getContractorStats(contractorId: string) {
    return getContractorStats(contractorId);
  }

  static getUserProfile(userId: string) {
    return getUserProfile(userId);
  }

  static getHomeownerForJob(homeownerId: string) {
    return getHomeownerForJob(homeownerId);
  }

  static updateUserProfile(userId: string, updates: Partial<User>) {
    return updateUserProfile(userId, updates);
  }

  static getNearbyContractors(
    userLatitude: number,
    userLongitude: number,
    radiusKm: number = 25,
    skillFilter?: string
  ) {
    return getNearbyContractors(
      userLatitude,
      userLongitude,
      radiusKm,
      skillFilter
    );
  }

  static getPreviousContractors(homeownerId: string) {
    return getPreviousContractors(homeownerId);
  }
}
