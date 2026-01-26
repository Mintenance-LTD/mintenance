/**
 * Authentication Guard Component
 * Protects routes/components that require authentication
 */
import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
export interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  onUnauthenticated?: () => void;
}
/**
 * Component that requires authentication
 */
export function RequireAuth({
  children,
  fallback,
  redirectTo = '/login',
  onUnauthenticated,
}: RequireAuthProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (onUnauthenticated) {
        onUnauthenticated();
      } else if (typeof window !== 'undefined' && redirectTo) {
        // Web: Redirect to login
        window.location.href = `${redirectTo}?from=${encodeURIComponent(window.location.pathname)}`;
      }
    }
  }, [isAuthenticated, isLoading, redirectTo, onUnauthenticated]);
  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      )
    );
  }
  // Not authenticated
  if (!isAuthenticated) {
    return fallback || null;
  }
  // Authenticated - render children
  return <>{children}</>;
}
/**
 * HOC version of RequireAuth
 */
export function requireAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<RequireAuthProps, 'children'>
): React.ComponentType<P> {
  return function RequireAuthComponent(props: P) {
    return (
      <RequireAuth {...options}>
        <Component {...props} />
      </RequireAuth>
    );
  };
}