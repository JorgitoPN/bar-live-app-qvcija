
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  console.log('[RootLayout] Rendering...');
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    console.log('[RootLayout] Fonts loaded:', loaded);
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    console.log('[RootLayout] Waiting for fonts...');
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };

  console.log('[RootLayout] Rendering app with theme:', colorScheme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <StatusBar style="auto" animated />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <SystemBars style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
