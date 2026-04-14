
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { Soldier, SquadSettings, ChecklistCategory } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [squadName, setSquadName] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [settings, checklistData] = await Promise.all([
        storage.getSquadSettings(),
        storage.getChecklist(),
      ]);
      if (settings) {
        setSquadName(settings.squadName);
        setSoldiers(settings.soldiers);
      }
      setChecklist(checklistData);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const primaryWeaponCategories = checklist.filter(c => c.categoryRole === 'primaryWeapon');
  const secondaryWeaponCategories = checklist.filter(c => c.categoryRole === 'secondaryWeapon');

  const updateSoldier = (index: number, field: 'name' | 'role' | 'personligVapenCategoryId', value: string) => {
    const updated = [...soldiers];
    updated[index][field] = value;
    setSoldiers(updated);
  };

  const updateSoldierSecondaryWeapon = (index: number, categoryId: string | undefined) => {
    const updated = [...soldiers];
    updated[index] = { ...updated[index], sekundærVåpenCategoryId: categoryId };
    setSoldiers(updated);
  };

  const addSoldier = () => {
    console.log('User tapped Add Soldier');
    const defaultWeaponId = primaryWeaponCategories.length > 0 ? primaryWeaponCategories[0].id : '';
    setSoldiers([
      ...soldiers,
      {
        id: `soldier-${Date.now()}`,
        name: '',
        role: '',
        personligVapenCategoryId: defaultWeaponId,
      },
    ]);
  };

  const removeSoldier = (index: number) => {
    console.log('User tapped Remove Soldier at index:', index);
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
    console.log('User tapped Save in settings');
    if (!squadName.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn lagets navn');
      return;
    }

    const incompleteSoldiers = soldiers.filter(s => !s.name.trim());
    if (incompleteSoldiers.length > 0) {
      Alert.alert('Feil', 'Vennligst fyll inn navn for alle soldater');
      return;
    }

    if (primaryWeaponCategories.length > 0) {
      const missingWeapon = soldiers.find(s => !s.personligVapenCategoryId);
      if (missingWeapon) {
        Alert.alert('Feil', 'Vennligst velg personlig våpen for alle soldater');
        return;
      }
    }

    try {
      const settings: SquadSettings = {
        squadName: squadName.trim(),
        soldiers,
      };
      await storage.saveSquadSettings(settings);
      router.back();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Feil', 'Kunne ikke lagre innstillingene');
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
          <View style={commonStyles.modalNavBar}>
            <View style={{ width: 24 }} />
            <Text style={commonStyles.modalNavBarTitle}>Rediger Lag</Text>
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="xmark" color={colors.error} size={24} />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.text, { fontFamily: bodyFont }]}>Laster...</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.fullScreenModal, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={commonStyles.modalNavBar}>
          <View style={{ width: 24 }} />
          <Text style={commonStyles.modalNavBarTitle}>Rediger Lag</Text>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Lagsnavn</Text>
              <TextInput
                style={[styles.input, { fontFamily: bodyFont }]}
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
                    <IconSymbol name="trash" color={colors.error} size={20} />
                  </Pressable>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Navn</Text>
                  <TextInput
                    style={[styles.input, { fontFamily: bodyFont }]}
                    value={soldier.name}
                    onChangeText={(value) => updateSoldier(index, 'name', value)}
                    placeholder="F.eks. Ole Hansen"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Rolle (valgfritt)</Text>
                  <TextInput
                    style={[styles.input, { fontFamily: bodyFont }]}
                    value={soldier.role}
                    onChangeText={(value) => updateSoldier(index, 'role', value)}
                    placeholder="F.eks. Skytter"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                {primaryWeaponCategories.length > 0 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Primærvåpen</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      <View style={styles.chipRow}>
                        {primaryWeaponCategories.map(cat => {
                          const isSelected = soldier.personligVapenCategoryId === cat.id;
                          return (
                            <Pressable
                              key={cat.id}
                              style={[styles.chip, isSelected && styles.chipSelected]}
                              onPress={() => {
                                console.log('User selected primary weapon for soldier', index, ':', cat.name);
                                updateSoldier(index, 'personligVapenCategoryId', cat.id);
                              }}
                            >
                              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                {cat.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
                {secondaryWeaponCategories.length > 0 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Sekundærvåpen</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      <View style={styles.chipRow}>
                        <Pressable
                          style={[styles.chip, !soldier.sekundærVåpenCategoryId && styles.chipSelected]}
                          onPress={() => {
                            console.log('User cleared secondary weapon for soldier', index);
                            updateSoldierSecondaryWeapon(index, undefined);
                          }}
                        >
                          <Text style={[styles.chipText, !soldier.sekundærVåpenCategoryId && styles.chipTextSelected]}>
                            Ingen
                          </Text>
                        </Pressable>
                        {secondaryWeaponCategories.map(cat => {
                          const isSelected = soldier.sekundærVåpenCategoryId === cat.id;
                          return (
                            <Pressable
                              key={cat.id}
                              style={[styles.chip, isSelected && styles.chipSelected]}
                              onPress={() => {
                                console.log('User selected secondary weapon for soldier', index, ':', cat.name);
                                updateSoldierSecondaryWeapon(index, cat.id);
                              }}
                            >
                              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                {cat.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            ))}

            <Pressable style={styles.addSoldierButton} onPress={addSoldier}>
              <IconSymbol name="plus" color={colors.primary} size={24} />
              <Text style={styles.addSoldierText}>Legg til soldat</Text>
            </Pressable>
          </View>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Ferdig</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  text: {
    fontSize: 18,
    color: colors.text,
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
    borderColor: colors.inputBorder,
  },
  soldierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
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
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  chipTextSelected: {
    color: '#000',
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
    boxShadow: '0px 4px 12px rgba(188, 241, 53, 0.3)',
    elevation: 5,
    minHeight: 56,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
