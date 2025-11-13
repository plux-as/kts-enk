
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { Soldier, SquadSettings } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';

export default function SettingsScreen() {
  const [squadName, setSquadName] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await storage.getSquadSettings();
      if (settings) {
        setSquadName(settings.squadName);
        setSoldiers(settings.soldiers);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSoldier = (index: number, field: 'name' | 'role', value: string) => {
    const updated = [...soldiers];
    updated[index][field] = value;
    setSoldiers(updated);
  };

  const addSoldier = () => {
    setSoldiers([
      ...soldiers,
      {
        id: `soldier-${Date.now()}`,
        name: '',
        role: '',
      },
    ]);
  };

  const removeSoldier = (index: number) => {
    if (soldiers.length <= 1) {
      Alert.alert('Feil', 'Du må ha minst én soldat');
      return;
    }

    Alert.alert(
      'Bekreft',
      'Er du sikker på at du vil fjerne denne soldaten?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fjern',
          style: 'destructive',
          onPress: () => {
            const updated = soldiers.filter((_, i) => i !== index);
            setSoldiers(updated);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!squadName.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn lagets navn');
      return;
    }

    const incompleteSoldiers = soldiers.filter(s => !s.name.trim());
    if (incompleteSoldiers.length > 0) {
      Alert.alert('Feil', 'Vennligst fyll inn navn for alle soldater');
      return;
    }

    try {
      const settings: SquadSettings = {
        squadName: squadName.trim(),
        soldiers,
      };
      await storage.saveSquadSettings(settings);
      Alert.alert('Suksess', 'Innstillinger lagret', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Feil', 'Kunne ikke lagre innstillingene');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.text}>Laster...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Rediger Lag',
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontFamily: 'BigShouldersStencil_700Bold',
            fontSize: 24,
          },
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Lagsnavn</Text>
              <TextInput
                style={styles.input}
                value={squadName}
                onChangeText={setSquadName}
                placeholder="F.eks. Alfa Lag"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Soldater</Text>
            </View>

            {soldiers.map((soldier, index) => (
              <View key={soldier.id} style={styles.soldierCard}>
                <View style={styles.soldierHeader}>
                  <Text style={styles.soldierNumber}>Soldat {index + 1}</Text>
                  <Pressable onPress={() => removeSoldier(index)}>
                    <IconSymbol name="trash" color={colors.secondary} size={20} />
                  </Pressable>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Navn</Text>
                  <TextInput
                    style={styles.input}
                    value={soldier.name}
                    onChangeText={(value) => updateSoldier(index, 'name', value)}
                    placeholder="F.eks. Ole Hansen"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Rolle (valgfritt)</Text>
                  <TextInput
                    style={styles.input}
                    value={soldier.role}
                    onChangeText={(value) => updateSoldier(index, 'role', value)}
                    placeholder="F.eks. Skytter"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            ))}

            <Pressable style={styles.addSoldierButton} onPress={addSoldier}>
              <IconSymbol name="plus" color={colors.primary} size={24} />
              <Text style={styles.addSoldierText}>Legg til soldat</Text>
            </Pressable>
          </View>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Lagre Endringer</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  text: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.textSecondary + '40',
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  soldierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  soldierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  soldierNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  addSoldierButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addSoldierText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0px 4px 12px rgba(76, 175, 80, 0.3)',
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
