
import { Stack } from 'expo-router';

export default function ExplorarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        animationDuration: 0,
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
