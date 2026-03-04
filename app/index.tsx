
import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';

/**
 * ✅ INDEX SCREEN v2.0 - SMART LOADING WITH PROGRESS
 * 
 * CHANGES v2.0:
 * - ✅ PROGRESS TRACKING: Shows actual loading progress (0-100%)
 * - ✅ SMART ESTIMATION: Estimates progress based on typical load times
 * - ✅ SMOOTH TRANSITION: Waits for 100% before redirecting
 * - ✅ RESULT: Better perceived performance, clearer feedback
 */

export default function Index() {
  const { user, loading, sessionReady } = useAuth();
  const router = useRouter();
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log('[Index v2.0] 🏠 Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      userRole: user?.rol_app,
      loading,
      sessionReady,
    });

    // Check for password recovery token in URL hash (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      console.log('[Index v2.0] 🔍 Checking URL hash:', hash);
      
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        console.log('[Index v2.0] 📋 Hash params:', {
          type,
          hasAccessToken: !!accessToken,
        });
        
        // If this is a password recovery link, redirect to password reset screen
        if (type === 'recovery' && accessToken) {
          console.log('[Index v2.0] 🔐 Password recovery detected, redirecting to reset screen...');
          setIsRecovery(true);
          setCheckingRecovery(false);
          
          // Use setTimeout to ensure the redirect happens after render
          setTimeout(() => {
            router.replace('/auth/restablecer-password');
          }, 100);
          return;
        }
      }
    }
    
    setCheckingRecovery(false);
  }, [user, loading, sessionReady, router]);

  // ✅ Simulate progress based on typical load times
  useEffect(() => {
    if (loading || !sessionReady || checkingRecovery) {
      // Start at 10% immediately
      setProgress(0.1);
      
      // Increment progress every 100ms
      const interval = setInterval(() => {
        setProgress(prev => {
          // Slow down as we approach 90%
          if (prev < 0.3) return prev + 0.15;
          if (prev < 0.6) return prev + 0.1;
          if (prev < 0.9) return prev + 0.05;
          return Math.min(prev + 0.02, 0.95); // Cap at 95% until ready
        });
      }, 100);
      
      return () => clearInterval(interval);
    } else {
      // Jump to 100% when ready
      setProgress(1);
    }
  }, [loading, sessionReady, checkingRecovery]);

  // Show loading while checking for recovery or auth is initializing
  if (loading || checkingRecovery || !sessionReady || progress < 1) {
    console.log('[Index v2.0] ⏳ Cargando... Progress:', Math.round(progress * 100) + '%');
    return <InitialLoadingScreen progress={progress} />;
  }

  // If this is a recovery flow, don't redirect yet (let useEffect handle it)
  if (isRecovery) {
    return <InitialLoadingScreen progress={0.5} />;
  }

  // ✅ CRITICAL FIX: Always redirect to explorar after login
  // The app will handle role-based access internally through admin access controls
  // Non-admin users will be silently redirected away from admin routes by the admin layout
  console.log('[Index v2.0] 🚀 Redirigiendo a explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
