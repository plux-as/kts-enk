
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
import { CHECKLIST_VERSION, defaultChecklist } from '@/data/defaultChecklist';
import * as Linking from 'expo-linking';
import { KTS_FILE_EXTENSION } from '@/types/share';

SplashScreen.preventAutoHideAsync();

function hasNewContent(
  stored: { id: string; items: { id: string }[] }[],
  incoming: { id: string; items: { id: string }[] }[],
): boolean {
  const storedById = new Map(stored.map(c => [c.id, new Set(c.items.map(i => i.id))]));
  for (const cat of incoming) {
    const storedItems = storedById.get(cat.id);
    if (!storedItems) return true;
    for (const item of cat.items) {
      if (!storedItems.has(item.id)) return true;
    }
  }
  return false;
}

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
  // Deferred import URL — set when setup is not yet complete
  const pendingImportUrl = useRef<string | null>(null);
  // Flag: this session was cold-launched via a .kts deep-link — suppress migration prompt
  const coldLaunchImport = useRef<boolean>(false);

  const handleIncomingUrl = async (url: string | null) => {
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
    const setupComplete = await storage.isSetupComplete();
    if (!setupComplete) {
      console.log('[DeepLink] Setup not complete — deferring .kts import until setup finishes');
      pendingImportUrl.current = url;
      return;
    }
    coldLaunchImport.current = true;
    router.push({ pathname: '/import-checklist', params: { fileUri: url, cold: '1' } });
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

      // Suppress migration prompt entirely during a cold-launch .kts import session
      if (coldLaunchImport.current) {
        console.log('[Migration] Cold-launch import in progress — skipping migration check this session');
      } else if (storedVersion < CHECKLIST_VERSION) {
        // Compare stored against new default to see if there's anything actually new
        const stored = await storage.getChecklist();
        const diff = hasNewContent(stored, defaultChecklist);

        if (!diff) {
          // User already has all content from the new default — silently bump version, no prompt
          console.log('[Migration] No new content vs new default — silently bumping version to', CHECKLIST_VERSION);
          await storage.saveChecklistVersion(CHECKLIST_VERSION);
        } else {
          console.log('[Migration] Real diff found — showing update modal');
          router.push('/checklist-update');
        }
      }

      // Drain any deferred deep-link import that was blocked by incomplete setup
      if (pendingImportUrl.current) {
        const deferred = pendingImportUrl.current;
        pendingImportUrl.current = null;
        coldLaunchImport.current = true;
        console.log('[DeepLink] Draining deferred .kts import:', deferred);
        router.push({ pathname: '/import-checklist', params: { fileUri: deferred, cold: '1' } });
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
