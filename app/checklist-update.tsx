
import React, { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage, mergeChecklists } from '@/utils/storage';
import { defaultChecklist, CHECKLIST_VERSION } from '@/data/defaultChecklist';
import { ChecklistCategory } from '@/types/checklist';
import { colors, bodyFont } from '@/styles/commonStyles';

type ConfirmationState = 'idle' | 'merged' | 'replaced' | 'kept';

function computeDiff(stored: ChecklistCategory[], incoming: ChecklistCategory[]) {
  const storedIds = new Set(stored.map(c => c.id));
  let newCategories = 0;
  let newItems = 0;

  for (const cat of incoming) {
    if (!storedIds.has(cat.id)) {
      newCategories += 1;
      newItems += cat.items.length;
    } else {
      const storedCat = stored.find(c => c.id === cat.id);
      if (storedCat) {
        const storedItemIds = new Set(storedCat.items.map(i => i.id));
        newItems += cat.items.filter(i => !storedItemIds.has(i.id)).length;
      }
    }
  }

  return { newCategories, newItems };
}

export default function ChecklistUpdateScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [storedChecklist, setStoredChecklist] = useState<ChecklistCategory[] | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>('idle');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    storage.getChecklist().then(setStoredChecklist);
  }, []);

  const diff = storedChecklist ? computeDiff(storedChecklist, defaultChecklist) : null;

  const newCategoriesText = diff && diff.newCategories > 0
    ? `${diff.newCategories} nye kategori${diff.newCategories !== 1 ? 'er' : ''}`
    : null;
  const newItemsText = diff && diff.newItems > 0
    ? `${diff.newItems} nye punkt${diff.newItems !== 1 ? 'er' : ''}`
    : null;
  const diffSummary = [newCategoriesText, newItemsText].filter(Boolean).join(', ');
  const hasDiff = diff && (diff.newCategories > 0 || diff.newItems > 0);

  async function handleMerge() {
    if (!storedChecklist) return;
    console.log('[ChecklistUpdate] User chose: Slå sammen');
    setApplying(true);
    const merged = mergeChecklists(storedChecklist, defaultChecklist);
    await storage.saveChecklist(merged);
    await storage.saveChecklistVersion(CHECKLIST_VERSION);
    console.log('[ChecklistUpdate] Merge complete, version saved:', CHECKLIST_VERSION);
    setApplying(false);
    setConfirmation('merged');
    setTimeout(() => router.back(), 1200);
  }

  async function handleReplace() {
    if (!storedChecklist) return;
    console.log('[ChecklistUpdate] User chose: Erstatt alt');
    setApplying(true);
    await storage.saveChecklist(defaultChecklist);
    await storage.saveChecklistVersion(CHECKLIST_VERSION);
    console.log('[ChecklistUpdate] Replace complete, version saved:', CHECKLIST_VERSION);
    setApplying(false);
    setConfirmation('replaced');
    setTimeout(() => router.back(), 1200);
  }

  async function handleKeep() {
    if (!storedChecklist) return;
    console.log('[ChecklistUpdate] User chose: Behold eksisterende');
    setApplying(true);
    const merged = mergeChecklists(storedChecklist, defaultChecklist);
    await storage.saveChecklist(merged);
    await storage.saveChecklistVersion(CHECKLIST_VERSION);
    console.log('[ChecklistUpdate] Kept existing with silent merge, version saved:', CHECKLIST_VERSION);
    setApplying(false);
    setConfirmation('kept');
    setTimeout(() => router.back(), 1200);
  }

  const confirmationMessage =
    confirmation === 'merged' ? 'Sammenslått!' :
    confirmation === 'replaced' ? 'Erstattet!' :
    confirmation === 'kept' ? 'Beholdt!' :
    null;

  if (!storedChecklist) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NY VERSJON</Text>
        </View>

        <Text style={styles.heading}>Oppdatert KTS-liste{'\n'}tilgjengelig</Text>

        <Text style={styles.subtext}>
          En ny versjon av sjekklisten er tilgjengelig med oppdaterte kategorier og punkter.
        </Text>

        {hasDiff && diffSummary ? (
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>{diffSummary}</Text>
          </View>
        ) : (
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>Ingen nye punkter – kun strukturoppdatering</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          {/* Merge — recommended */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardHighlighted]}
            onPress={handleMerge}
            disabled={applying || confirmation !== 'idle'}
            activeOpacity={0.75}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitleHighlighted}>Slå sammen</Text>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>ANBEFALT</Text>
              </View>
            </View>
            <Text style={styles.optionDescHighlighted}>
              Legger til nye kategorier og punkter i din eksisterende liste. Egne endringer beholdes.
            </Text>
          </TouchableOpacity>

          {/* Replace — destructive */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardDestructive]}
            onPress={handleReplace}
            disabled={applying || confirmation !== 'idle'}
            activeOpacity={0.75}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitleDestructive}>Erstatt alt</Text>
              <Text style={styles.warningIcon}>⚠</Text>
            </View>
            <Text style={styles.optionDescDestructive}>
              Erstatter hele listen med standardlisten. Alle egne endringer går tapt.
            </Text>
          </TouchableOpacity>

          {/* Keep — neutral */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardNeutral]}
            onPress={handleKeep}
            disabled={applying || confirmation !== 'idle'}
            activeOpacity={0.75}
          >
            <Text style={styles.optionTitleNeutral}>Behold eksisterende</Text>
            <Text style={styles.optionDescNeutral}>
              Ingen endringer gjøres. Du vil ikke bli spurt igjen.
            </Text>
            <Text style={styles.optionHintNeutral}>
              Du kan alltid hente nye punkter senere via Tilbakestill app i innstillinger.
            </Text>
          </TouchableOpacity>
        </View>

        {applying && (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        )}

        {confirmationMessage && (
          <View style={styles.confirmationBanner}>
            <Text style={styles.confirmationText}>{confirmationMessage}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
  },
  badgeText: {
    color: colors.backgroundTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: bodyFont,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'BigShouldersStencil_700Bold',
    lineHeight: 38,
    marginBottom: 14,
  },
  subtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: bodyFont,
    marginBottom: 16,
  },
  diffBadge: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  diffBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: bodyFont,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionCard: {
    borderRadius: 14,
    padding: 18,
    width: '100%',
  },
  optionCardHighlighted: {
    backgroundColor: colors.primary,
  },
  optionCardDestructive: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  optionCardNeutral: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optionTitleHighlighted: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.backgroundTertiary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  optionTitleDestructive: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.error,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  optionTitleNeutral: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 6,
  },
  optionDescHighlighted: {
    fontSize: 13,
    color: colors.backgroundTertiary,
    lineHeight: 19,
    fontFamily: bodyFont,
    opacity: 0.8,
  },
  optionDescDestructive: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontFamily: bodyFont,
  },
  optionDescNeutral: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontFamily: bodyFont,
  },
  optionHintNeutral: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    fontFamily: bodyFont,
    opacity: 0.65,
    marginTop: 6,
  },
  recommendedBadge: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  recommendedText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: bodyFont,
  },
  warningIcon: {
    fontSize: 16,
    color: colors.error,
  },
  spinner: {
    marginTop: 20,
  },
  confirmationBanner: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  confirmationText: {
    color: colors.backgroundTertiary,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
  },
});
