import { redirect } from 'next/navigation';

/**
 * Legacy /auth/signup route - redirects to canonical /register page
 */
export default function AuthSignupRedirect() {
  redirect('/register');
}
