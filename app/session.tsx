
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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
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
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showAllOkAnimation, setShowAllOkAnimation] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number>(Date.now());
  const insets = useSafeAreaInsets();

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

  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  const handleAllOk = async () => {
    if (screenType !== 'item' || !squadSettings) return;

    const currentCategory = checklist[currentCategoryIndex];
    const currentItem = currentCategory.items[currentItemIndex];

    setSessionData(prev => {
      const updated = [...prev];
      const dataIndex = updated.findIndex(
        d => d.categoryId === currentCategory.id && d.itemId === currentItem.id
      );

      if (dataIndex !== -1) {
        updated[dataIndex].statuses = squadSettings.soldiers.map(soldier => ({
          soldierId: soldier.id,
          status: 'fulfilled',
        }));
      }

      return updated;
    });

    setShowAllOkAnimation(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setShowAllOkAnimation(false);
    
    handleNext();
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
        duration: '0:00',
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
    const duration = formatDuration(now.getTime() - startTimestamp);
    
    return {
      id: `session-${Date.now()}`,
      date: now.toLocaleDateString('nb-NO'),
      time: now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      duration,
      squadName: squadSettings.squadName,
      soldierSummaries,
    };
  };

  const handleExportSummary = async () => {
    const summary = generateSummary();
    
    const hasMissingItems = summary.soldierSummaries.some(ss => ss.missingItems.length > 0);
    if (!hasMissingItems) {
      return;
    }

    let text = `KTS Oppsummering\n`;
    text += `Lag: ${summary.squadName}\n`;
    text += `Dato: ${summary.date} ${summary.time}\n`;
    text += `Varighet: ${summary.duration}\n\n`;

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

    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Kopiert', 'Kopiert. Du kan nå lime inn teksten der du ønsker');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Feil', 'Kunne ikke kopiere til utklippstavlen');
    }
  };

  const handleFinish = async () => {
    try {
      const summary = generateSummary();
      const endTimestamp = Date.now();
      const session: ChecklistSession = {
        id: summary.id,
        date: summary.date,
        time: summary.time,
        timestamp: summary.timestamp,
        startTimestamp,
        endTimestamp,
        duration: summary.duration,
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
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={[styles.text, { fontFamily: bodyFont }]}>Laster...</Text>
      </View>
    );
  }

  if (screenType === 'category') {
    const currentCategory = checklist[currentCategoryIndex];
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={commonStyles.modalNavBar}>
          <View style={{ width: 24 }} />
          <Text style={commonStyles.modalNavBarTitle}>KTS</Text>
          <Pressable onPress={handleExit} style={styles.exitButton}>
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.categoryTitle}>{currentCategory.name}</Text>
          <Text style={[styles.categorySubtitle, { fontFamily: bodyFont }]}>
            Kategori {currentCategoryIndex + 1} av {checklist.length}
          </Text>
        </View>

        <View style={styles.stickyBottomButtons}>
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={commonStyles.modalNavBar}>
          <View style={{ width: 24 }} />
          <Text style={commonStyles.modalNavBarTitle}>KTS</Text>
          <Pressable onPress={handleExit} style={styles.exitButton}>
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.itemCategory, { fontFamily: bodyFont }]}>{currentCategory.name}</Text>
          <Text style={styles.itemName}>{currentItem.name}</Text>

          <View style={styles.soldiersList}>
            {squadSettings?.soldiers.map(soldier => {
              const status = currentData?.statuses.find(s => s.soldierId === soldier.id);
              const isChecked = showAllOkAnimation || status?.status === 'fulfilled';
              
              return (
                <View key={soldier.id} style={styles.soldierItem}>
                  <View style={styles.soldierInfo}>
                    <Text style={styles.soldierName}>{soldier.name}</Text>
                    {soldier.role && (
                      <Text style={[styles.soldierRole, { fontFamily: bodyFont }]}>{soldier.role}</Text>
                    )}
                  </View>
                  <View style={styles.soldierActions}>
                    <Pressable
                      style={[
                        styles.statusButton,
                        isChecked && styles.statusButtonActive,
                      ]}
                      onPress={() => handleStatusChange(soldier.id, 'fulfilled')}
                    >
                      <IconSymbol
                        name="checkmark"
                        color={isChecked ? colors.checkmark : colors.primary}
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
                        color={status?.status === 'missing' ? colors.checkmark : colors.error}
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

        <View style={styles.bottomContainer}>
          <Pressable style={styles.allOkButton} onPress={handleAllOk}>
            <IconSymbol name="checkmark.circle.fill" color="#000" size={24} />
            <Text style={styles.allOkButtonText}>Alle ok</Text>
          </Pressable>

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
        </View>

        <Modal
          visible={editingSoldierId !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingSoldierId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Legg til beskrivelse</Text>
                <Pressable onPress={() => setEditingSoldierId(null)}>
                  <IconSymbol name="xmark" color={colors.error} size={24} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.modalInput, { fontFamily: bodyFont }]}
                value={descriptionText}
                onChangeText={setDescriptionText}
                placeholder="Beskriv problemet..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
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
  const hasMissingItems = summary.soldierSummaries.some(ss => ss.missingItems.length > 0);
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={commonStyles.modalNavBar}>
        <View style={{ width: 24 }} />
        <Text style={commonStyles.modalNavBarTitle}>KTS</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '100%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.summaryScrollContent}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Oppsummering</Text>
          <Text style={styles.summarySquad}>{summary.squadName}</Text>
          <Text style={[styles.summaryDate, { fontFamily: bodyFont }]}>{summary.date} {summary.time}</Text>
          <View style={styles.summaryDurationContainer}>
            <IconSymbol name="stopwatch.fill" color={colors.textSecondary} size={20} />
            <Text style={[styles.summaryDuration, { fontFamily: bodyFont }]}>{summary.duration}</Text>
          </View>
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
                  <View style={styles.summaryItemIconContainer}>
                    <IconSymbol name="xmark" color={colors.error} size={20} />
                  </View>
                  <View style={styles.summaryItemText}>
                    <Text style={[styles.summaryItemName, { fontFamily: bodyFont }]}>{item.itemName}</Text>
                    {item.description && (
                      <Text style={[styles.summaryItemDesc, { fontFamily: bodyFont }]}>{item.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {!hasMissingItems && (
          <View style={styles.noIssuesCard}>
            <Image
              source={require('@/assets/images/f54512be-2d40-4d54-93d7-66c0b49c0292.png')}
              style={styles.noIssuesIcon}
              resizeMode="contain"
            />
            <Text style={styles.noIssuesText}>Bravo zulu. Ingen feil eller mangler.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.summaryBottomButtons}>
        <Pressable 
          style={[
            styles.exportButton,
            !hasMissingItems && styles.exportButtonDisabled
          ]} 
          onPress={handleExportSummary}
          disabled={!hasMissingItems}
        >
          <IconSymbol 
            name="doc.on.doc" 
            color={hasMissingItems ? colors.accent : colors.textSecondary} 
            size={20} 
          />
          <Text style={[
            styles.exportButtonText,
            !hasMissingItems && styles.exportButtonTextDisabled
          ]}>Kopier</Text>
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
  exitButton: {
    padding: 4,
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
  },
  stickyBottomButtons: {
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
  scrollContent: {
    padding: 20,
    paddingBottom: 260,
  },
  itemCategory: {
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
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
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
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
    borderColor: colors.error,
  },
  statusButtonMissingActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  descButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
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
  allOkButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    boxShadow: '0px 4px 12px rgba(188, 241, 53, 0.3)',
    elevation: 5,
  },
  allOkButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    minHeight: 56,
    justifyContent: 'center',
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  navButtonTextPrimary: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  text: {
    fontSize: 18,
    color: colors.text,
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
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.inputBorder,
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
  summaryScrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 12,
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
  },
  summaryDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  summaryDuration: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
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
  summaryItemIconContainer: {
    paddingTop: 2,
  },
  summaryItemText: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryItemDesc: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noIssuesCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  noIssuesIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  noIssuesText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
  },
  summaryBottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '40',
    padding: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    gap: 12,
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
    minHeight: 56,
  },
  exportButtonDisabled: {
    opacity: 0.4,
    borderColor: colors.textSecondary,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  exportButtonTextDisabled: {
    color: colors.textSecondary,
  },
  exitDialogContent: {
    backgroundColor: colors.backgroundSecondary,
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
    minHeight: 56,
    justifyContent: 'center',
  },
  exitDialogButtonCancel: {
    backgroundColor: colors.primary,
  },
  exitDialogButtonConfirm: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.error,
  },
  exitDialogButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  exitDialogButtonTextConfirm: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
