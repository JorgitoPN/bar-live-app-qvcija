
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - STANDARD MODAL CONFIGURATION v3.0
 * ============================================================================
 * 
 * ✅ Standard modal behavior:
 * - Uses 'modal' presentation
 * - Native swipe-down gesture enabled
 * - Rounded top corners (automatic)
 * - Previous screen visible behind
 * - Does NOT open full-screen
 * - Proper overlay presentation
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ Transparent background to show previous screen
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}
