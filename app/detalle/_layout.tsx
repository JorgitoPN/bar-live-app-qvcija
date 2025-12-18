
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - STANDARD MODAL CONFIGURATION
 * ============================================================================
 * 
 * ✅ Standard modal behavior matching CommentsModal:
 * - Uses modal presentation (not transparentModal)
 * - Native swipe-down to close gesture
 * - Rounded top corners (automatic with modal)
 * - Previous screen visible behind
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
      }}
    />
  );
}
