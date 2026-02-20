
import { Stack } from 'expo-router';

/**
 * ✅ DETALLE LAYOUT v2.0 - FIXED iOS VIRTUAL ROOM ISSUE
 * 
 * CHANGES v2.0:
 * - ✅ REMOVED: presentation: 'modal' from screenOptions
 * - ✅ FIXED: Sala virtual now opens as full-screen page on iOS (not modal)
 * - ✅ FIXED: No more Expo Go modal selection page appearing
 * - ✅ RESULT: Consistent full-screen behavior on both iOS and Android
 * 
 * WHY THIS FIXES IT:
 * - The modal presentation was forcing ALL detalle/* screens to be modals
 * - This caused iOS to show the modal picker and prevented full-screen display
 * - Now each screen can control its own presentation style
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ REMOVED: presentation: 'modal' - let each screen decide
        animation: 'default', // Changed from 'slide_from_bottom' for standard navigation
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}
