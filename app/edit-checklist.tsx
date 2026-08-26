
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { ChecklistCategory, ChecklistItem } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExportMetaModal } from '@/components/ExportMetaModal';
import { exportSingleCategory, exportFullChecklist } from '@/utils/exportChecklist';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

type CategoryRole = 'general' | 'weapon';

const ROLE_OPTIONS: { value: CategoryRole; label: string }[] = [
  { value: 'weapon', label: 'Våpen' },
  { value: 'general', label: 'Generell' },
];

function getRoleBadge(role: CategoryRole): { label: string; bg: string; text: string } | null {
  if (role === 'weapon') return { label: 'VÅPEN', bg: '#0D9488', text: '#fff' };
  if (role === 'general') return { label: 'GENERELL', bg: '#475569', text: '#fff' };
  return null;
}

function sortedCategories(checklist: ChecklistCategory[]): ChecklistCategory[] {
  const order: CategoryRole[] = ['weapon', 'general'];
  return [...checklist].sort((a, b) => {
    const aRole = (a.categoryRole ?? 'general') as CategoryRole;
    const bRole = (b.categoryRole ?? 'general') as CategoryRole;
    return order.indexOf(aRole) - order.indexOf(bRole);
  });
}

export default function EditChecklistScreen() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderChecklist, setReorderChecklist] = useState<ChecklistCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    categoryRole: CategoryRole;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    categoryId: string;
    id: string;
    name: string;
  } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryRole, setCategoryRole] = useState<CategoryRole>('general');
  const [itemName, setItemName] = useState('');
  const insets = useSafeAreaInsets();

  // Export state
  const [exportModal, setExportModal] = useState<{
    visible: boolean;
    mode: 'single' | 'full';
    category: ChecklistCategory | null;
    initialTitle: string;
  }>({ visible: false, mode: 'single', category: null, initialTitle: '' });
  const [lastAuthor, setLastAuthor] = useState('');

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      const [data, author] = await Promise.all([
        storage.getChecklist(),
        storage.getLastExportAuthor(),
      ]);
      setChecklist(data);
      setLastAuthor(author);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterReorder = () => {
    console.log('[Edit] User tapped Sorter — entering reorder mode');
    setReorderChecklist([...checklist]);
    setReorderMode(true);
  };

  const handleExitReorder = async () => {
    console.log('[Edit] User tapped Ferdig — exiting reorder mode, saving new order');
    try {
      await storage.saveChecklist(reorderChecklist);
      setChecklist(reorderChecklist);
    } catch (error) {
      console.error('[Edit] Error saving reordered checklist:', error);
      Alert.alert('Feil', 'Kunne ikke lagre ny rekkefølge');
    }
    setReorderMode(false);
  };

  const handleExportCategory = (category: ChecklistCategory) => {
    console.log('[Edit] User tapped export for category:', category.name);
    setExportModal({ visible: true, mode: 'single', category, initialTitle: category.name });
  };

  const handleExportFull = () => {
    console.log('[Edit] User tapped Del hele sjekklisten');
    setExportModal({ visible: true, mode: 'full', category: null, initialTitle: 'Hele sjekklisten' });
  };

  const handleExportSubmit = async ({ title, author }: { title: string; author: string }) => {
    setExportModal(prev => ({ ...prev, visible: false }));
    console.log('[Edit] Export submit — mode:', exportModal.mode, 'title:', title, 'author:', author);
    await storage.setLastExportAuthor(author);
    setLastAuthor(author);
    try {
      if (exportModal.mode === 'single' && exportModal.category) {
        await exportSingleCategory(exportModal.category, title, author);
      } else if (exportModal.mode === 'full') {
        await exportFullChecklist(checklist, title, author);
      }
    } catch (error) {
      console.error('[Edit] Export failed:', error);
      Alert.alert('Feil', 'Deling mislyktes. Prøv igjen.');
    }
  };

  const handleAddCategory = () => {
    console.log('User tapped Add Category');
    setEditingCategory({ id: '', name: '', categoryRole: 'general' });
    setCategoryName('');
    setCategoryRole('general');
  };

  const handleEditCategory = (category: ChecklistCategory) => {
    console.log('User tapped Edit Category:', category.id, category.name);
    const role = (category.categoryRole ?? 'general') as CategoryRole;
    setEditingCategory({ id: category.id, name: category.name, categoryRole: role });
    setCategoryName(category.name);
    setCategoryRole(role);
  };

  const handleSaveCategory = async () => {
    console.log('User saved category:', categoryName, 'role:', categoryRole);
    if (!categoryName.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn kategorinavn');
      return;
    }

    try {
      let updatedChecklist = [...checklist];

      if (editingCategory?.id) {
        const index = updatedChecklist.findIndex(c => c.id === editingCategory.id);
        if (index !== -1) {
          updatedChecklist[index] = {
            ...updatedChecklist[index],
            name: categoryName.trim(),
            categoryRole,
          };
        }
      } else {
        const newCategory: ChecklistCategory = {
          id: `cat-${Date.now()}`,
          name: categoryName.trim(),
          categoryRole,
          items: [],
        };
        updatedChecklist.push(newCategory);
      }

      await storage.saveChecklist(updatedChecklist);
      setChecklist(updatedChecklist);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryRole('general');
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Feil', 'Kunne ikke lagre kategorien');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    console.log('User tapped Delete Category:', categoryId);
    const category = checklist.find(c => c.id === categoryId);
    const isWeapon = (category?.categoryRole ?? 'general') === 'weapon';

    let weaponSoldierCount = 0;
    if (isWeapon) {
      try {
        const squadSettings = await storage.getSquadSettings();
        if (squadSettings) {
          weaponSoldierCount = squadSettings.soldiers.filter(
            s =>
              s.personligVapenCategoryId === categoryId ||
              s.sekundærVåpenCategoryId === categoryId,
          ).length;
        }
      } catch (error) {
        console.error('Error loading squad settings for delete check:', error);
      }
    }

    let message =
      'Er du sikker på at du vil slette denne kategorien og alle dens elementer? Dette vil også fjerne relaterte oppføringer fra loggen.';
    if (isWeapon && weaponSoldierCount > 0) {
      message +=
        ' Soldater som er tildelt dette våpenet vil få våpenvalget sitt fjernet.';
    }

    Alert.alert('Bekreft sletting', message, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('Confirmed delete category:', categoryId);
            await storage.addDeletedCategoryId(categoryId);
            await storage.purgeCategoryFromSessions(categoryId);
            if (isWeapon) {
              await storage.clearWeaponCategoryFromSquad(categoryId);
            }
            const updatedChecklist = checklist.filter(c => c.id !== categoryId);
            await storage.saveChecklist(updatedChecklist);
            setChecklist(updatedChecklist);
          } catch (error) {
            console.error('Error deleting category:', error);
            Alert.alert('Feil', 'Kunne ikke slette kategorien');
          }
        },
      },
    ]);
  };

  const handleAddItem = (categoryId: string) => {
    console.log('User tapped Add Item to category:', categoryId);
    setEditingItem({ categoryId, id: '', name: '' });
    setItemName('');
  };

  const handleEditItem = (categoryId: string, item: ChecklistItem) => {
    console.log('User tapped Edit Item:', item.id, item.name);
    setEditingItem({ categoryId, id: item.id, name: item.name });
    setItemName(item.name);
  };

  const handleSaveItem = async () => {
    console.log('User saved item:', itemName);
    if (!itemName.trim() || !editingItem) {
      Alert.alert('Feil', 'Vennligst skriv inn elementnavn');
      return;
    }

    try {
      let updatedChecklist = [...checklist];
      const categoryIndex = updatedChecklist.findIndex(c => c.id === editingItem.categoryId);

      if (categoryIndex !== -1) {
        if (editingItem.id) {
          const itemIndex = updatedChecklist[categoryIndex].items.findIndex(
            i => i.id === editingItem.id
          );
          if (itemIndex !== -1) {
            updatedChecklist[categoryIndex].items[itemIndex] = {
              ...updatedChecklist[categoryIndex].items[itemIndex],
              name: itemName.trim(),
            };
          }
        } else {
          const newItem: ChecklistItem = {
            id: `item-${Date.now()}`,
            name: itemName.trim(),
            categoryId: editingItem.categoryId,
          };
          updatedChecklist[categoryIndex].items.push(newItem);
        }

        await storage.saveChecklist(updatedChecklist);
        setChecklist(updatedChecklist);
        setEditingItem(null);
        setItemName('');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Feil', 'Kunne ikke lagre elementet');
    }
  };

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    console.log('User tapped Delete Item:', itemId, 'from category:', categoryId);
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette dette elementet? Dette vil også fjerne relaterte oppføringer fra loggen.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Confirmed delete item:', itemId);
              await storage.addDeletedItemId(itemId);
              await storage.purgeItemFromSessions(itemId);
              const updatedChecklist = [...checklist];
              const categoryIndex = updatedChecklist.findIndex(c => c.id === categoryId);
              if (categoryIndex !== -1) {
                updatedChecklist[categoryIndex] = {
                  ...updatedChecklist[categoryIndex],
                  items: updatedChecklist[categoryIndex].items.filter(i => i.id !== itemId),
                };
                await storage.saveChecklist(updatedChecklist);
                setChecklist(updatedChecklist);
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Feil', 'Kunne ikke slette elementet');
            }
          },
        },
      ]
    );
  };

  const handleFinish = () => {
    console.log('User tapped Finish in edit-checklist');
    router.back();
  };

  // ── Reorder helpers ──────────────────────────────────────────────────────────

  const handleCategoryReorder = useCallback(
    (role: CategoryRole, newData: ChecklistCategory[]) => {
      console.log('[Edit] Category reorder in section:', role, '— new order:', newData.map(c => c.name));
      setReorderChecklist(prev => {
        // Keep categories of the OTHER role in their original positions, replace this role's slice
        const otherRole = role === 'weapon' ? 'general' : 'weapon';
        const others = prev.filter(c => (c.categoryRole ?? 'general') === otherRole);
        // Preserve original array order for others, put this role's new order after/before
        if (role === 'weapon') {
          return [...newData, ...others];
        } else {
          return [...others, ...newData];
        }
      });
    },
    [],
  );

  const handleItemReorder = useCallback(
    (categoryId: string, newItems: ChecklistItem[]) => {
      console.log('[Edit] Item reorder in category:', categoryId, '— new order:', newItems.map(i => i.name));
      setReorderChecklist(prev =>
        prev.map(cat =>
          cat.id === categoryId ? { ...cat, items: newItems } : cat,
        ),
      );
    },
    [],
  );

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderReorderItemRow = useCallback(
    (categoryId: string) =>
      ({ item, drag, isActive }: RenderItemParams<ChecklistItem>) => {
        return (
          <ScaleDecorator>
            <View style={[styles.itemRow, isActive && styles.itemRowActive]}>
              <Pressable
                onLongPress={drag}
                style={styles.dragHandle}
                hitSlop={8}
              >
                <IconSymbol name="line.3.horizontal" color={colors.primary} size={22} />
              </Pressable>
              <Text style={[styles.itemName, { fontFamily: bodyFont }]} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          </ScaleDecorator>
        );
      },
    [],
  );

  const renderReorderCategory = useCallback(
    (role: CategoryRole) =>
      ({ item: category, drag, isActive }: RenderItemParams<ChecklistCategory>) => {
        const catRole = (category.categoryRole ?? 'general') as CategoryRole;
        const badge = getRoleBadge(catRole);
        const catItems = reorderChecklist.find(c => c.id === category.id)?.items ?? category.items;

        return (
          <ScaleDecorator>
            <View style={[styles.categoryCard, isActive && styles.categoryCardActive]}>
              <View style={styles.categoryHeader}>
                <Pressable
                  onLongPress={drag}
                  style={styles.dragHandle}
                  hitSlop={8}
                >
                  <IconSymbol name="line.3.horizontal" color={colors.primary} size={22} />
                </Pressable>
                <View style={styles.categoryNameRow}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {badge && (
                    <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.itemsContainer}>
                <DraggableFlatList
                  data={catItems}
                  keyExtractor={i => i.id}
                  onDragEnd={({ data }) => handleItemReorder(category.id, data)}
                  renderItem={renderReorderItemRow(category.id)}
                  scrollEnabled={false}
                  activationDistance={5}
                />
              </View>
            </View>
          </ScaleDecorator>
        );
      },
    [reorderChecklist, handleItemReorder, renderReorderItemRow],
  );

  const renderCategory = (category: ChecklistCategory) => {
    const role = (category.categoryRole ?? 'general') as CategoryRole;
    const badge = getRoleBadge(role);
    return (
      <View key={category.id} style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryNameRow}>
            <Text style={styles.categoryName}>{category.name}</Text>
            {badge && (
              <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            )}
          </View>
          <View style={styles.categoryActions}>
            <Pressable onPress={() => handleExportCategory(category)}>
              <IconSymbol name="square.and.arrow.up" color={colors.primary} size={20} />
            </Pressable>
            <Pressable onPress={() => handleEditCategory(category)}>
              <IconSymbol name="pencil" color={colors.accent} size={20} />
            </Pressable>
            <Pressable onPress={() => handleDeleteCategory(category.id)}>
              <IconSymbol name="trash" color={colors.error} size={20} />
            </Pressable>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          {category.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={[styles.itemName, { fontFamily: bodyFont }]} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.itemActions}>
                <Pressable onPress={() => handleEditItem(category.id, item)}>
                  <IconSymbol name="pencil" color={colors.accent} size={18} />
                </Pressable>
                <Pressable onPress={() => handleDeleteItem(category.id, item.id)}>
                  <IconSymbol name="trash" color={colors.error} size={18} />
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            style={styles.addItemButton}
            onPress={() => handleAddItem(category.id)}
          >
            <IconSymbol name="plus" color={colors.primary} size={20} />
            <Text style={styles.addItemText}>Legg til element</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
          <View style={commonStyles.modalNavBar}>
            <View style={{ width: 24 }} />
            <Text style={commonStyles.modalNavBarTitle}>Rediger KTS-liste</Text>
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

  const sorted = sortedCategories(checklist);
  const weaponCats = sorted.filter(c => (c.categoryRole ?? 'general') === 'weapon');
  const generalCats = sorted.filter(c => (c.categoryRole ?? 'general') === 'general');

  const reorderSorted = sortedCategories(reorderChecklist);
  const reorderWeaponCats = reorderSorted.filter(c => (c.categoryRole ?? 'general') === 'weapon');
  const reorderGeneralCats = reorderSorted.filter(c => (c.categoryRole ?? 'general') === 'general');

  // ── Reorder mode layout ──────────────────────────────────────────────────────
  if (reorderMode) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
          <View style={commonStyles.modalNavBar}>
            <Pressable onPress={handleExitReorder}>
              <Text style={styles.navTextButton}>Ferdig</Text>
            </Pressable>
            <Text style={commonStyles.modalNavBarTitle}>Rediger KTS-liste</Text>
            <Pressable onPress={() => { console.log('[Edit] User tapped X close in reorder mode'); router.back(); }}>
              <IconSymbol name="xmark" color={colors.error} size={24} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={true}>
            <View style={styles.section}>
              {reorderWeaponCats.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>VÅPENKATEGORIER</Text>
                  <DraggableFlatList
                    data={reorderWeaponCats}
                    keyExtractor={c => c.id}
                    onDragEnd={({ data }) => handleCategoryReorder('weapon', data)}
                    renderItem={renderReorderCategory('weapon')}
                    scrollEnabled={false}
                    activationDistance={5}
                  />
                </>
              )}
              {reorderGeneralCats.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>GENERELLE KATEGORIER</Text>
                  <DraggableFlatList
                    data={reorderGeneralCats}
                    keyExtractor={c => c.id}
                    onDragEnd={({ data }) => handleCategoryReorder('general', data)}
                    renderItem={renderReorderCategory('general')}
                    scrollEnabled={false}
                    activationDistance={5}
                  />
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </>
    );
  }

  // ── Normal mode layout ───────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
        <View style={commonStyles.modalNavBar}>
          <Pressable onPress={handleEnterReorder}>
            <Text style={styles.navTextButton}>Sorter</Text>
          </Pressable>
          <Text style={commonStyles.modalNavBarTitle}>Rediger KTS-liste</Text>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {weaponCats.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>VÅPENKATEGORIER</Text>
                {weaponCats.map(renderCategory)}
              </>
            )}
            {generalCats.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>GENERELLE KATEGORIER</Text>
                {generalCats.map(renderCategory)}
              </>
            )}

            <Pressable style={styles.addCategoryButton} onPress={handleAddCategory}>
              <IconSymbol name="plus" color={colors.primary} size={24} />
              <Text style={styles.addCategoryText}>Legg til kategori</Text>
            </Pressable>

            <Pressable style={styles.shareFullButton} onPress={handleExportFull}>
              <IconSymbol name="square.and.arrow.up" color={colors.primary} size={22} />
              <Text style={styles.shareFullButtonText}>Del hele sjekklisten</Text>
            </Pressable>
          </View>

          <Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Ferdig</Text>
          </Pressable>
        </ScrollView>

        {/* Category edit modal */}
        <Modal
          visible={editingCategory !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingCategory(null)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingCategory?.id ? 'Rediger Kategori' : 'Ny Kategori'}
                </Text>
                <Pressable onPress={() => setEditingCategory(null)}>
                  <IconSymbol name="xmark" color={colors.error} size={24} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.modalInput, { fontFamily: bodyFont }]}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="Kategorinavn"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.roleLabel}>Kategoritype</Text>
              <View style={styles.segmentedControl}>
                {ROLE_OPTIONS.map(opt => {
                  const isSelected = categoryRole === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.segmentOption, isSelected && styles.segmentOptionSelected]}
                      onPress={() => {
                        console.log('User selected category role:', opt.value);
                        setCategoryRole(opt.value);
                      }}
                    >
                      <Text style={[styles.segmentOptionText, isSelected && styles.segmentOptionTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditingCategory(null)}
                >
                  <Text style={styles.modalButtonText}>Avbryt</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveCategory}
                >
                  <Text style={styles.modalButtonTextSave}>Lagre</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Item edit modal */}
        <Modal
          visible={editingItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingItem(null)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem?.id ? 'Rediger Element' : 'Nytt Element'}
                </Text>
                <Pressable onPress={() => setEditingItem(null)}>
                  <IconSymbol name="xmark" color={colors.error} size={24} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline, { fontFamily: bodyFont }]}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Elementnavn"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditingItem(null)}
                >
                  <Text style={styles.modalButtonText}>Avbryt</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveItem}
                >
                  <Text style={styles.modalButtonTextSave}>Lagre</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Export meta modal */}
        <ExportMetaModal
          visible={exportModal.visible}
          initialTitle={exportModal.initialTitle}
          initialAuthor={lastAuthor}
          onSubmit={handleExportSubmit}
          onClose={() => {
            console.log('[Edit] ExportMetaModal closed');
            setExportModal(prev => ({ ...prev, visible: false }));
          }}
        />
      </View>
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  navTextButton: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  categoryCardActive: {
    opacity: 0.95,
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.5)',
    elevation: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  categoryNameRow: {
    flex: 1,
    flexDirection: 'column',
    gap: 6,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
    paddingTop: 2,
  },
  dragHandle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(188, 241, 53, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 4,
  },
  itemsContainer: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemRowActive: {
    opacity: 0.9,
  },
  itemName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  addItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  addCategoryButton: {
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
    marginTop: 8,
  },
  addCategoryText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  shareFullButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 12,
  },
  shareFullButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  finishButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    boxShadow: '0px 4px 12px rgba(188, 241, 53, 0.3)',
    elevation: 5,
    minHeight: 56,
    justifyContent: 'center',
  },
  finishButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 16,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
    marginBottom: 4,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOptionSelected: {
    backgroundColor: colors.primary,
  },
  segmentOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  segmentOptionTextSelected: {
    color: '#000',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalButtonTextSave: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
