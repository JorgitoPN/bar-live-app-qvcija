
import { Stack } from 'expo-router';

/**
 * ✅ DETALLE LAYOUT - TRANSPARENT MODAL CONFIGURATION
 * 
 * Using transparentModal presentation to show the underlying page:
 * - Slides up from bottom
 * - Shows the previous page behind with dimmed overlay
 * - Swipe down to close
 * - Proper rounded corners
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
