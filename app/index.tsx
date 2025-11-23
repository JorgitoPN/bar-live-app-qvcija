
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function Index() {
  const { user, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        console.log('[Index] 🔍 Checking profile completion for user:', user.id);
        
        // ✅ FIXED: Check if profile is complete (username, nombre, and fecha_nacimiento are mandatory)
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('username, nombre, fecha_nacimiento, perfil_completado')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[Index] ❌ Error checking profile:', error);
          setCheckingProfile(false);
          return;
        }

        console.log('[Index] 📊 User data:', userData);

        // ✅ FIXED: Profile is complete if username, nombre, and fecha_nacimiento exist
        const isComplete = !!(userData?.username && userData?.nombre && userData?.fecha_nacimiento);
        setProfileComplete(isComplete);

        console.log('[Index] ✅ Profile complete:', isComplete);
      } catch (error) {
        console.error('[Index] ❌ Error in checkProfileCompletion:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    if (!loading) {
      checkProfileCompletion();
    }
  }, [user, loading]);

  if (loading || checkingProfile) {
    return <InitialLoadingScreen />;
  }

  // Not logged in -> Show welcome screen
  if (!user) {
    console.log('[Index] 🚪 No user, redirecting to welcome');
    return <Redirect href="/auth/bienvenida" />;
  }

  // ✅ FIXED: Profile not complete -> Complete profile
  if (!profileComplete) {
    console.log('[Index] 📝 Profile incomplete, redirecting to complete profile');
    return <Redirect href={`/auth/completar-perfil?userId=${user.id}&userEmail=${user.email}&provider=${user.provider || 'barlive'}`} />;
  }

  // ✅ FIXED: Profile complete -> Go directly to Explorar (main app)
  console.log('[Index] ✅ Profile complete, redirecting to Explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
