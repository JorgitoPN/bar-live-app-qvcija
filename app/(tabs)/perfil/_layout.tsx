
import { Stack } from 'expo-router';

export default function PerfilLayout() {
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
          animation: 'none',
          animationDuration: 0,
        }}
      />
      <Stack.Screen
        name="chats"
        options={{
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
        }}
      />
      <Stack.Screen
        name="notificaciones"
        options={{
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
        }}
      />
      <Stack.Screen
        name="configuracion"
        options={{
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
        }}
      />
      <Stack.Screen
        name="preferencias-anuncios"
        options={{
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
        }}
      />
    </Stack>
  );
}
