
import { Stack } from 'expo-router';

/**
 * Explorar section layout
 * Version: 2.0 - Fixed animation configuration
 */
export default function ExplorarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="mapa"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
