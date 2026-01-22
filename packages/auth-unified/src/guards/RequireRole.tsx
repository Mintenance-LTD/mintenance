/**
 * Role-based Authorization Guard Component
 * Protects routes/components based on user roles
 */
import React, { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { RequireAuth } from './RequireAuth';
export interface RequireRoleProps {
  children: ReactNode;
  roles: string | string[];
  fallback?: ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
}
/**
 * Component that requires specific role(s)
 */
export function RequireRole({
  children,
  roles,
  fallback,
  redirectTo = '/unauthorized',
  onUnauthorized,
}: RequireRoleProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  // First require authentication
  if (!isAuthenticated) {
    return (
      <RequireAuth redirectTo="/login">
        {children}
      </RequireAuth>
    );
  }
  // Check role
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const userRole = user?.role || '';
  const hasRequiredRole = allowedRoles.includes(userRole);
  // Not authorized
  if (!hasRequiredRole) {
    if (onUnauthorized) {
      onUnauthorized();
    } else if (typeof window !== 'undefined' && redirectTo) {
      window.location.href = redirectTo;
    }
    return (
      fallback || (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Unauthorized</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      )
    );
  }
  // Authorized - render children
  return <>{children}</>;
}
/**
 * HOC version of RequireRole
 */
export function requireRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: string | string[],
  options?: Omit<RequireRoleProps, 'children' | 'roles'>
): React.ComponentType<P> {
  return function RequireRoleComponent(props: P) {
    return (
      <RequireRole roles={roles} {...options}>
        <Component {...props} />
      </RequireRole>
    );
  };
}
/**
 * Role-specific guard components
 */
export function RequireAdmin({ children, ...props }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles="admin" {...props}>{children}</RequireRole>;
}
export function RequireHomeowner({ children, ...props }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles="homeowner" {...props}>{children}</RequireRole>;
}
export function RequireContractor({ children, ...props }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles="contractor" {...props}>{children}</RequireRole>;
}
export function RequireHomeownerOrContractor({ children, ...props }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles={['homeowner', 'contractor']} {...props}>{children}</RequireRole>;
}