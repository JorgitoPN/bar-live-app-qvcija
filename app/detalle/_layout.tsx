
import { Stack } from 'expo-router';

/**
 * ✅ DETALLE LAYOUT - CLEAN MODAL CONFIGURATION
 * 
 * Using formSheet presentation for native bottom-sheet behavior:
 * - Slides up from bottom
 * - Shows dimmed background
 * - Swipe down to close
 * - Proper rounded corners
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'formSheet',
        animation: 'slide_from_bottom',
        sheetAllowedDetents: [0.95], // 95% of screen height
        sheetCornerRadius: 24,
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}
