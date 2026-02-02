
import { Redirect } from 'expo-router';

/**
 * 🔐 DEPRECATED - REDIRECT TO SECURE LOGIN
 * 
 * This page has been replaced with a secure version that includes:
 * - ✅ Password hashing with bcrypt
 * - ✅ CAPTCHA verification after 3 failed attempts
 * - ✅ Account lockout after 5 failed attempts
 * - ✅ Rate limiting
 * - ✅ Security event logging
 */

export default function LoginScreen() {
  // Redirect to secure login page
  return <Redirect href="/auth/login-secure" />;
}
