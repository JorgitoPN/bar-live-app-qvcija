
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v11.0 - FINAL FIX
 * ============================================================================
 * 
 * ✅ FINAL FIX: Perfect modal behavior with proper presentation
 * - Opens as modal overlay (not full screen)
 * - Rounded corners at the top
 * - Semi-transparent background overlay visible
 * - Can be closed by dragging down
 * - Smooth animations
 * - Background page visible behind modal
 * - NO duplicate views
 * - NO white/black background
 * - Uses 'modal' presentation for proper gesture handling
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animation: 'slide_from_bottom',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}
