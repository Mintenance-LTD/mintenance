import { redirect } from 'next/navigation';

/**
 * Legacy /auth/forgot-password route - redirects to canonical /forgot-password page.
 * Matches the /auth/login → /login and /auth/signup → /register precedent.
 */
export default function AuthForgotPasswordRedirect() {
  redirect('/forgot-password');
}
