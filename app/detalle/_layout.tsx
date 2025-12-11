
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION WITH ROUNDED CORNERS
 * ============================================================================
 * 
 * This layout configures all detail pages to open as modals with:
 * - Rounded top corners (using formSheet presentation)
 * - Drag-to-close gesture enabled
 * - Sheet behavior on mobile
 * - Proper modal presentation on all platforms
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'formSheet',
        sheetAllowedDetents: [0.95],
        sheetCornerRadius: 20,
        sheetGrabberVisible: true,
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animation: 'slide_from_bottom',
      }}
    />
  );
}
