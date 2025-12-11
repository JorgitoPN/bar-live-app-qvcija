
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { StoryProvider } from '@/contexts/StoryContext';

/**
 * ============================================================================
 * ROOT LAYOUT - COMPLETE REBUILD
 * ============================================================================
 * 
 * Built from scratch with maximum attention to detail.
 * 
 * Provider Order (outer to inner):
 * 1. AuthProvider - Authentication state
 * 2. GlobalDataProvider - Global app data
 * 3. ModeProvider - User/Local interaction mode
 * 4. SelectedLocalProvider - Selected local context
 * 5. WidgetProvider - Widget state
 * 6. StoryProvider - Story view tracking (NEW SYSTEM)
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <ModeProvider>
          <SelectedLocalProvider>
            <WidgetProvider>
              <StoryProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                </Stack>
              </StoryProvider>
            </WidgetProvider>
          </SelectedLocalProvider>
        </ModeProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}
