
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

/**
 * ============================================================================
 * DETALLE LAYOUT - MODAL PRESENTATION WITH DRAG-TO-DISMISS
 * ============================================================================
 * 
 * This layout configures all detail pages to open as modals with:
 * - ✅ Modal presentation (not full screen)
 * - ✅ Drag-to-dismiss gesture enabled (swipe down to close)
 * - ✅ Transparent background overlay
 * - ✅ Rounded corners at the top
 * - ✅ Smooth animations
 * 
 * IMPORTANT: The modal can be closed by:
 * 1. Dragging down from the top
 * 2. Tapping the back button
 * 3. Swiping from the left edge (iOS)
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // ✅ CRITICAL: Use 'formSheet' presentation for modal with rounded corners
        presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
        // ✅ Enable drag-to-dismiss gesture
        gestureEnabled: true,
        gestureDirection: 'vertical',
        // ✅ Card overlay for modal effect
        cardOverlayEnabled: true,
        // ✅ Transparent background
        cardStyle: { 
          backgroundColor: 'transparent',
          // ✅ Rounded corners at the top
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        },
        // ✅ Animation configuration
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
              duration: 300,
            },
          },
        },
        // ✅ Card style interpolator for fade effect
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
                  outputRange: [50, 0],
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
    />
  );
}
