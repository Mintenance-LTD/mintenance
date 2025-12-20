/**
 * Password History Manager
 * 
 * Prevents password reuse by tracking password history.
 * Stores hashed passwords only, never plaintext.
 */

import { hashPassword, comparePassword } from './validation';

export interface PasswordHistoryEntry {
  userId: string;
  passwordHash: string;
  createdAt: Date;
}

export class PasswordHistoryManager {
  private static readonly MAX_HISTORY_SIZE = 5;

  /**
   * Check if password has been used before
   */
  static async isPasswordReused(
    userId: string,
    newPassword: string,
    passwordHistory: PasswordHistoryEntry[]
  ): Promise<boolean> {
    for (const entry of passwordHistory) {
      const matches = await comparePassword(newPassword, entry.passwordHash);
      if (matches) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add password to history
   */
  static async addToHistory(
    userId: string,
    password: string,
    existingHistory: PasswordHistoryEntry[]
  ): Promise<PasswordHistoryEntry[]> {
    const passwordHash = await hashPassword(password);
    
    const newEntry: PasswordHistoryEntry = {
      userId,
      passwordHash,
      createdAt: new Date()
    };

    // Add new entry and keep only the most recent MAX_HISTORY_SIZE entries
    const updatedHistory = [newEntry, ...existingHistory].slice(0, this.MAX_HISTORY_SIZE);

    return updatedHistory;
  }

  /**
   * Get user's password history (sorted by most recent first)
   */
  static sortHistory(history: PasswordHistoryEntry[]): PasswordHistoryEntry[] {
    return [...history].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clean up old history entries (keep only MAX_HISTORY_SIZE)
   */
  static pruneHistory(history: PasswordHistoryEntry[]): PasswordHistoryEntry[] {
    const sorted = this.sortHistory(history);
    return sorted.slice(0, this.MAX_HISTORY_SIZE);
  }
}

