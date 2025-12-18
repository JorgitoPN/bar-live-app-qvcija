
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - STANDARD MODAL CONFIGURATION v2.0
 * ============================================================================
 * 
 * ✅ Standard modal behavior:
 * - Uses 'modal' presentation (not 'transparentModal')
 * - Native swipe-down gesture enabled
 * - Rounded top corners (automatic)
 * - Previous screen visible behind
 * - Does NOT open full-screen
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
        // ✅ These options ensure proper modal behavior
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}
