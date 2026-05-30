
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
import { File } from 'expo-file-system';
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
    let inlineContents: string | undefined;
    try {
      const f = new File(url);
      const txt = await f.text();
      inlineContents = txt;
      console.log('[DeepLink] Pre-read', txt.length, 'chars from cold-launch URL');
    } catch (e) {
      console.warn('[DeepLink] Pre-read failed, will fall back to URI-based read in import screen:', e);
    }
    router.push({
      pathname: '/import-checklist',
      params: {
        fileUri: url,
        cold: '1',
        ...(inlineContents !== undefined ? { inline: inlineContents } : {}),
      },
    });
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

      if (coldLaunchImport.current) {
        console.log('[Migration] Cold-launch import in progress — skipping migration check this session');
      } else if (storedVersion < CHECKLIST_VERSION) {
        const stored = await storage.getChecklist();
        const diff = hasNewContent(stored, defaultChecklist);
        if (!diff) {
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
        let deferredInline: string | undefined;
        try {
          const f = new File(deferred);
          const txt = await f.text();
          deferredInline = txt;
          console.log('[DeepLink] Pre-read (deferred)', txt.length, 'chars');
        } catch (e) {
          console.warn('[DeepLink] Pre-read (deferred) failed, falling back to URI-based read:', e);
        }
        router.push({
          pathname: '/import-checklist',
          params: {
            fileUri: deferred,
            cold: '1',
            ...(deferredInline !== undefined ? { inline: deferredInline } : {}),
          },
        });
      }
    }

    // FIRST: process any cold-launch URL so coldLaunchImport.current is set
    // before checkMigration() reads it.
    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleIncomingUrl(initialUrl);
        }
      } catch (e) {
        console.warn('[DeepLink] getInitialURL failed:', e);
      }
      // THEN: run the migration check (which now sees the correct flag)
      await checkMigration();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Listen for subsequent URL events (file shared while app already running)
  useEffect(() => {
    if (!loaded) return;
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
