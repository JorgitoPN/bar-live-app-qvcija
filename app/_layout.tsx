
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { StoryStateProvider } from '@/contexts/StoryStateContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SelectedLocalProvider>
        <ModeProvider>
          <GlobalDataProvider>
            <StoryStateProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'default',
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
              </Stack>
            </StoryStateProvider>
          </GlobalDataProvider>
        </ModeProvider>
      </SelectedLocalProvider>
    </AuthProvider>
  );
}
