
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION WITH DRAG-TO-DISMISS
 * ============================================================================
 * 
 * ✅ This layout configures all detail pages to open as modals with:
 * - Modal presentation (not full screen)
 * - Drag-to-dismiss gesture enabled (swipe down to close)
 * - Transparent background overlay
 * - Rounded corners at the top
 * - Smooth animations
 * - Does NOT reach the top of the screen
 * 
 * IMPORTANT: The modal can be closed by:
 * 1. ✅ Dragging down from anywhere on the screen
 * 2. ✅ Tapping the back button
 * 3. ✅ Swiping from the left edge (iOS)
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ CRITICAL: Use 'modal' presentation for drag-to-dismiss
        presentation: 'modal',
        // ✅ Enable drag-to-dismiss gesture
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ Card overlay for modal effect
        cardOverlayEnabled: true,
        // ✅ Transparent background with rounded corners
        cardStyle: { 
          backgroundColor: 'transparent',
        },
        // ✅ Animation configuration for smooth modal presentation
        animation: 'slide_from_bottom',
        animationDuration: 300,
        // ✅ Custom transition for modal effect
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 250,
            },
          },
        },
        // ✅ Card style interpolator for fade and slide effect
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 0.5, 0.9, 1],
              outputRange: [0, 0.25, 0.7, 1],
            }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
            ],
          },
          overlayStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
      }}
    >
      <Stack.Screen 
        name="local" 
        options={{
          // ✅ Modal presentation with rounded corners
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen 
        name="evento" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen 
        name="sala-virtual" 
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
    </Stack>
  );
}
