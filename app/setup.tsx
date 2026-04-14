
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
import { router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { Soldier, ChecklistCategory } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';

export default function SetupScreen() {
  const [squadName, setSquadName] = useState('');
  const [numberOfSoldiers, setNumberOfSoldiers] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [step, setStep] = useState<'squad' | 'soldiers'>('squad');
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      const data = await storage.getChecklist();
      setChecklist(data);
    } catch (error) {
      console.error('Error loading checklist in setup:', error);
    }
  };

  const primaryWeaponCategories = checklist.filter(c => c.categoryRole === 'primaryWeapon');
  const secondaryWeaponCategories = checklist.filter(c => c.categoryRole === 'secondaryWeapon');
  const defaultWeaponId = primaryWeaponCategories.length > 0 ? primaryWeaponCategories[0].id : '';

  const handleSquadSubmit = () => {
    console.log('User submitted squad info:', squadName, numberOfSoldiers);
    if (!squadName.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn lagets navn');
      return;
    }

    const num = parseInt(numberOfSoldiers);
    if (isNaN(num) || num < 1 || num > 50) {
      Alert.alert('Feil', 'Vennligst skriv inn et gyldig antall soldater (1-50)');
      return;
    }

    const newSoldiers: Soldier[] = Array.from({ length: num }, (_, i) => ({
      id: `soldier-${Date.now()}-${i}`,
      name: '',
      role: '',
      personligVapenCategoryId: defaultWeaponId,
    }));

    setSoldiers(newSoldiers);
    setStep('soldiers');
  };

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

  const handleComplete = async () => {
    console.log('User tapped Complete setup');
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
      await storage.saveSquadSettings({
        squadName: squadName.trim(),
        soldiers,
      });
      await storage.setSetupComplete(true);
      router.replace('/(tabs)/(home)');
    } catch (error) {
      console.error('Error saving setup:', error);
      Alert.alert('Feil', 'Kunne ikke lagre innstillingene');
    }
  };

  if (step === 'squad') {
    return (
      <KeyboardAvoidingView
        style={commonStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Oppsett av Lag</Text>
          <Text style={[styles.subtitle, { fontFamily: bodyFont }]}>Definer lagets detaljer</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Lagsnavn</Text>
            <TextInput
              style={[styles.input, { fontFamily: bodyFont }]}
              value={squadName}
              onChangeText={setSquadName}
              placeholder="F.eks. 2 Alfa"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Antall Soldater</Text>
            <TextInput
              style={[styles.input, { fontFamily: bodyFont }]}
              value={numberOfSoldiers}
              onChangeText={setNumberOfSoldiers}
              placeholder="F.eks. 8"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={handleSquadSubmit}>
            <Text style={styles.primaryButtonText}>Neste</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Soldater</Text>
        <Text style={[styles.subtitle, { fontFamily: bodyFont }]}>Definer navn og rolle for hver soldat</Text>

        {soldiers.map((soldier, index) => (
          <View key={soldier.id} style={styles.soldierCard}>
            <Text style={styles.soldierNumber}>Soldat {index + 1}</Text>
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
                placeholder="F.eks. Geværsoldat"
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
      </ScrollView>

      <View style={styles.stickyButtonContainer}>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              console.log('User tapped Back in soldiers step');
              setStep('squad');
            }}
          >
            <Text style={styles.secondaryButtonText}>Tilbake</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleComplete}
          >
            <Text style={styles.primaryButtonText}>Fullfør</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 140,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
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
  soldierNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
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
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '40',
    padding: 20,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(188, 241, 53, 0.3)',
    elevation: 5,
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
