
import { Stack } from 'expo-router';

/**
 * DETALLE LAYOUT - TRANSPARENT MODAL CONFIGURATION
 * 
 * Configured to show as a window overlay:
 * - Opens from the bottom with slide animation
 * - Shows the previous page behind it (transparent background)
 * - Can be closed by swiping down from anywhere
 * - Not full screen - leaves space at the top
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        animation: 'slide_from_bottom',
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}
