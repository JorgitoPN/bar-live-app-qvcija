
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v12.0 - TRANSPARENT MODAL FIX
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
 * - Uses 'transparentModal' presentation for proper background visibility
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}
