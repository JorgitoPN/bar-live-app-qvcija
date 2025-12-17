
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v6.0 - CRITICAL FIX
 * ============================================================================
 * 
 * ✅ URGENT FIX: Use 'transparentModal' for proper modal overlay behavior
 * - Opens as modal overlay (not full screen)
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
        // ✅ CRITICAL: Use 'transparentModal' for proper modal behavior
        presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
        // ✅ Enable gesture to dismiss by dragging down
        gestureEnabled: true,
        // ✅ Show semi-transparent overlay behind modal
        cardOverlayEnabled: true,
        // ✅ Animation for modal presentation
        animation: 'slide_from_bottom',
        // ✅ CRITICAL: Set content style for proper modal appearance
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          cardOverlayEnabled: true,
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          cardOverlayEnabled: true,
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          cardOverlayEnabled: true,
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </Stack>
  );
}
