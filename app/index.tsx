
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function Index() {
  const { user, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [hasSeenOwnerMessage, setHasSeenOwnerMessage] = useState(false);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        console.log('[Index] 🔍 Checking profile completion for user:', user.id);
        
        // Check if profile is complete (username and fecha_nacimiento are mandatory)
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('username, fecha_nacimiento, perfil_completado, ha_visto_mensaje_propietario')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[Index] ❌ Error checking profile:', error);
          setCheckingProfile(false);
          return;
        }

        console.log('[Index] 📊 User data:', userData);

        // Profile is complete if username and fecha_nacimiento exist
        const isComplete = !!(userData?.username && userData?.fecha_nacimiento);
        setProfileComplete(isComplete);
        setHasSeenOwnerMessage(userData?.ha_visto_mensaje_propietario || false);

        console.log('[Index] ✅ Profile complete:', isComplete);
        console.log('[Index] ✅ Has seen owner message:', userData?.ha_visto_mensaje_propietario);
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

  // Profile not complete -> Complete profile
  if (!profileComplete) {
    console.log('[Index] 📝 Profile incomplete, redirecting to complete profile');
    return <Redirect href={`/auth/completar-perfil?userId=${user.id}&userEmail=${user.email}&provider=${user.provider || 'barlive'}`} />;
  }

  // Profile complete but hasn't seen owner message -> Show owner message
  if (!hasSeenOwnerMessage) {
    console.log('[Index] 🏢 Showing owner welcome message');
    return <Redirect href={`/auth/bienvenida-propietario?userId=${user.id}&userName=${user.nombre}`} />;
  }

  // Everything complete -> Go to main app
  console.log('[Index] ✅ All complete, redirecting to main app');
  return <Redirect href="/(tabs)/explorar" />;
}
