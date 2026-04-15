
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
import { Stack, router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { Soldier, SquadSettings, ChecklistCategory } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function SettingsScreen() {
  const [squadName, setSquadName] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Picker state
  const [pickerSoldierIndex, setPickerSoldierIndex] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<'primary' | 'secondary' | null>(null);

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

  const weaponCategories = checklist.filter(c => c.categoryRole === 'weapon');

  const getDefaultPrimaryId = (): string => {
    const hk416 = weaponCategories.find(c => c.name === 'HK416');
    return hk416?.id ?? (weaponCategories[0]?.id ?? '');
  };

  const updateSoldierField = (index: number, field: 'name' | 'role', value: string) => {
    const updated = [...soldiers];
    updated[index] = { ...updated[index], [field]: value };
    setSoldiers(updated);
  };

  const updateSoldierPrimary = (index: number, categoryId: string) => {
    const updated = [...soldiers];
    const soldier = { ...updated[index], personligVapenCategoryId: categoryId };
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

  const addSoldier = () => {
    console.log('User tapped Add Soldier');
    const defaultId = getDefaultPrimaryId();
    setSoldiers([
      ...soldiers,
      {
        id: `soldier-${Date.now()}`,
        name: '',
        role: '',
        personligVapenCategoryId: defaultId,
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

    if (weaponCategories.length > 0) {
      const missingWeapon = soldiers.find(s => !s.personligVapenCategoryId);
      if (missingWeapon) {
        Alert.alert('Feil', 'Vennligst velg primærvåpen for alle soldater');
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

  // Picker props
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

            {soldiers.map((soldier, index) => {
              const primaryName = weaponCategories.find(c => c.id === soldier.personligVapenCategoryId)?.name ?? 'Velg...';
              const secondaryName = soldier.sekundærVåpenCategoryId
                ? (weaponCategories.find(c => c.id === soldier.sekundærVåpenCategoryId)?.name ?? 'Velg...')
                : 'Ingen';

              return (
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
                      placeholder="F.eks. Skytter"
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
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
