
import React, { useEffect, useState, useCallback } from "react";
import { Stack, router, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles, bodyFont } from "@/styles/commonStyles";
import { storage } from "@/utils/storage";
import { SquadSettings, ChecklistCategory } from "@/types/checklist";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [squadSettings, setSquadSettings] = useState<SquadSettings | null>(null);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  // Reload data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const setupComplete = await storage.isSetupComplete();
      setIsSetupComplete(setupComplete);

      if (!setupComplete) {
        router.replace('/setup');
        return;
      }

      const [settings, checklistData] = await Promise.all([
        storage.getSquadSettings(),
        storage.getChecklist(),
      ]);
      setSquadSettings(settings);
      setChecklist(checklistData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const weaponCategories = checklist.filter(c => c.categoryRole === 'weapon');
  const hasMissingWeapon =
    weaponCategories.length > 0 &&
    !!squadSettings?.soldiers.some(
      s => !s.personligVapenCategoryId || !weaponCategories.find(c => c.id === s.personligVapenCategoryId)
    );

  const handleStartSession = () => {
    console.log('User tapped Start KTS, hasMissingWeapon:', hasMissingWeapon);
    if (hasMissingWeapon) {
      Alert.alert(
        'Advarsel',
        'En eller flere soldater har ikke blitt tildelt primærvåpen. Vil du likevel fortsette?',
        [
          { text: 'Nei, avslutt', style: 'cancel' },
          { text: 'Ja, fortsett', onPress: () => router.push('/session') },
        ]
      );
    } else {
      router.push('/session');
    }
  };

  const handleEditSquad = () => {
    router.push('/settings');
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <Text style={[commonStyles.text, { fontFamily: bodyFont }]}>Laster...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[commonStyles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.appTitle}>KTS ALFA</Text>
            {squadSettings && (
              <Pressable style={styles.squadInfo} onPress={handleEditSquad}>
                <Text style={styles.squadName}>{squadSettings.squadName}</Text>
                <View style={styles.squadDetailRow}>
                  <Text style={styles.squadDetail}>
                    {squadSettings.soldiers.length} soldater
                  </Text>
                  {hasMissingWeapon && (
                    <IconSymbol name="exclamationmark.triangle.fill" color={colors.error} size={18} />
                  )}
                </View>
                <Text style={styles.editLabel}>Trykk for å endre</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.mainButtonContainer}>
            <Pressable
              style={styles.startButton}
              onPress={handleStartSession}
            >
              <Image
                source={require('@/assets/images/f54512be-2d40-4d54-93d7-66c0b49c0292.png')}
                style={styles.startIcon}
                resizeMode="contain"
              />
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
    padding: 20,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 40,
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
    elevation: 3,
  },
  squadName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 4,
  },
  squadDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  squadDetail: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: bodyFont,
  },
  editLabel: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginTop: 4,
  },
  mainButtonContainer: {
    marginVertical: 30,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    width: '100%',
  },
  startIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  startButtonText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
