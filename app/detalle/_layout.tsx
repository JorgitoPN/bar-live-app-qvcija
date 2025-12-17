
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v7.0 - PROPER MODAL BEHAVIOR
 * ============================================================================
 * 
 * ✅ FIXED: Proper modal behavior with swipe-down-to-close
 * - Opens as modal overlay (not full screen)
 * - Rounded corners at the top
 * - Semi-transparent background overlay visible
 * - Can be closed by dragging down (NO REFRESH)
 * - Smooth animations
 * - Background page visible behind modal
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animation: 'slide_from_bottom',
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
