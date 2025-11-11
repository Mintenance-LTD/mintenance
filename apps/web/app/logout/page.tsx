import { redirect } from 'next/navigation';
import { authManager } from '@/lib/auth-manager';
import { logger } from '@mintenance/shared';
import { cookies } from 'next/headers';

/**
 * Logout Page Route
 * 
 * Handles server-side logout and redirects to login page.
 * This allows users to directly navigate to /logout URL.
 */
export default async function LogoutPage() {
  try {
    // Get user from cookies to determine if they're logged in
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth-token');
    
    // Only attempt logout if user has auth cookie
    if (authCookie) {
      // Use AuthManager to handle logout server-side
      await authManager.logout();
      logger.info('User logged out via /logout route', { service: 'auth' });
    }
  } catch (error) {
    // Log error but still redirect to login
    logger.error('Logout route error', error, { service: 'auth' });
  }
  
  // Always redirect to login page
  redirect('/login');
}

