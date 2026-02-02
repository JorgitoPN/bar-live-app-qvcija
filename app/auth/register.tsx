
import { Redirect } from 'expo-router';

/**
 * 🔐 DEPRECATED - REDIRECT TO SECURE REGISTRATION
 * 
 * This page has been replaced with a secure version that includes:
 * - ✅ Password strength validation
 * - ✅ CAPTCHA verification
 * - ✅ Password hashing with bcrypt
 * - ✅ Email verification required
 * - ✅ Common password detection
 */

export default function RegisterScreen() {
  // Redirect to secure registration page
  return <Redirect href="/auth/registro-seguro" />;
}
