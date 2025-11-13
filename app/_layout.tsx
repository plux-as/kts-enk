
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
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
import { WidgetProvider } from "@/contexts/WidgetContext";
import {
  BigShouldersStencil_400Regular,
  BigShouldersStencil_700Bold,
} from '@expo-google-fonts/big-shoulders-stencil';
import { colors } from '@/styles/commonStyles';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    BigShouldersStencil_400Regular,
    BigShouldersStencil_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Always use dark theme as requested
  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.inputBorder,
      notification: colors.error,
    },
  };

  return (
    <>
      <StatusBar style="light" animated />
      <ThemeProvider value={CustomDarkTheme}>
        <WidgetProvider>
          <GestureHandlerRootView>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="setup"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              <Stack.Screen
                name="session"
                options={{
                  presentation: "fullScreenModal",
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  presentation: "fullScreenModal",
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="edit-checklist"
                options={{
                  presentation: "fullScreenModal",
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="log-detail"
                options={{
                  presentation: "fullScreenModal",
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
            </Stack>
            <SystemBars style={"light"} />
          </GestureHandlerRootView>
        </WidgetProvider>
      </ThemeProvider>
    </>
  );
}
