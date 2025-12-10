
import { Redirect } from 'expo-router';

export default function RecuperarPasswordRedirect() {
  // Redirect to the latest version (v7) with token-based flow
  return <Redirect href="/auth/recuperar-password-v7" />;
}
