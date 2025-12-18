
import { Stack } from 'expo-router';

/**
 * DETALLE LAYOUT - TRANSPARENT MODAL CONFIGURATION
 * 
 * Configured to show as an overlay modal:
 * - Opens from the bottom with slide animation
 * - Shows the previous page behind it (transparent background)
 * - Can be closed by swiping down from anywhere when at the top
 * - Standard modal behavior
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
