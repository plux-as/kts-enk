
import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { storage } from "@/utils/storage";
import { SquadSettings } from "@/types/checklist";

export default function HomeScreen() {
  const [squadSettings, setSquadSettings] = useState<SquadSettings | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const setupComplete = await storage.isSetupComplete();
      setIsSetupComplete(setupComplete);

      if (!setupComplete) {
        router.replace('/setup');
        return;
      }

      const settings = await storage.getSquadSettings();
      setSquadSettings(settings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = () => {
    router.push('/session');
  };

  const handleViewLog = () => {
    router.push('/(tabs)/log');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <Text style={commonStyles.text}>Laster...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "KTS",
          headerRight: () => (
            <Pressable onPress={handleSettings} style={styles.headerButton}>
              <IconSymbol name="gear" color={colors.text} size={24} />
            </Pressable>
          ),
        }}
      />
      <View style={commonStyles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.appTitle}>Kontroll av Tropps Soldater</Text>
            {squadSettings && (
              <View style={styles.squadInfo}>
                <Text style={styles.squadName}>{squadSettings.squadName}</Text>
                <Text style={styles.squadDetail}>
                  {squadSettings.soldiers.length} soldater
                </Text>
              </View>
            )}
          </View>

          <View style={styles.mainButtonContainer}>
            <Pressable
              style={styles.startButton}
              onPress={handleStartSession}
            >
              <IconSymbol name="checkmark.circle.fill" color="#FFFFFF" size={48} />
              <Text style={styles.startButtonText}>Start KTS</Text>
            </Pressable>
          </View>

          <View style={styles.secondaryActions}>
            <Pressable style={styles.secondaryButton} onPress={handleViewLog}>
              <IconSymbol name="list.bullet" color={colors.accent} size={28} />
              <Text style={styles.secondaryButtonText}>Logg</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  squadInfo: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  squadName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  squadDetail: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  mainButtonContainer: {
    marginVertical: 30,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(76, 175, 80, 0.3)',
    elevation: 5,
  },
  startButtonText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  secondaryActions: {
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  secondaryButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 12,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  headerButton: {
    padding: 8,
  },
});
