
import { AuthUser } from './auth';

// ✅ CRITICAL: Only these emails can access admin panel
export const ADMIN_EMAILS = [
  'jorgepereznoyagh@gmail.com',
  'jorgepereznoya@gmail.com', // Email alternativo sin 'gh'
];

/**
 * Check if a user has admin access
 * User must have BOTH admin role AND be one of the authorized emails
 */
export function isAdminUser(user: AuthUser | null): boolean {
  if (!user) {
    return false;
  }

  const hasAdminRole = user.rol_app === 'admin';
  const isAuthorizedEmail = ADMIN_EMAILS.includes(user.email || '');

  console.log('[AdminAccess] Checking admin access:', {
    email: user.email,
    role: user.rol_app,
    hasAdminRole,
    isAuthorizedEmail,
    hasAccess: hasAdminRole && isAuthorizedEmail,
  });

  return hasAdminRole && isAuthorizedEmail;
}

/**
 * Check if a user can access admin features
 * Returns an object with access status and reason
 */
export function checkAdminAccess(user: AuthUser | null): {
  hasAccess: boolean;
  reason?: string;
} {
  if (!user) {
    return {
      hasAccess: false,
      reason: 'No user session found',
    };
  }

  const hasAdminRole = user.rol_app === 'admin';
  const isAuthorizedEmail = ADMIN_EMAILS.includes(user.email || '');

  if (!hasAdminRole) {
    return {
      hasAccess: false,
      reason: `User role is '${user.rol_app}', not 'admin'`,
    };
  }

  if (!isAuthorizedEmail) {
    return {
      hasAccess: false,
      reason: `Email '${user.email}' is not authorized for admin access`,
    };
  }

  return {
    hasAccess: true,
  };
}
