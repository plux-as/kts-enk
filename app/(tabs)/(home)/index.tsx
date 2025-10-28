
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

  const handleEditSquad = () => {
    router.push('/settings');
  };

  const handleEditChecklist = () => {
    router.push('/edit-checklist');
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
          title: "KTS Enkeltsoldat",
          headerRight: () => (
            <Pressable onPress={handleEditChecklist} style={styles.headerButton}>
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
            <Text style={styles.appTitle}>KTS Enkeltsoldat</Text>
            {squadSettings && (
              <View style={styles.squadInfo}>
                <View style={styles.squadNameRow}>
                  <Text style={styles.squadName}>{squadSettings.squadName}</Text>
                  <Pressable onPress={handleEditSquad} style={styles.editButton}>
                    <IconSymbol name="pencil" color={colors.primary} size={20} />
                  </Pressable>
                </View>
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
  squadNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  squadName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  editButton: {
    padding: 4,
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
  headerButton: {
    padding: 8,
  },
});
