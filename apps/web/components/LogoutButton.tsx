'use client';

import { logger } from '@/lib/logger';
import { SessionManager } from '@/lib/session-manager';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Clear session data
      const sessionManager = SessionManager.getInstance();
      sessionManager.clearSession();

      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      logger.error('Logout failed', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
    >
      Logout
    </button>
  );
}