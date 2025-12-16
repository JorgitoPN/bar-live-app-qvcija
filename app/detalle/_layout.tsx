
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION WITH DRAG-TO-DISMISS
 * ============================================================================
 * 
 * This layout configures all detail pages to open as modals with:
 * - ✅ Drag-to-dismiss gesture enabled (swipe down to close)
 * - ✅ Rounded top corners (formSheet presentation)
 * - ✅ Sheet behavior on mobile
 * - ✅ Proper modal presentation on all platforms
 * 
 * IMPORTANT: The modal can be closed by:
 * 1. Dragging down from the top
 * 2. Tapping the back button
 * 3. Swiping from the left edge (iOS)
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
        // ✅ Enable drag-to-dismiss gesture
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ iOS-specific sheet configuration
        ...(Platform.OS === 'ios' && {
          sheetAllowedDetents: [0.95],
          sheetCornerRadius: 20,
          sheetGrabberVisible: true,
        }),
        // ✅ Animation configuration
        animation: 'slide_from_bottom',
        animationDuration: 300,
      }}
    />
  );
}
