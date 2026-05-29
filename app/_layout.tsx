
import React, { useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
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
import { storage } from '@/utils/storage';
import { CHECKLIST_VERSION } from '@/data/defaultChecklist';
import * as Linking from 'expo-linking';
import { KTS_FILE_EXTENSION } from '@/types/share';

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

  // Deep-link dedup ref — track last handled URL to avoid re-triggering
  const lastHandledUrl = useRef<string | null>(null);

  const handleIncomingUrl = (url: string | null) => {
    if (!url) return;
    if (url === lastHandledUrl.current) return;
    // Decode and check for .kts extension
    let decoded: string;
    try {
      decoded = decodeURIComponent(url);
    } catch {
      decoded = url;
    }
    if (!decoded.toLowerCase().endsWith(`.${KTS_FILE_EXTENSION}`)) return;
    lastHandledUrl.current = url;
    console.log('[DeepLink] Detected .kts file URL:', url);
    router.push({ pathname: '/import-checklist', params: { fileUri: url } });
  };

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    async function checkMigration() {
      const setupComplete = await storage.isSetupComplete();
      if (!setupComplete) {
        console.log('[Migration] Setup not complete, skipping migration check');
        return;
      }
      const storedVersion = await storage.getChecklistVersion();
      console.log('[Migration] Stored checklist version:', storedVersion, '| Current:', CHECKLIST_VERSION);
      if (storedVersion < CHECKLIST_VERSION) {
        console.log('[Migration] Version mismatch — navigating to checklist-update modal');
        router.push('/checklist-update');
      }
    }
    checkMigration();
  }, [loaded]);

  // Deep-link handler
  useEffect(() => {
    if (!loaded) return;
    // Check initial URL (app opened via file)
    Linking.getInitialURL().then(url => {
      handleIncomingUrl(url);
    });
    // Listen for subsequent URL events
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <Stack.Screen
                name="checklist-update"
                options={{
                  presentation: "modal",
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="import-checklist"
                options={{
                  presentation: "fullScreenModal",
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
            </Stack>
          </GestureHandlerRootView>
        </WidgetProvider>
      </ThemeProvider>
    </>
  );
}
