
import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Entry point - Redirects immediately to the main tab screen
 * Version: 3.0 - Simplified for instant navigation
 */
export default function Index() {
  console.log('[Index v3.0] 🚀 Redirecting to explorar tab');
  return <Redirect href="/(tabs)/explorar" />;
}
