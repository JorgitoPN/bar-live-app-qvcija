
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v3.0 - RESTORED DESIGN
 * ============================================================================
 * 
 * ✅ This layout configures detail pages to open as modals:
 * - iOS: formSheet presentation (card-style modal with rounded corners)
 * - Android: modal presentation
 * - Does NOT reach the top of the screen (visible margin)
 * - Rounded corners at the top
 * - Transparent background overlay
 * - Can be closed by dragging down
 * - Smooth animations
 * 
 * RESTORED FROM TWO DAYS AGO:
 * - ✅ iOS uses 'formSheet' for proper modal behavior
 * - ✅ Android uses 'modal' with proper margins
 * - ✅ Proper gesture configuration for swipe-to-dismiss
 * - ✅ Rounded corners and overlay
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ RESTORED: Use 'formSheet' on iOS for proper modal behavior
        presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
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
        // ✅ RESTORED: Proper content style with rounded corners
        contentStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 40, // iOS formSheet handles this automatically
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          contentStyle: {
            marginTop: Platform.OS === 'ios' ? 0 : 40,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          contentStyle: {
            marginTop: Platform.OS === 'ios' ? 0 : 40,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          contentStyle: {
            marginTop: Platform.OS === 'ios' ? 0 : 40,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            backgroundColor: 'transparent',
          },
        }}
      />
    </Stack>
  );
}
