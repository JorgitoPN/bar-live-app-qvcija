
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { StoryStateProvider } from '@/contexts/StoryStateContextV11';

/**
 * ✅ ROOT LAYOUT V11.0 - Complete context provider hierarchy
 * 
 * NEW IN V11.0:
 * - ✅ Using StoryStateContextV11 for improved story tracking
 * - ✅ Proper provider nesting order
 * - ✅ All contexts properly initialized
 * 
 * Provider Order (outer to inner):
 * 1. AuthProvider - Authentication state
 * 2. GlobalDataProvider - Global app data
 * 3. ModeProvider - User/Local interaction mode
 * 4. SelectedLocalProvider - Selected local context
 * 5. WidgetProvider - Widget state
 * 6. StoryStateProvider - Story view tracking (V11.0)
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <ModeProvider>
          <SelectedLocalProvider>
            <WidgetProvider>
              <StoryStateProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                </Stack>
              </StoryStateProvider>
            </WidgetProvider>
          </SelectedLocalProvider>
        </ModeProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}
