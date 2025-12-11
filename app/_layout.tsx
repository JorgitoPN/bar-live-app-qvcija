
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';

/**
 * ============================================================================
 * ROOT LAYOUT - STORY SYSTEM REMOVED
 * ============================================================================
 * 
 * Built from scratch with maximum attention to detail.
 * Story system has been completely removed.
 * 
 * Provider Order (outer to inner):
 * 1. AuthProvider - Authentication state
 * 2. GlobalDataProvider - Global app data
 * 3. ModeProvider - User/Local interaction mode
 * 4. SelectedLocalProvider - Selected local context
 * 5. WidgetProvider - Widget state
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <ModeProvider>
          <SelectedLocalProvider>
            <WidgetProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="detalle" 
                  options={{ 
                    headerShown: false,
                    presentation: 'modal'
                  }} 
                />
              </Stack>
            </WidgetProvider>
          </SelectedLocalProvider>
        </ModeProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}
