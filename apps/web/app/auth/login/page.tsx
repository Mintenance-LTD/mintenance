import { redirect } from 'next/navigation';

/**
 * Legacy /auth/login route - redirects to canonical /login page
 */
export default function AuthLoginRedirect() {
  redirect('/login');
}
