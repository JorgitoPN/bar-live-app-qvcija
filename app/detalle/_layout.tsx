
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - REAL TRANSPARENT MODAL
 * ============================================================================
 * 
 * ✅ Proper modal configuration:
 * - transparentModal presentation allows background to show through
 * - slide_from_bottom animation for bottom sheet feel
 * - Transparent background so previous screen is visible
 * - Gesture enabled for swipe-down to close
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
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
