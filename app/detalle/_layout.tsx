
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
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95],
          sheetCornerRadius: 20,
          sheetGrabberVisible: true,
          gestureEnabled: true,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95],
          sheetCornerRadius: 20,
          sheetGrabberVisible: true,
          gestureEnabled: true,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95],
          sheetCornerRadius: 20,
          sheetGrabberVisible: true,
          gestureEnabled: true,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="local-updated" 
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95],
          sheetCornerRadius: 20,
          sheetGrabberVisible: true,
          gestureEnabled: true,
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
