
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { ChecklistCategory, ChecklistItem } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditChecklistScreen() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    categoryId: string;
    id: string;
    name: string;
  } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      const data = await storage.getChecklist();
      setChecklist(data);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory({ id: '', name: '' });
    setCategoryName('');
  };

  const handleEditCategory = (category: ChecklistCategory) => {
    setEditingCategory({ id: category.id, name: category.name });
    setCategoryName(category.name);
  };

  const handleSaveCategory = async () => {
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
          };
        }
      } else {
        const newCategory: ChecklistCategory = {
          id: `cat-${Date.now()}`,
          name: categoryName.trim(),
          items: [],
        };
        updatedChecklist.push(newCategory);
      }

      await storage.saveChecklist(updatedChecklist);
      setChecklist(updatedChecklist);
      setEditingCategory(null);
      setCategoryName('');
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Feil', 'Kunne ikke lagre kategorien');
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne kategorien og alle dens elementer?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedChecklist = checklist.filter(c => c.id !== categoryId);
              await storage.saveChecklist(updatedChecklist);
              setChecklist(updatedChecklist);
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Feil', 'Kunne ikke slette kategorien');
            }
          },
        },
      ]
    );
  };

  const handleAddItem = (categoryId: string) => {
    setEditingItem({ categoryId, id: '', name: '' });
    setItemName('');
  };

  const handleEditItem = (categoryId: string, item: ChecklistItem) => {
    setEditingItem({ categoryId, id: item.id, name: item.name });
    setItemName(item.name);
  };

  const handleSaveItem = async () => {
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
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette dette elementet?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              let updatedChecklist = [...checklist];
              const categoryIndex = updatedChecklist.findIndex(c => c.id === categoryId);

              if (categoryIndex !== -1) {
                updatedChecklist[categoryIndex].items = updatedChecklist[
                  categoryIndex
                ].items.filter(i => i.id !== itemId);
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
    router.back();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
        <View style={commonStyles.modalNavBar}>
          <View style={{ width: 24 }} />
          <Text style={commonStyles.modalNavBarTitle}>Rediger KTS-liste</Text>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {checklist.map(category => (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryActions}>
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
            ))}

            <Pressable style={styles.addCategoryButton} onPress={handleAddCategory}>
              <IconSymbol name="plus" color={colors.primary} size={24} />
              <Text style={styles.addCategoryText}>Legg til kategori</Text>
            </Pressable>
          </View>

          <Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Ferdig</Text>
          </Pressable>
        </ScrollView>

        <Modal
          visible={editingCategory !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingCategory(null)}
        >
          <View style={styles.modalOverlay}>
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
          </View>
        </Modal>

        <Modal
          visible={editingItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingItem(null)}
        >
          <View style={styles.modalOverlay}>
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
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreenModal: {
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
  },
  section: {
    marginBottom: 32,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 12,
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
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
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
