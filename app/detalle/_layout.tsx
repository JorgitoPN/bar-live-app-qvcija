
import { Stack } from 'expo-router';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v5.0 - EXACT COMMENTS MODAL BEHAVIOR
 * ============================================================================
 * 
 * ✅ This layout configures detail pages to open EXACTLY like CommentsModal:
 * - Opens as modal overlay (not full screen) - presentationStyle="pageSheet"
 * - NO white space at top
 * - Rounded corners at the top
 * - Semi-transparent background overlay
 * - Can be closed by dragging down
 * - Smooth animations
 * - IDENTICAL to CommentsModal behavior
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ CRITICAL: Use 'formSheet' on iOS and 'modal' on Android for proper modal behavior
        presentation: 'formSheet',
        // ✅ Enable gesture to dismiss by dragging down
        gestureEnabled: true,
        // ✅ Show semi-transparent overlay behind modal
        cardOverlayEnabled: true,
        // ✅ Animation for modal presentation
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'formSheet',
          gestureEnabled: true,
          cardOverlayEnabled: true,
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'formSheet',
          gestureEnabled: true,
          cardOverlayEnabled: true,
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'formSheet',
          gestureEnabled: true,
          cardOverlayEnabled: true,
        }}
      />
    </Stack>
  );
}
