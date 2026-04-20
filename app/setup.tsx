
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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { Soldier, ChecklistCategory } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Weapon Picker Modal ──────────────────────────────────────────────────────

interface WeaponPickerModalProps {
  visible: boolean;
  title: string;
  options: ChecklistCategory[];
  includeNone: boolean;
  selectedId: string | undefined;
  excludeId: string | undefined;
  onSelect: (id: string | undefined) => void;
  onClose: () => void;
}

function WeaponPickerModal({
  visible,
  title,
  options,
  includeNone,
  selectedId,
  excludeId,
  onSelect,
  onClose,
}: WeaponPickerModalProps) {
  const filtered = options.filter(c => c.id !== excludeId);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.overlay} onPress={onClose}>
        <Pressable style={pickerStyles.sheet} onPress={() => {}}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>{title}</Text>
          <ScrollView bounces={false}>
            {includeNone && (
              <Pressable
                style={[pickerStyles.option, !selectedId && pickerStyles.optionSelected]}
                onPress={() => {
                  console.log('User selected "Ingen" for weapon picker:', title);
                  onSelect(undefined);
                  onClose();
                }}
              >
                <Text style={[pickerStyles.optionText, !selectedId && pickerStyles.optionTextSelected]}>
                  Ingen
                </Text>
                {!selectedId && (
                  <IconSymbol name="checkmark" color="#000" size={18} />
                )}
              </Pressable>
            )}
            {filtered.map(cat => {
              const isSelected = selectedId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
                  onPress={() => {
                    console.log('User selected weapon:', cat.name, 'in picker:', title);
                    onSelect(cat.id);
                    onClose();
                  }}
                >
                  <Text style={[pickerStyles.optionText, isSelected && pickerStyles.optionTextSelected]}>
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <IconSymbol name="checkmark" color="#000" size={18} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  optionTextSelected: {
    color: '#000',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SetupScreen() {
  const [squadName, setSquadName] = useState('');
  const [numberOfSoldiers, setNumberOfSoldiers] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [step, setStep] = useState<'squad' | 'soldiers'>('squad');
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);

  // Picker state: which soldier + which slot is open
  const [pickerSoldierIndex, setPickerSoldierIndex] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<'primary' | 'secondary' | null>(null);

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

  const weaponCategories = checklist.filter(c => c.categoryRole === 'weapon');

  const getDefaultPrimaryId = (): string => {
    const hk416 = weaponCategories.find(c => c.name === 'HK416');
    return hk416?.id ?? (weaponCategories[0]?.id ?? '');
  };

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

    const defaultId = getDefaultPrimaryId();
    const newSoldiers: Soldier[] = Array.from({ length: num }, (_, i) => ({
      id: `soldier-${Date.now()}-${i}`,
      name: '',
      role: '',
      personligVapenCategoryId: defaultId,
    }));

    setSoldiers(newSoldiers);
    setStep('soldiers');
  };

  const updateSoldierField = (index: number, field: 'name' | 'role', value: string) => {
    const updated = [...soldiers];
    updated[index] = { ...updated[index], [field]: value };
    setSoldiers(updated);
  };

  const updateSoldierPrimary = (index: number, categoryId: string) => {
    const updated = [...soldiers];
    const soldier = { ...updated[index], personligVapenCategoryId: categoryId };
    // If new primary == current secondary, clear secondary
    if (soldier.sekundærVåpenCategoryId === categoryId) {
      soldier.sekundærVåpenCategoryId = undefined;
    }
    updated[index] = soldier;
    setSoldiers(updated);
  };

  const updateSoldierSecondary = (index: number, categoryId: string | undefined) => {
    const updated = [...soldiers];
    updated[index] = { ...updated[index], sekundærVåpenCategoryId: categoryId };
    setSoldiers(updated);
  };

  const openPicker = (soldierIndex: number, slot: 'primary' | 'secondary') => {
    console.log('User opened weapon picker for soldier', soldierIndex, 'slot:', slot);
    setPickerSoldierIndex(soldierIndex);
    setPickerSlot(slot);
  };

  const closePicker = () => {
    setPickerSoldierIndex(null);
    setPickerSlot(null);
  };

  const handlePickerSelect = (id: string | undefined) => {
    if (pickerSoldierIndex === null || pickerSlot === null) return;
    if (pickerSlot === 'primary' && id !== undefined) {
      updateSoldierPrimary(pickerSoldierIndex, id);
    } else if (pickerSlot === 'secondary') {
      updateSoldierSecondary(pickerSoldierIndex, id);
    }
  };

  const handleComplete = async () => {
    console.log('User tapped Complete setup');
    const incompleteSoldiers = soldiers.filter(s => !s.name.trim());
    if (incompleteSoldiers.length > 0) {
      Alert.alert('Feil', 'Vennligst fyll inn navn for alle soldater');
      return;
    }

    if (weaponCategories.length > 0) {
      const missingWeapon = soldiers.find(s => !s.personligVapenCategoryId);
      if (missingWeapon) {
        Alert.alert('Feil', 'Vennligst velg primærvåpen for alle soldater');
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

  // Determine picker props
  const activeSoldier = pickerSoldierIndex !== null ? soldiers[pickerSoldierIndex] : null;
  const pickerExcludeId =
    pickerSlot === 'primary'
      ? activeSoldier?.sekundærVåpenCategoryId
      : activeSoldier?.personligVapenCategoryId;
  const pickerSelectedId =
    pickerSlot === 'primary'
      ? activeSoldier?.personligVapenCategoryId
      : activeSoldier?.sekundærVåpenCategoryId;
  const pickerTitle = pickerSlot === 'primary' ? 'Velg primærvåpen' : 'Velg sekundærvåpen';

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

        {soldiers.map((soldier, index) => {
          const primaryName = weaponCategories.find(c => c.id === soldier.personligVapenCategoryId)?.name ?? 'Velg...';
          const secondaryName = soldier.sekundærVåpenCategoryId
            ? (weaponCategories.find(c => c.id === soldier.sekundærVåpenCategoryId)?.name ?? 'Velg...')
            : 'Ingen';

          return (
            <View key={soldier.id} style={styles.soldierCard}>
              <Text style={styles.soldierNumber}>Soldat {index + 1}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Navn</Text>
                <TextInput
                  style={[styles.input, { fontFamily: bodyFont }]}
                  value={soldier.name}
                  onChangeText={(value) => updateSoldierField(index, 'name', value)}
                  placeholder="F.eks. Ole Hansen"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Rolle (valgfritt)</Text>
                <TextInput
                  style={[styles.input, { fontFamily: bodyFont }]}
                  value={soldier.role}
                  onChangeText={(value) => updateSoldierField(index, 'role', value)}
                  placeholder="F.eks. Geværsoldat"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {weaponCategories.length > 0 && (
                <View style={styles.weaponRow}>
                  <View style={styles.weaponCol}>
                    <Text style={styles.weaponColLabel}>Primærvåpen</Text>
                    <Pressable
                      style={styles.weaponSelector}
                      onPress={() => openPicker(index, 'primary')}
                    >
                      <Text style={styles.weaponSelectorText} numberOfLines={1}>
                        {primaryName}
                      </Text>
                      <IconSymbol name="chevron.down" color={colors.primary} size={16} />
                    </Pressable>
                  </View>
                  <View style={styles.weaponCol}>
                    <Text style={styles.weaponColLabel}>Sekundærvåpen</Text>
                    <Pressable
                      style={styles.weaponSelector}
                      onPress={() => openPicker(index, 'secondary')}
                    >
                      <Text style={styles.weaponSelectorText} numberOfLines={1}>
                        {secondaryName}
                      </Text>
                      <IconSymbol name="chevron.down" color={colors.primary} size={16} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
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

      <WeaponPickerModal
        visible={pickerSoldierIndex !== null && pickerSlot !== null}
        title={pickerTitle}
        options={weaponCategories}
        includeNone={pickerSlot === 'secondary'}
        selectedId={pickerSelectedId}
        excludeId={pickerExcludeId}
        onSelect={handlePickerSelect}
        onClose={closePicker}
      />
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
  weaponRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  weaponCol: {
    flex: 1,
  },
  weaponColLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    fontFamily: 'BigShouldersStencil_700Bold',
    letterSpacing: 0.5,
  },
  weaponSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  weaponSelectorText: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    fontFamily: bodyFont,
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
