
import { Redirect } from 'expo-router';

/**
 * 🔐 AUTH INDEX - REDIRECT TO SECURE LOGIN
 * 
 * This file redirects users to the secure login page with:
 * - ✅ Password hashing with bcrypt
 * - ✅ CAPTCHA verification
 * - ✅ Rate limiting
 * - ✅ Account lockout protection
 */

export default function AuthIndex() {
  // Redirect to secure login page
  return <Redirect href="/auth/login-secure" />;
}
