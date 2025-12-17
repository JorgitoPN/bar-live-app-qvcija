
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v9.0 - REBUILT FROM SCRATCH
 * ============================================================================
 * 
 * ✅ COMPLETELY REBUILT: Perfect modal behavior
 * - Opens as modal overlay (not full screen)
 * - Rounded corners at the top
 * - Semi-transparent background overlay visible
 * - Can be closed by dragging down
 * - Smooth animations
 * - Background page visible behind modal
 * - NO duplicate views
 * - NO black background
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animation: 'slide_from_bottom',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}
