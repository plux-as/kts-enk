
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
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

// A weapon group is a set of parallel weapon categories (all primary, or all secondary)
// that are navigated together as one unit in the session.
interface WeaponGroup {
  label: string;
  categories: ChecklistCategory[];
}

type SessionPhase =
  | { type: 'parallelWeaponIntro'; groupIndex: number }
  | { type: 'parallelWeaponStep'; groupIndex: number; stepIndex: number }
  | { type: 'categoryIntro'; categoryIndex: number }
  | { type: 'item'; categoryIndex: number; itemIndex: number }
  | { type: 'summary' };

const BOTTOM_BUTTON_CONTAINER_HEIGHT = Platform.OS === 'android' ? 128 : 136;

export default function SessionScreen() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [squadSettings, setSquadSettings] = useState<SquadSettings | null>(null);
  const [sessionData, setSessionData] = useState<SessionItemData[]>([]);
  const [phase, setPhase] = useState<SessionPhase>({ type: 'parallelWeaponIntro', groupIndex: 0 });
  const [loading, setLoading] = useState(true);
  const [editingSoldierId, setEditingSoldierId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showAllOkAnimation, setShowAllOkAnimation] = useState(false);
  const [startTimestamp] = useState<number>(Date.now());
  const [endTimestamp, setEndTimestamp] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
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

  // ─── Filtered weapon categories (only those with assigned soldiers) ────────

  const generalCategories = useMemo(
    () => checklist.filter(c => c.categoryRole === 'general'),
    [checklist]
  );

  // Primary weapon group: unique personligVapenCategoryId values from all soldiers
  const primaryWeaponCategories = useMemo(() => {
    if (!squadSettings) return [];
    const usedIds = new Set(
      squadSettings.soldiers
        .map(s => s.personligVapenCategoryId)
        .filter(Boolean)
    );
    return checklist.filter(
      c => c.categoryRole === 'weapon' && usedIds.has(c.id)
    );
  }, [checklist, squadSettings]);

  // Secondary weapon group: unique sekundærVåpenCategoryId values from soldiers that have one
  const secondaryWeaponCategories = useMemo(() => {
    if (!squadSettings) return [];
    const usedIds = new Set(
      squadSettings.soldiers
        .map(s => s.sekundærVåpenCategoryId)
        .filter((id): id is string => !!id)
    );
    if (usedIds.size === 0) return [];
    return checklist.filter(
      c => c.categoryRole === 'weapon' && usedIds.has(c.id)
    );
  }, [checklist, squadSettings]);

  // Ordered weapon groups: primary first, then secondary (each non-empty group is one unit)
  const weaponGroups = useMemo<WeaponGroup[]>(() => {
    const groups: WeaponGroup[] = [];
    if (primaryWeaponCategories.length > 0) {
      groups.push({ label: 'PRIMÆRVÅPEN', categories: primaryWeaponCategories });
    }
    if (secondaryWeaponCategories.length > 0) {
      groups.push({ label: 'SEKUNDÆRVÅPEN', categories: secondaryWeaponCategories });
    }
    return groups;
  }, [primaryWeaponCategories, secondaryWeaponCategories]);

  // Max parallel steps for a given weapon group
  const maxStepsForGroup = (group: WeaponGroup): number => {
    if (group.categories.length === 0) return 0;
    return Math.max(...group.categories.map(c => c.items.length));
  };

  // Total progress steps: sum of max steps across all weapon groups + all general items
  const totalSteps = useMemo(() => {
    const weaponSteps = weaponGroups.reduce((sum, g) => sum + maxStepsForGroup(g), 0);
    const generalItemCount = generalCategories.reduce((sum, c) => sum + c.items.length, 0);
    return weaponSteps + generalItemCount;
  }, [weaponGroups, generalCategories]);

  // Steps completed before a given weapon group index
  const stepsBeforeGroup = (groupIdx: number): number => {
    let steps = 0;
    for (let i = 0; i < groupIdx; i++) {
      steps += maxStepsForGroup(weaponGroups[i]);
    }
    return steps;
  };

  const getProgressStep = (): number => {
    if (phase.type === 'parallelWeaponIntro') return stepsBeforeGroup(phase.groupIndex);
    if (phase.type === 'parallelWeaponStep') {
      return stepsBeforeGroup(phase.groupIndex) + phase.stepIndex + 1;
    }
    if (phase.type === 'summary') return totalSteps;

    const weaponStepsTotal = weaponGroups.reduce((sum, g) => sum + maxStepsForGroup(g), 0);
    const generalItemsBefore = (catIdx: number) =>
      generalCategories.slice(0, catIdx).reduce((sum, c) => sum + c.items.length, 0);

    if (phase.type === 'categoryIntro') {
      return weaponStepsTotal + generalItemsBefore(phase.categoryIndex);
    }
    if (phase.type === 'item') {
      return weaponStepsTotal + generalItemsBefore(phase.categoryIndex) + phase.itemIndex + 1;
    }
    return 0;
  };

  const getProgressPercentage = (): number => {
    if (totalSteps === 0) return 100;
    return (getProgressStep() / totalSteps) * 100;
  };

  // Total number of "top-level" session categories for "kategori X av Y" subtitle.
  // Each weapon group counts as 1, each general category counts as 1.
  const totalSessionCategories = useMemo(
    () => weaponGroups.length + generalCategories.length,
    [weaponGroups, generalCategories]
  );

  // Position (1-based) of a weapon group or general category in the session sequence
  const sessionPositionOfGroup = (groupIdx: number): number => groupIdx + 1;
  const sessionPositionOfGeneral = (catIdx: number): number => weaponGroups.length + catIdx + 1;

  const handleNext = () => {
    console.log('User tapped Next button, phase:', JSON.stringify(phase));
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });

    if (phase.type === 'parallelWeaponIntro') {
      const group = weaponGroups[phase.groupIndex];
      const maxSteps = maxStepsForGroup(group);
      if (maxSteps > 0) {
        setPhase({ type: 'parallelWeaponStep', groupIndex: phase.groupIndex, stepIndex: 0 });
      } else {
        advanceFromWeaponGroup(phase.groupIndex);
      }
      return;
    }

    if (phase.type === 'parallelWeaponStep') {
      const { groupIndex, stepIndex } = phase;
      const group = weaponGroups[groupIndex];
      const maxSteps = maxStepsForGroup(group);
      if (stepIndex + 1 < maxSteps) {
        setPhase({ type: 'parallelWeaponStep', groupIndex, stepIndex: stepIndex + 1 });
      } else {
        advanceFromWeaponGroup(groupIndex);
      }
      return;
    }

    if (phase.type === 'categoryIntro') {
      setPhase({ type: 'item', categoryIndex: phase.categoryIndex, itemIndex: 0 });
      return;
    }

    if (phase.type === 'item') {
      const { categoryIndex, itemIndex } = phase;
      const cat = generalCategories[categoryIndex];
      if (itemIndex + 1 < cat.items.length) {
        setPhase({ type: 'item', categoryIndex, itemIndex: itemIndex + 1 });
      } else if (categoryIndex + 1 < generalCategories.length) {
        setPhase({ type: 'categoryIntro', categoryIndex: categoryIndex + 1 });
      } else {
        handleShowSummary();
      }
      return;
    }
  };

  // Move forward after finishing a weapon group
  const advanceFromWeaponGroup = (groupIndex: number) => {
    if (groupIndex + 1 < weaponGroups.length) {
      setPhase({ type: 'parallelWeaponIntro', groupIndex: groupIndex + 1 });
    } else if (generalCategories.length > 0) {
      setPhase({ type: 'categoryIntro', categoryIndex: 0 });
    } else {
      handleShowSummary();
    }
  };

  const handlePrevious = () => {
    console.log('User tapped Previous button, phase:', JSON.stringify(phase));
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });

    if (phase.type === 'parallelWeaponIntro') {
      const { groupIndex } = phase;
      if (groupIndex === 0) return; // first screen, no back
      // Go to last step of previous weapon group
      const prevGroupIdx = groupIndex - 1;
      const prevGroup = weaponGroups[prevGroupIdx];
      const prevMaxSteps = maxStepsForGroup(prevGroup);
      if (prevMaxSteps > 0) {
        setPhase({ type: 'parallelWeaponStep', groupIndex: prevGroupIdx, stepIndex: prevMaxSteps - 1 });
      } else {
        setPhase({ type: 'parallelWeaponIntro', groupIndex: prevGroupIdx });
      }
      return;
    }

    if (phase.type === 'parallelWeaponStep') {
      if (phase.stepIndex === 0) {
        setPhase({ type: 'parallelWeaponIntro', groupIndex: phase.groupIndex });
      } else {
        setPhase({ type: 'parallelWeaponStep', groupIndex: phase.groupIndex, stepIndex: phase.stepIndex - 1 });
      }
      return;
    }

    if (phase.type === 'categoryIntro') {
      if (phase.categoryIndex === 0) {
        if (weaponGroups.length > 0) {
          const lastGroupIdx = weaponGroups.length - 1;
          const lastGroup = weaponGroups[lastGroupIdx];
          const lastMaxSteps = maxStepsForGroup(lastGroup);
          if (lastMaxSteps > 0) {
            setPhase({ type: 'parallelWeaponStep', groupIndex: lastGroupIdx, stepIndex: lastMaxSteps - 1 });
          } else {
            setPhase({ type: 'parallelWeaponIntro', groupIndex: lastGroupIdx });
          }
        }
        // else: no weapon groups, this is the first screen — no back
      } else {
        const prevCatIdx = phase.categoryIndex - 1;
        const prevCat = generalCategories[prevCatIdx];
        setPhase({ type: 'item', categoryIndex: prevCatIdx, itemIndex: prevCat.items.length - 1 });
      }
      return;
    }

    if (phase.type === 'item') {
      if (phase.itemIndex === 0) {
        setPhase({ type: 'categoryIntro', categoryIndex: phase.categoryIndex });
      } else {
        setPhase({ type: 'item', categoryIndex: phase.categoryIndex, itemIndex: phase.itemIndex - 1 });
      }
      return;
    }
  };

  const handleStatusChange = (
    categoryId: string,
    itemId: string,
    soldierId: string,
    status: 'fulfilled' | 'missing'
  ) => {
    console.log('User changed status for soldier:', soldierId, 'item:', itemId, 'status:', status);
    setSessionData(prev => {
      const updated = [...prev];
      const dataIndex = updated.findIndex(
        d => d.categoryId === categoryId && d.itemId === itemId
      );
      if (dataIndex !== -1) {
        const statusIndex = updated[dataIndex].statuses.findIndex(s => s.soldierId === soldierId);
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

  const handleAllOk = () => {
    console.log('User tapped All Ok button');
    if (phase.type !== 'item' || !squadSettings) return;

    const cat = generalCategories[phase.categoryIndex];
    const item = cat.items[phase.itemIndex];

    setSessionData(prev => {
      const updated = [...prev];
      const dataIndex = updated.findIndex(
        d => d.categoryId === cat.id && d.itemId === item.id
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
    setTimeout(() => {
      setShowAllOkAnimation(false);
      handleNext();
    }, 300);
  };

  const handleAllOkParallel = (group: WeaponGroup, stepIndex: number) => {
    console.log('User tapped All Ok (parallel) button, group:', group.label, 'step:', stepIndex);
    if (!squadSettings) return;

    setSessionData(prev => {
      const updated = [...prev];
      group.categories.forEach(category => {
        if (stepIndex >= category.items.length) return;
        const item = category.items[stepIndex];
        const dataIndex = updated.findIndex(
          d => d.categoryId === category.id && d.itemId === item.id
        );
        if (dataIndex === -1) return;
        // Determine if this category is in the secondary group
        const isSecondaryGroup = secondaryWeaponCategories.some(c => c.id === category.id)
          && !primaryWeaponCategories.some(c => c.id === category.id);
        const assignedSoldiers = squadSettings.soldiers.filter(s =>
          isSecondaryGroup
            ? s.sekundærVåpenCategoryId === category.id
            : s.personligVapenCategoryId === category.id
        );
        updated[dataIndex].statuses = updated[dataIndex].statuses.map(s => {
          if (assignedSoldiers.some(soldier => soldier.id === s.soldierId)) {
            return { ...s, status: 'fulfilled' };
          }
          return s;
        });
      });
      return updated;
    });

    setShowAllOkAnimation(true);
    setTimeout(() => {
      setShowAllOkAnimation(false);
      handleNext();
    }, 300);
  };

  const handleAddDescription = (categoryId: string, itemId: string, soldierId: string) => {
    console.log('User tapped Add Description for soldier:', soldierId);
    setEditingSoldierId(soldierId);
    setEditingCategoryId(categoryId);
    setEditingItemId(itemId);
    const data = sessionData.find(d => d.categoryId === categoryId && d.itemId === itemId);
    const status = data?.statuses.find(s => s.soldierId === soldierId);
    setDescriptionText(status?.description || '');
  };

  const handleSaveDescription = () => {
    console.log('User saved description:', descriptionText);
    if (!editingSoldierId || !editingCategoryId || !editingItemId) return;

    setSessionData(prev => {
      const updated = [...prev];
      const dataIndex = updated.findIndex(
        d => d.categoryId === editingCategoryId && d.itemId === editingItemId
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
    setEditingCategoryId(null);
    setEditingItemId(null);
    setDescriptionText('');
  };

  const handleShowSummary = () => {
    console.log('User navigated to Summary screen');
    setEndTimestamp(Date.now());
    setPhase({ type: 'summary' });
  };

  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const generateSummary = (): SessionSummary => {
    if (!squadSettings) {
      return { id: '', date: '', time: '', timestamp: 0, duration: '0:00', squadName: '', soldierSummaries: [] };
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
      return { soldier, missingItems };
    });

    const now = new Date();
    const finalEndTimestamp = endTimestamp || now.getTime();
    const duration = formatDuration(finalEndTimestamp - startTimestamp);

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
    console.log('User tapped Export Summary button');
    const summary = generateSummary();
    const hasMissingItems = summary.soldierSummaries.some(ss => ss.missingItems.length > 0);
    if (!hasMissingItems) return;

    let text = `KTS Oppsummering\n`;
    text += `Lag: ${summary.squadName}\n`;
    text += `Dato: ${summary.date} ${summary.time}\n`;
    text += `Varighet: ${summary.duration}\n\n`;

    summary.soldierSummaries.forEach(ss => {
      if (ss.missingItems.length > 0) {
        text += `${ss.soldier.name}${ss.soldier.role ? ` (${ss.soldier.role})` : ''}:\n`;
        ss.missingItems.forEach(item => {
          text += `  ✗ ${item.itemName}`;
          if (item.description) text += ` - ${item.description}`;
          text += '\n';
        });
        text += '\n';
      }
    });

    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Kopiert', 'Du kan nå lime inn teksten der du ønsker');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Feil', 'Kunne ikke kopiere til utklippstavlen');
    }
  };

  const handleFinish = async () => {
    console.log('User tapped Finish button');
    try {
      const summary = generateSummary();
      const finalEndTimestamp = endTimestamp || Date.now();
      const session: ChecklistSession = {
        id: summary.id,
        date: summary.date,
        time: summary.time,
        timestamp: summary.timestamp,
        startTimestamp,
        endTimestamp: finalEndTimestamp,
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
    console.log('User tapped Exit button');
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    console.log('User confirmed exit');
    setShowExitDialog(false);
    router.back();
  };

  const cancelExit = () => {
    console.log('User cancelled exit');
    setShowExitDialog(false);
  };

  const ExitDialog = () => (
    <Modal visible={showExitDialog} transparent animationType="fade" onRequestClose={cancelExit}>
      <View style={styles.modalOverlay}>
        <View style={styles.exitDialogContent}>
          <Text style={styles.exitDialogTitle}>Er du sikker på at du vil avslutte?</Text>
          <View style={styles.exitDialogButtons}>
            <Pressable style={[styles.exitDialogButton, styles.exitDialogButtonCancel]} onPress={cancelExit}>
              <Text style={styles.exitDialogButtonText}>Nei, fortsett</Text>
            </Pressable>
            <Pressable style={[styles.exitDialogButton, styles.exitDialogButtonConfirm]} onPress={confirmExit}>
              <Text style={styles.exitDialogButtonTextConfirm}>Ja, avslutt</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const DescriptionModal = () => (
    <Modal
      visible={editingSoldierId !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setEditingSoldierId(null)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={[styles.text, { fontFamily: bodyFont }]}>Laster...</Text>
      </View>
    );
  }

  // ─── PARALLEL WEAPON INTRO ───────────────────────────────────────────────
  if (phase.type === 'parallelWeaponIntro') {
    const { groupIndex } = phase;
    const group = weaponGroups[groupIndex];

    // If no weapon groups exist at all, skip straight to general categories
    if (!group) {
      if (generalCategories.length > 0) {
        setPhase({ type: 'categoryIntro', categoryIndex: 0 });
      } else {
        handleShowSummary();
      }
      return null;
    }

    const sessionPos = sessionPositionOfGroup(groupIndex);
    const introSubtitle = `Kategori ${sessionPos} av ${totalSessionCategories}`;
    const isFirstScreen = groupIndex === 0;

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

        <View style={[styles.content, { marginBottom: BOTTOM_BUTTON_CONTAINER_HEIGHT }]}>
          <Text style={styles.categoryTitle}>{group.label}</Text>
          <Text style={[styles.categorySubtitle, { fontFamily: bodyFont }]}>{introSubtitle}</Text>
        </View>

        <View style={styles.stickyBottomButtons}>
          <View style={styles.bottomButtons}>
            {!isFirstScreen && (
              <Pressable style={styles.navButton} onPress={handlePrevious}>
                <Text style={styles.navButtonText}>Forrige</Text>
              </Pressable>
            )}
            <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={handleNext}>
              <Text style={styles.navButtonTextPrimary}>Neste</Text>
            </Pressable>
          </View>
        </View>

        <ExitDialog />
      </View>
    );
  }

  // ─── PARALLEL WEAPON STEP ────────────────────────────────────────────────
  if (phase.type === 'parallelWeaponStep') {
    const { groupIndex, stepIndex } = phase;
    const group = weaponGroups[groupIndex];

    // Sort weapon cards: active (not exhausted) first, exhausted last.
    // Within each group, preserve original edit-screen order.
    const sortedCategories = [...group.categories].sort((a, b) => {
      const aExhausted = stepIndex >= a.items.length ? 1 : 0;
      const bExhausted = stepIndex >= b.items.length ? 1 : 0;
      return aExhausted - bExhausted;
    });

    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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

        <Text style={styles.parallelStepHeader}>{group.label}</Text>

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.parallelScrollContent}>
          {sortedCategories.map(category => {
            const isExhausted = stepIndex >= category.items.length;
            const item = isExhausted ? null : category.items[stepIndex];
            const currentData = item
              ? sessionData.find(d => d.categoryId === category.id && d.itemId === item.id)
              : null;
            const isSecondaryGroupCat = secondaryWeaponCategories.some(c => c.id === category.id)
              && !primaryWeaponCategories.some(c => c.id === category.id);
            const assignedSoldiers = squadSettings?.soldiers.filter(s =>
              isSecondaryGroupCat
                ? s.sekundærVåpenCategoryId === category.id
                : s.personligVapenCategoryId === category.id
            ) ?? [];

            return (
              <View key={category.id} style={[styles.weaponCard, isExhausted && styles.weaponCardExhausted]}>
                <View style={styles.weaponCardHeader}>
                  <Text style={styles.weaponCardTitle}>{category.name}</Text>
                  {isExhausted && (
                    <IconSymbol name="checkmark.circle.fill" color={colors.textSecondary} size={20} />
                  )}
                </View>

                {isExhausted ? (
                  <Text style={[styles.weaponCardDoneText, { fontFamily: bodyFont }]}>Ferdig</Text>
                ) : (
                  <>
                    <Text style={[styles.weaponItemName, { fontFamily: bodyFont }]}>{item!.name}</Text>
                    <View style={styles.soldiersList}>
                      {assignedSoldiers.length === 0 ? (
                        <Text style={[styles.noSoldiersText, { fontFamily: bodyFont }]}>
                          Ingen soldater tildelt dette våpenet
                        </Text>
                      ) : (
                        assignedSoldiers.map(soldier => {
                          const status = currentData?.statuses.find(s => s.soldierId === soldier.id);
                          const isChecked = showAllOkAnimation || status?.status === 'fulfilled';
                          return (
                            <View key={soldier.id} style={styles.soldierItem}>
                              <View style={styles.soldierInfo}>
                                <Text style={styles.soldierName}>{soldier.name}</Text>
                                {soldier.role ? (
                                  <Text style={[styles.soldierRole, { fontFamily: bodyFont }]}>{soldier.role}</Text>
                                ) : null}
                              </View>
                              <View style={styles.soldierActions}>
                                <Pressable
                                  style={[styles.statusButton, isChecked && styles.statusButtonActive]}
                                  onPress={() => handleStatusChange(category.id, item!.id, soldier.id, 'fulfilled')}
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
                                  onPress={() => handleStatusChange(category.id, item!.id, soldier.id, 'missing')}
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
                                    onPress={() => handleAddDescription(category.id, item!.id, soldier.id)}
                                  >
                                    <IconSymbol name="pencil" color={colors.accent} size={20} />
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.bottomContainer}>
          <Pressable style={styles.allOkButton} onPress={() => handleAllOkParallel(group, stepIndex)}>
            <IconSymbol name="checkmark.circle.fill" color="#000" size={24} />
            <Text style={styles.allOkButtonText}>Alle ok</Text>
          </Pressable>
          <View style={styles.bottomButtons}>
            <Pressable style={styles.navButton} onPress={handlePrevious}>
              <Text style={styles.navButtonText}>Forrige</Text>
            </Pressable>
            <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={handleNext}>
              <Text style={styles.navButtonTextPrimary}>Neste</Text>
            </Pressable>
          </View>
        </View>

        <DescriptionModal />
        <ExitDialog />
      </KeyboardAvoidingView>
    );
  }

  // ─── CATEGORY INTRO ──────────────────────────────────────────────────────
  if (phase.type === 'categoryIntro') {
    const currentCategory = generalCategories[phase.categoryIndex];
    const sessionPos = sessionPositionOfGeneral(phase.categoryIndex);
    const categorySubtitle = `Kategori ${sessionPos} av ${totalSessionCategories}`;
    const isFirstScreen = phase.categoryIndex === 0 && weaponGroups.length === 0;

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

        <View style={[styles.content, { marginBottom: BOTTOM_BUTTON_CONTAINER_HEIGHT }]}>
          <Text style={styles.categoryTitle}>{currentCategory.name}</Text>
          <Text style={[styles.categorySubtitle, { fontFamily: bodyFont }]}>{categorySubtitle}</Text>
        </View>

        <View style={styles.stickyBottomButtons}>
          <View style={styles.bottomButtons}>
            {!isFirstScreen && (
              <Pressable style={styles.navButton} onPress={handlePrevious}>
                <Text style={styles.navButtonText}>Forrige</Text>
              </Pressable>
            )}
            <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={handleNext}>
              <Text style={styles.navButtonTextPrimary}>Neste</Text>
            </Pressable>
          </View>
        </View>

        <ExitDialog />
      </View>
    );
  }

  // ─── ITEM SCREEN ─────────────────────────────────────────────────────────
  if (phase.type === 'item') {
    const { categoryIndex, itemIndex } = phase;
    const currentCategory = generalCategories[categoryIndex];
    const currentItem = currentCategory.items[itemIndex];
    const currentData = sessionData.find(
      d => d.categoryId === currentCategory.id && d.itemId === currentItem.id
    );
    const isLastItem =
      itemIndex === currentCategory.items.length - 1 &&
      categoryIndex === generalCategories.length - 1;

    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.itemCategory}>{currentCategory.name}</Text>
          <Text style={[styles.itemName, { fontFamily: bodyFont }]}>{currentItem.name}</Text>

          <View style={styles.soldiersList}>
            {squadSettings?.soldiers.map(soldier => {
              const status = currentData?.statuses.find(s => s.soldierId === soldier.id);
              const isChecked = showAllOkAnimation || status?.status === 'fulfilled';
              return (
                <View key={soldier.id} style={styles.soldierItem}>
                  <View style={styles.soldierInfo}>
                    <Text style={styles.soldierName}>{soldier.name}</Text>
                    {soldier.role ? (
                      <Text style={[styles.soldierRole, { fontFamily: bodyFont }]}>{soldier.role}</Text>
                    ) : null}
                  </View>
                  <View style={styles.soldierActions}>
                    <Pressable
                      style={[styles.statusButton, isChecked && styles.statusButtonActive]}
                      onPress={() => handleStatusChange(currentCategory.id, currentItem.id, soldier.id, 'fulfilled')}
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
                      onPress={() => handleStatusChange(currentCategory.id, currentItem.id, soldier.id, 'missing')}
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
                        onPress={() => handleAddDescription(currentCategory.id, currentItem.id, soldier.id)}
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
            <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={handleNext}>
              <Text style={styles.navButtonTextPrimary}>
                {isLastItem ? 'Oppsummering' : 'Neste'}
              </Text>
            </Pressable>
          </View>
        </View>

        <DescriptionModal />
        <ExitDialog />
      </KeyboardAvoidingView>
    );
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
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
          <Text style={[styles.summaryDate, { fontFamily: bodyFont }]}>
            {summary.date}
          </Text>
          <Text style={[styles.summaryDate, { fontFamily: bodyFont }]}>
            {summary.time}
          </Text>
          <View style={styles.summaryDurationContainer}>
            <IconSymbol name="stopwatch.fill" color={colors.textSecondary} size={20} />
            <Text style={[styles.summaryDuration, { fontFamily: bodyFont }]}>{summary.duration}</Text>
          </View>
        </View>

        {summary.soldierSummaries.map(ss => {
          if (ss.missingItems.length === 0) return null;
          const soldierDisplay = ss.soldier.role
            ? `${ss.soldier.name} (${ss.soldier.role})`
            : ss.soldier.name;
          return (
            <View key={ss.soldier.id} style={styles.summaryCard}>
              <Text style={styles.summarySoldierName}>{soldierDisplay}</Text>
              {ss.missingItems.map((item, index) => (
                <View key={index} style={styles.summaryItem}>
                  <View style={styles.summaryItemIconContainer}>
                    <IconSymbol name="xmark" color={colors.error} size={20} />
                  </View>
                  <View style={styles.summaryItemText}>
                    <Text style={[styles.summaryItemName, { fontFamily: bodyFont }]}>{item.itemName}</Text>
                    {item.description ? (
                      <Text style={[styles.summaryItemDesc, { fontFamily: bodyFont }]}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {!hasMissingItems && (
          <View style={styles.noIssuesCard}>
            <IconSymbol name="checkmark.circle.fill" size={100} color={colors.primary} />
            <Text style={styles.noIssuesText}>Bravo zulu. Ingen feil eller mangler.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.summaryBottomButtons}>
        <Pressable
          style={[styles.exportButton, !hasMissingItems && styles.exportButtonDisabled]}
          onPress={handleExportSummary}
          disabled={!hasMissingItems}
        >
          <IconSymbol
            name="doc.on.doc"
            color={hasMissingItems ? colors.accent : colors.textSecondary}
            size={20}
          />
          <Text style={[styles.exportButtonText, !hasMissingItems && styles.exportButtonTextDisabled]}>
            Kopier
          </Text>
        </Pressable>
        <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={handleFinish}>
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
    paddingBottom: Platform.OS === 'android' ? 24 : 40,
  },
  // Parallel weapon step
  parallelStepHeader: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'BigShouldersStencil_700Bold',
    paddingVertical: 12,
  },
  parallelScrollContent: {
    padding: 16,
    paddingBottom: 260,
    gap: 16,
  },
  weaponCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  weaponCardExhausted: {
    opacity: 0.5,
  },
  weaponCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '60',
  },
  weaponCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  weaponCardDoneText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  weaponItemName: {
    fontSize: 17,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 24,
  },
  noSoldiersText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Item screen
  scrollContent: {
    padding: 20,
    paddingBottom: 260,
  },
  itemCategory: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  itemName: {
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 32,
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
    paddingBottom: Platform.OS === 'android' ? 24 : 40,
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
  noIssuesText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
    marginTop: 16,
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
    paddingBottom: Platform.OS === 'android' ? 24 : 40,
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
