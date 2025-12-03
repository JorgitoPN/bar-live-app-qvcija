
import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // Redirect to the latest version of login
  return <Redirect href="/auth/login-v6" />;
}
