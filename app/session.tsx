
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import {
  ChecklistCategory,
  SquadSettings,
  SessionItemData,
  ItemStatus,
  ChecklistSession,
  SessionSummary,
  SoldierSummary,
  MissingItem,
} from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import * as Speech from 'expo-speech';

type ScreenType = 'category' | 'item' | 'summary';

export default function SessionScreen() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [squadSettings, setSquadSettings] = useState<SquadSettings | null>(null);
  const [sessionData, setSessionData] = useState<SessionItemData[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  const [screenType, setScreenType] = useState<ScreenType>('category');
  const [loading, setLoading] = useState(true);
  const [editingSoldierId, setEditingSoldierId] = useState<string | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [checklistData, settings] = await Promise.all([
        storage.getChecklist(),
        storage.getSquadSettings(),
      ]);

      if (!settings) {
        Alert.alert('Feil', 'Ingen lagsinnstillinger funnet');
        router.back();
        return;
      }

      setChecklist(checklistData);
      setSquadSettings(settings);

      const initialData: SessionItemData[] = [];
      checklistData.forEach(category => {
        category.items.forEach(item => {
          initialData.push({
            categoryId: category.id,
            itemId: item.id,
            statuses: settings.soldiers.map(soldier => ({
              soldierId: soldier.id,
              status: 'unchecked',
            })),
          });
        });
      });

      setSessionData(initialData);
    } catch (error) {
      console.error('Error loading session data:', error);
      Alert.alert('Feil', 'Kunne ikke laste data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalItems = () => {
    return checklist.reduce((total, cat) => total + cat.items.length, 0);
  };

  const getCurrentItemNumber = () => {
    let count = 0;
    for (let i = 0; i < currentCategoryIndex; i++) {
      count += checklist[i].items.length;
    }
    if (currentItemIndex >= 0) {
      count += currentItemIndex + 1;
    }
    return count;
  };

  const getProgressPercentage = () => {
    if (screenType === 'summary') return 100;
    const total = getTotalItems();
    const current = getCurrentItemNumber();
    return (current / total) * 100;
  };

  const handleNext = () => {
    if (screenType === 'category') {
      setScreenType('item');
      setCurrentItemIndex(0);
    } else if (screenType === 'item') {
      const currentCategory = checklist[currentCategoryIndex];
      if (currentItemIndex < currentCategory.items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
      } else if (currentCategoryIndex < checklist.length - 1) {
        setCurrentCategoryIndex(currentCategoryIndex + 1);
        setCurrentItemIndex(-1);
        setScreenType('category');
      } else {
        handleShowSummary();
      }
    }
  };

  const handlePrevious = () => {
    if (screenType === 'item') {
      if (currentItemIndex > 0) {
        setCurrentItemIndex(currentItemIndex - 1);
      } else {
        setScreenType('category');
        setCurrentItemIndex(-1);
      }
    } else if (screenType === 'category') {
      if (currentCategoryIndex > 0) {
        const prevCategory = checklist[currentCategoryIndex - 1];
        setCurrentCategoryIndex(currentCategoryIndex - 1);
        setCurrentItemIndex(prevCategory.items.length - 1);
        setScreenType('item');
      }
    }
  };

  const handleStatusChange = (soldierId: string, status: 'fulfilled' | 'missing') => {
    const currentCategory = checklist[currentCategoryIndex];
    const currentItem = currentCategory.items[currentItemIndex];

    setSessionData(prev => {
      const updated = [...prev];
      const dataIndex = updated.findIndex(
        d => d.categoryId === currentCategory.id && d.itemId === currentItem.id
      );

      if (dataIndex !== -1) {
        const statusIndex = updated[dataIndex].statuses.findIndex(
          s => s.soldierId === soldierId
        );

        if (statusIndex !== -1) {
          updated[dataIndex].statuses[statusIndex] = {
            ...updated[dataIndex].statuses[statusIndex],
            status,
          };
        }
      }

      return updated;
    });
  };

  const handleAddDescription = (soldierId: string) => {
    setEditingSoldierId(soldierId);
    const currentCategory = checklist[currentCategoryIndex];
    const currentItem = currentCategory.items[currentItemIndex];
    const data = sessionData.find(
      d => d.categoryId === currentCategory.id && d.itemId === currentItem.id
    );
    const status = data?.statuses.find(s => s.soldierId === soldierId);
    setDescriptionText(status?.description || '');
  };

  const handleSaveDescription = () => {
    if (!editingSoldierId) return;

    const currentCategory = checklist[currentCategoryIndex];
    const currentItem = currentCategory.items[currentItemIndex];

    setSessionData(prev => {
      const updated = [...prev];
      const dataIndex = updated.findIndex(
        d => d.categoryId === currentCategory.id && d.itemId === currentItem.id
      );

      if (dataIndex !== -1) {
        const statusIndex = updated[dataIndex].statuses.findIndex(
          s => s.soldierId === editingSoldierId
        );

        if (statusIndex !== -1) {
          updated[dataIndex].statuses[statusIndex] = {
            ...updated[dataIndex].statuses[statusIndex],
            description: descriptionText.trim(),
          };
        }
      }

      return updated;
    });

    setEditingSoldierId(null);
    setDescriptionText('');
  };

  const handleVoiceInput = () => {
    Alert.alert(
      'Talegjenkjenning',
      'Talegjenkjenning er ikke tilgjengelig i denne versjonen. Vennligst skriv inn tekst manuelt.',
      [{ text: 'OK' }]
    );
  };

  const handleShowSummary = () => {
    setScreenType('summary');
  };

  const generateSummary = (): SessionSummary => {
    if (!squadSettings) {
      return {
        id: '',
        date: '',
        time: '',
        timestamp: 0,
        squadName: '',
        soldierSummaries: [],
      };
    }

    const soldierSummaries: SoldierSummary[] = squadSettings.soldiers.map(soldier => {
      const missingItems: MissingItem[] = [];

      sessionData.forEach(data => {
        const status = data.statuses.find(s => s.soldierId === soldier.id);
        if (status && status.status === 'missing') {
          const category = checklist.find(c => c.id === data.categoryId);
          const item = category?.items.find(i => i.id === data.itemId);

          if (category && item) {
            missingItems.push({
              categoryName: category.name,
              itemName: item.name,
              description: status.description,
            });
          }
        }
      });

      return {
        soldier,
        missingItems,
      };
    });

    const now = new Date();
    return {
      id: `session-${Date.now()}`,
      date: now.toLocaleDateString('nb-NO'),
      time: now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      squadName: squadSettings.squadName,
      soldierSummaries,
    };
  };

  const handleExportSummary = () => {
    const summary = generateSummary();
    let text = `KTS Oppsummering\n`;
    text += `Lag: ${summary.squadName}\n`;
    text += `Dato: ${summary.date} ${summary.time}\n\n`;

    summary.soldierSummaries.forEach(ss => {
      if (ss.missingItems.length > 0) {
        text += `${ss.soldier.name}${ss.soldier.role ? ` (${ss.soldier.role})` : ''}:\n`;
        ss.missingItems.forEach(item => {
          text += `  ✗ ${item.itemName}`;
          if (item.description) {
            text += ` - ${item.description}`;
          }
          text += '\n';
        });
        text += '\n';
      }
    });

    Alert.alert('Eksporter', text, [{ text: 'OK' }]);
  };

  const handleFinish = async () => {
    try {
      const summary = generateSummary();
      const session: ChecklistSession = {
        id: summary.id,
        date: summary.date,
        time: summary.time,
        timestamp: summary.timestamp,
        squadName: summary.squadName,
        soldiers: squadSettings?.soldiers || [],
        data: sessionData,
      };

      await storage.addSession(session);
      router.back();
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Feil', 'Kunne ikke lagre økten');
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    router.back();
  };

  const cancelExit = () => {
    setShowExitDialog(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.text}>Laster...</Text>
      </View>
    );
  }

  if (screenType === 'category') {
    const currentCategory = checklist[currentCategoryIndex];
    return (
      <View style={styles.container}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
        </View>

        <View style={styles.header}>
          <Pressable onPress={handleExit} style={styles.exitButton}>
            <IconSymbol name="xmark" color={colors.text} size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.categoryTitle}>{currentCategory.name}</Text>
          <Text style={styles.categorySubtitle}>
            Kategori {currentCategoryIndex + 1} av {checklist.length}
          </Text>
        </View>

        <View style={styles.bottomButtons}>
          {currentCategoryIndex > 0 && (
            <Pressable style={styles.navButton} onPress={handlePrevious}>
              <Text style={styles.navButtonText}>Forrige</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonTextPrimary}>Neste</Text>
          </Pressable>
        </View>

        <Modal
          visible={showExitDialog}
          transparent
          animationType="fade"
          onRequestClose={cancelExit}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.exitDialogContent}>
              <Text style={styles.exitDialogTitle}>Er du sikker på at du vil avslutte?</Text>
              <View style={styles.exitDialogButtons}>
                <Pressable
                  style={[styles.exitDialogButton, styles.exitDialogButtonCancel]}
                  onPress={cancelExit}
                >
                  <Text style={styles.exitDialogButtonText}>Nei, fortsett</Text>
                </Pressable>
                <Pressable
                  style={[styles.exitDialogButton, styles.exitDialogButtonConfirm]}
                  onPress={confirmExit}
                >
                  <Text style={styles.exitDialogButtonTextConfirm}>Ja, avslutt</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (screenType === 'item') {
    const currentCategory = checklist[currentCategoryIndex];
    const currentItem = currentCategory.items[currentItemIndex];
    const currentData = sessionData.find(
      d => d.categoryId === currentCategory.id && d.itemId === currentItem.id
    );

    return (
      <View style={styles.container}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
        </View>

        <View style={styles.header}>
          <Pressable onPress={handleExit} style={styles.exitButton}>
            <IconSymbol name="xmark" color={colors.text} size={24} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.itemCategory}>{currentCategory.name}</Text>
          <Text style={styles.itemName}>{currentItem.name}</Text>

          <View style={styles.soldiersList}>
            {squadSettings?.soldiers.map(soldier => {
              const status = currentData?.statuses.find(s => s.soldierId === soldier.id);
              return (
                <View key={soldier.id} style={styles.soldierItem}>
                  <View style={styles.soldierInfo}>
                    <Text style={styles.soldierName}>{soldier.name}</Text>
                    {soldier.role && (
                      <Text style={styles.soldierRole}>{soldier.role}</Text>
                    )}
                  </View>
                  <View style={styles.soldierActions}>
                    <Pressable
                      style={[
                        styles.statusButton,
                        status?.status === 'fulfilled' && styles.statusButtonActive,
                      ]}
                      onPress={() => handleStatusChange(soldier.id, 'fulfilled')}
                    >
                      <IconSymbol
                        name="checkmark"
                        color={status?.status === 'fulfilled' ? '#FFFFFF' : colors.primary}
                        size={24}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.statusButton,
                        styles.statusButtonMissing,
                        status?.status === 'missing' && styles.statusButtonMissingActive,
                      ]}
                      onPress={() => handleStatusChange(soldier.id, 'missing')}
                    >
                      <IconSymbol
                        name="xmark"
                        color={status?.status === 'missing' ? '#FFFFFF' : colors.secondary}
                        size={24}
                      />
                    </Pressable>
                    {status?.status === 'missing' && (
                      <Pressable
                        style={styles.descButton}
                        onPress={() => handleAddDescription(soldier.id)}
                      >
                        <IconSymbol name="pencil" color={colors.accent} size={20} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.bottomButtons}>
          <Pressable style={styles.navButton} onPress={handlePrevious}>
            <Text style={styles.navButtonText}>Forrige</Text>
          </Pressable>
          <Pressable
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonTextPrimary}>
              {currentItemIndex === currentCategory.items.length - 1 &&
              currentCategoryIndex === checklist.length - 1
                ? 'Oppsummering'
                : 'Neste'}
            </Text>
          </Pressable>
        </View>

        <Modal
          visible={editingSoldierId !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingSoldierId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Legg til beskrivelse</Text>
              <TextInput
                style={styles.modalInput}
                value={descriptionText}
                onChangeText={setDescriptionText}
                placeholder="Beskriv problemet..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
              <Pressable style={styles.voiceButton} onPress={handleVoiceInput}>
                <IconSymbol name="mic.fill" color={colors.accent} size={24} />
                <Text style={styles.voiceButtonText}>Talegjenkjenning</Text>
              </Pressable>
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditingSoldierId(null)}
                >
                  <Text style={styles.modalButtonText}>Avbryt</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveDescription}
                >
                  <Text style={styles.modalButtonTextSave}>Lagre</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showExitDialog}
          transparent
          animationType="fade"
          onRequestClose={cancelExit}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.exitDialogContent}>
              <Text style={styles.exitDialogTitle}>Er du sikker på at du vil avslutte?</Text>
              <View style={styles.exitDialogButtons}>
                <Pressable
                  style={[styles.exitDialogButton, styles.exitDialogButtonCancel]}
                  onPress={cancelExit}
                >
                  <Text style={styles.exitDialogButtonText}>Nei, fortsett</Text>
                </Pressable>
                <Pressable
                  style={[styles.exitDialogButton, styles.exitDialogButtonConfirm]}
                  onPress={confirmExit}
                >
                  <Text style={styles.exitDialogButtonTextConfirm}>Ja, avslutt</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const summary = generateSummary();
  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '100%' }]} />
      </View>

      <View style={styles.header}>
        <Text style={styles.summaryHeaderTitle}>Oppsummering</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summarySquad}>{summary.squadName}</Text>
          <Text style={styles.summaryDate}>{summary.date} {summary.time}</Text>
        </View>

        {summary.soldierSummaries.map(ss => {
          if (ss.missingItems.length === 0) return null;

          return (
            <View key={ss.soldier.id} style={styles.summaryCard}>
              <Text style={styles.summarySoldierName}>
                {ss.soldier.name}
                {ss.soldier.role && ` (${ss.soldier.role})`}
              </Text>
              {ss.missingItems.map((item, index) => (
                <View key={index} style={styles.summaryItem}>
                  <IconSymbol name="xmark.circle.fill" color={colors.secondary} size={20} />
                  <View style={styles.summaryItemText}>
                    <Text style={styles.summaryItemName}>{item.itemName}</Text>
                    {item.description && (
                      <Text style={styles.summaryItemDesc}>{item.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {summary.soldierSummaries.every(ss => ss.missingItems.length === 0) && (
          <View style={styles.noIssuesCard}>
            <IconSymbol name="checkmark.circle.fill" color={colors.primary} size={48} />
            <Text style={styles.noIssuesText}>Ingen mangler registrert!</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.exportButton} onPress={handleExportSummary}>
          <IconSymbol name="square.and.arrow.up" color={colors.accent} size={20} />
          <Text style={styles.exportButtonText}>Eksporter</Text>
        </Pressable>
        <Pressable
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={handleFinish}
        >
          <Text style={styles.navButtonTextPrimary}>Ferdig</Text>
        </Pressable>
      </View>
    </View>
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
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.textSecondary + '40',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  exitButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  categoryTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  categorySubtitle: {
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  itemCategory: {
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  itemName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  soldiersList: {
    gap: 12,
  },
  soldierItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  soldierInfo: {
    flex: 1,
  },
  soldierName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  soldierRole: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  soldierActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonMissing: {
    borderColor: colors.secondary,
  },
  statusButtonMissingActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  descButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '40',
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  navButtonTextPrimary: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  text: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  voiceButtonText: {
    fontSize: 16,
    color: colors.accent,
    fontFamily: 'BigShouldersStencil_700Bold',
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
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalButtonTextSave: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  summaryHeaderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summarySquad: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  summaryDate: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  summarySoldierName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  summaryItemText: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  summaryItemDesc: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  noIssuesCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  noIssuesText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 16,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  exitDialogContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  exitDialogTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  exitDialogButtons: {
    gap: 12,
  },
  exitDialogButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  exitDialogButtonCancel: {
    backgroundColor: colors.primary,
  },
  exitDialogButtonConfirm: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  exitDialogButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  exitDialogButtonTextConfirm: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
