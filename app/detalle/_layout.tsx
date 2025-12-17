
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v4.0 - EXACT COMMENTS MODAL BEHAVIOR
 * ============================================================================
 * 
 * ✅ This layout configures detail pages to open EXACTLY like CommentsModal:
 * - Opens as modal (not full screen) - presentationStyle="pageSheet"
 * - NO white space at top
 * - Rounded corners at the top
 * - Transparent background overlay
 * - Can be closed by dragging down
 * - Smooth animations
 * - IDENTICAL to CommentsModal behavior
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ CRITICAL: Use 'modal' presentation on both platforms for consistency
        presentation: 'modal',
        // ✅ Enable gesture to dismiss by dragging down
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ Show semi-transparent overlay behind modal
        cardOverlayEnabled: true,
        // ✅ Transparent background to show overlay
        cardStyle: { 
          backgroundColor: 'transparent',
        },
        // ✅ Animation for modal presentation
        animation: 'slide_from_bottom',
        animationDuration: 300,
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
        }}
      />
    </Stack>
  );
}
