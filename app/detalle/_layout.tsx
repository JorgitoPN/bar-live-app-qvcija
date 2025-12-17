
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION v2.0
 * ============================================================================
 * 
 * ✅ This layout configures detail pages to open as modals:
 * - Modal presentation (NOT full screen)
 * - Does NOT reach the top of the screen (visible margin)
 * - Rounded corners at the top
 * - Transparent background overlay
 * - Can be closed by dragging down
 * - Smooth animations
 * 
 * CRITICAL FIXES:
 * - ✅ Increased top margin to 60px (was causing issues)
 * - ✅ Added Android-specific margin handling
 * - ✅ Proper gesture configuration for swipe-to-dismiss
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ CRITICAL: Use 'modal' presentation to prevent full-screen
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
        // ✅ IMPORTANT: This prevents the modal from reaching the top
        contentStyle: {
          marginTop: Platform.OS === 'ios' ? 60 : 40,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        },
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          contentStyle: {
            marginTop: Platform.OS === 'ios' ? 60 : 40,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
          },
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          contentStyle: {
            marginTop: Platform.OS === 'ios' ? 60 : 40,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
          },
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          contentStyle: {
            marginTop: Platform.OS === 'ios' ? 60 : 40,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
          },
        }}
      />
    </Stack>
  );
}
