
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - TRANSPARENT MODAL CONFIGURATION v5.0
 * ============================================================================
 * 
 * ✅ Fixed modal behavior for mobile:
 * - Uses 'transparentModal' presentation to show previous screen
 * - Native swipe-down gesture enabled
 * - Rounded top corners (automatic)
 * - Previous screen visible behind (no gray layer)
 * - Does NOT open full-screen
 * - Proper overlay presentation
 * - No intermediate layers
 * - Works consistently on mobile and web
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ Fully transparent to show previous screen
        contentStyle: {
          backgroundColor: 'transparent',
        },
        // ✅ Additional mobile-specific settings
        ...(Platform.OS !== 'web' && {
          cardOverlayEnabled: true,
          cardStyle: {
            backgroundColor: 'transparent',
          },
        }),
      }}
    />
  );
}
