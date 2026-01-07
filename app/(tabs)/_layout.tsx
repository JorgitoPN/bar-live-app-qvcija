
// Fix profile avatar persistence on Android - ensure avatar updates across all tabs
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function TabsLayout() {
  const { user } = useAuth();
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar);
  
  // Update avatar when user changes
  useEffect(() => {
    if (user?.avatar) {
      setProfileAvatar(user.avatar);
    }
  }, [user?.avatar, user?.id]);
  
  // Pass avatar to FloatingTabBar to ensure it persists
  return (
    <FloatingTabBar 
      tabs={tabs}
      userAvatar={profileAvatar} // Pass avatar explicitly
    />
  );
}
