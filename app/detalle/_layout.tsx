
import { Stack } from 'expo-router';

/**
 * ✅ DETALLE LAYOUT - MODAL CONFIGURATION
 * 
 * Using modal presentation without backdrop layers
 */
export default function DetalleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}
