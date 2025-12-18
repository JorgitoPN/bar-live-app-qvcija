
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - TRANSPARENT MODAL CONFIGURATION v4.0
 * ============================================================================
 * 
 * ✅ Fixed modal behavior:
 * - Uses 'transparentModal' presentation to show previous screen
 * - Native swipe-down gesture enabled
 * - Rounded top corners (automatic)
 * - Previous screen visible behind (no gray layer)
 * - Does NOT open full-screen
 * - Proper overlay presentation
 * - No intermediate layers
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
      }}
    />
  );
}
