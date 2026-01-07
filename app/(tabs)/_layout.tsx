
import FloatingTabBar from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// Fix profile avatar persistence on Android - ensure avatar updates across all tabs
export default function TabsLayout() {
  const { user } = useAuth();
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar);
  
  // Update avatar when user changes
  useEffect(() => {
    if (user?.avatar) {
      setProfileAvatar(user.avatar);
    }
  }, [user?.avatar, user?.id]);
  
  // Define tabs configuration
  const tabs = [
    { name: 'home', route: '/(tabs)/(home)', icon: 'home', label: 'Inicio' },
    { name: 'explorar', route: '/(tabs)/explorar', icon: 'search', label: 'Explorar' },
    { name: 'social', route: '/(tabs)/social', icon: 'people', label: 'Social' },
    { name: 'perfil', route: '/(tabs)/perfil', icon: 'person', label: 'Perfil' },
  ];
  
  // Pass avatar to FloatingTabBar to ensure it persists
  return (
    <FloatingTabBar 
      tabs={tabs}
    />
  );
}
