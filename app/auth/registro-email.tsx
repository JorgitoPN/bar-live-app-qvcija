
import { Redirect } from 'expo-router';

/**
 * 🔐 DEPRECATED - REDIRECT TO SECURE REGISTRATION
 * 
 * This page has been replaced with a secure version that includes:
 * - ✅ Password strength validation (8+ chars, uppercase, lowercase, numbers, special chars)
 * - ✅ CAPTCHA verification
 * - ✅ Password hashing with bcrypt
 * - ✅ Email verification required
 * - ✅ Common password detection
 * - ✅ Real-time password strength indicator
 */

export default function RegistroEmailScreen() {
  // Redirect to secure registration page
  return <Redirect href="/auth/registro-seguro" />;
}
