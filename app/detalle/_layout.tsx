
import { Stack } from 'expo-router';

/**
 * DETALLE LAYOUT - CLEAN MODAL CONFIGURATION
 * 
 * Simple modal presentation that works as expected:
 * - Opens as a modal from the bottom
 * - Shows the previous page behind it
 * - Can be closed by swiping down
 * - No extra layers or complications
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  );
}
