
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION (NOT FULL SCREEN)
 * ============================================================================
 * 
 * ✅ This layout configures detail pages to open as modals:
 * - Modal presentation (NOT full screen)
 * - Does NOT reach the top of the screen (visible margin)
 * - Rounded corners at the top
 * - Transparent background overlay
 * - Can be closed by dragging down
 * - Smooth animations
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ Use 'formSheet' on iOS for modal that doesn't reach top
        // ✅ Use 'modal' on Android
        presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
        // ✅ Enable gesture to dismiss
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ Show overlay behind modal
        cardOverlayEnabled: true,
        // ✅ Transparent background
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
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
    </Stack>
  );
}
