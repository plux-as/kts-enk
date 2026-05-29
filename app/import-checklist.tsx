
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, bodyFont, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { ChecklistCategory } from '@/types/checklist';
import { SharedChecklistFile } from '@/types/share';
import { isNewerSchemaVersion } from '@/utils/shareFile';
import { formatNorwegianDate } from '@/utils/dateFormat';
import {
  pickAndReadKtsFile,
  readKtsFromUri,
  detectConflicts,
  applyImport,
  ConflictResolution,
  ConflictChoice,
  ImportSummary,
} from '@/utils/importChecklist';
import { storage } from '@/utils/storage';

// ─── Stage types ──────────────────────────────────────────────────────────────

type Stage =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'invalid'; reason: string }
  | { name: 'preview'; file: SharedChecklistFile; newerSchema: boolean }
  | { name: 'conflicts'; file: SharedChecklistFile; resolutions: ConflictResolution[]; freshCategories: ChecklistCategory[] }
  | { name: 'replaceWarning'; file: SharedChecklistFile; resolutions: ConflictResolution[]; freshCategories: ChecklistCategory[] }
  | { name: 'done'; summary: ImportSummary };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalItems(categories: ChecklistCategory[]): number {
  return categories.reduce((sum, c) => sum + c.items.length, 0);
}

function categoryCountLabel(n: number): string {
  if (n === 1) return '1 kategori';
  return `${n} kategorier`;
}

function itemCountLabel(n: number): string {
  if (n === 1) return '1 element';
  return `${n} elementer`;
}

// ─── Conflict card ────────────────────────────────────────────────────────────

interface ConflictCardProps {
  resolution: ConflictResolution;
  onChange: (choice: ConflictChoice) => void;
}

function ConflictCard({ resolution, onChange }: ConflictCardProps) {
  const { incoming, existing, choice } = resolution;
  const incomingItemCount = itemCountLabel(incoming.items.length);
  const existingItemCount = itemCountLabel(existing.items.length);

  return (
    <View style={styles.conflictCard}>
      <View style={styles.conflictNames}>
        <View style={styles.conflictNameCol}>
          <Text style={styles.conflictLabel}>Innkommende</Text>
          <Text style={styles.conflictName}>{incoming.name}</Text>
          <Text style={styles.conflictMeta}>{incomingItemCount}</Text>
        </View>
        <View style={styles.conflictArrow}>
          <IconSymbol name="arrow.right" color={colors.textSecondary} size={16} />
        </View>
        <View style={styles.conflictNameCol}>
          <Text style={styles.conflictLabel}>Eksisterende</Text>
          <Text style={styles.conflictName}>{existing.name}</Text>
          <Text style={styles.conflictMeta}>{existingItemCount}</Text>
        </View>
      </View>

      <View style={styles.choiceRow}>
        <Pressable
          style={[styles.choiceButton, choice === 'replace' && styles.choiceButtonReplace]}
          onPress={() => {
            if (choice === 'replace') return;
            Alert.alert(
              'Erstatt kategori?',
              `Erstatt vil overskrive «${incoming.name}» og fjerne tilknyttede loggoppføringer og soldat-tildelinger. Dette kan ikke angres.`,
              [
                { text: 'Avbryt', style: 'cancel' },
                {
                  text: 'Erstatt',
                  style: 'destructive',
                  onPress: () => {
                    console.log('[Import] Conflict choice: replace for', incoming.name);
                    onChange('replace');
                  },
                },
              ],
            );
          }}
        >
          <Text style={[styles.choiceButtonText, choice === 'replace' && styles.choiceButtonTextSelected]}>
            Erstatt
          </Text>
        </Pressable>
        <Pressable
          style={[styles.choiceButton, choice === 'keep' && styles.choiceButtonKeep]}
          onPress={() => {
            console.log('[Import] Conflict choice: keep for', incoming.name);
            onChange('keep');
          }}
        >
          <Text style={[styles.choiceButtonText, choice === 'keep' && styles.choiceButtonTextSelected]}>
            Behold
          </Text>
        </Pressable>
        <Pressable
          style={[styles.choiceButton, choice === 'rename' && styles.choiceButtonRename]}
          onPress={() => {
            console.log('[Import] Conflict choice: rename for', incoming.name);
            onChange('rename');
          }}
        >
          <Text style={[styles.choiceButtonText, choice === 'rename' && styles.choiceButtonTextSelected]}>
            Kopi
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ImportChecklistScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fileUri?: string; cold?: string }>();
  const isColdLaunch = params.cold === '1';
  const [stage, setStage] = useState<Stage>({ name: 'idle' });
  const [existingChecklist, setExistingChecklist] = useState<ChecklistCategory[]>([]);

  // Load existing checklist once
  useEffect(() => {
    storage.getChecklist().then(list => {
      setExistingChecklist(list);
    });
  }, []);

  // If launched with a fileUri param, start loading immediately
  useEffect(() => {
    if (params.fileUri && stage.name === 'idle') {
      console.log('[ImportScreen] Launched with fileUri:', params.fileUri);
      handleLoadFromUri(params.fileUri);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.fileUri]);

  const exitImporter = useCallback(() => {
    console.log('[ImportScreen] exitImporter called, isColdLaunch:', isColdLaunch);
    if (isColdLaunch) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  }, [isColdLaunch]);

  const handleLoadFromUri = useCallback(async (uri: string) => {
    setStage({ name: 'loading' });
    const result = await readKtsFromUri(uri);
    if (!result.ok) {
      setStage({ name: 'invalid', reason: result.reason });
      return;
    }
    if (isNewerSchemaVersion(result.file)) {
      Alert.alert(
        'Nyere filversjon',
        'Filen ble laget med en nyere versjon av KTS Alfa — noen funksjoner kan mangle.',
      );
    }
    setStage({ name: 'preview', file: result.file, newerSchema: isNewerSchemaVersion(result.file) });
  }, []);

  const handlePickFile = async () => {
    console.log('[ImportScreen] User tapped Velg fil');
    setStage({ name: 'loading' });
    const result = await pickAndReadKtsFile();
    if (!result.ok) {
      if (result.reason === 'Avbrutt') {
        setStage({ name: 'idle' });
        return;
      }
      setStage({ name: 'invalid', reason: result.reason });
      return;
    }
    if (isNewerSchemaVersion(result.file)) {
      Alert.alert(
        'Nyere filversjon',
        'Filen ble laget med en nyere versjon av KTS Alfa — noen funksjoner kan mangle.',
      );
    }
    setStage({ name: 'preview', file: result.file, newerSchema: isNewerSchemaVersion(result.file) });
  };

  const handlePreviewImport = async () => {
    if (stage.name !== 'preview') return;
    console.log('[ImportScreen] User tapped Importer from preview');
    // Show loading while we read the latest stored checklist — avoids a race
    // where existingChecklist state is still the initial [] on cold-launch.
    const previewStage = stage; // capture before stage transition
    setStage({ name: 'loading' });
    const fresh = await storage.getChecklist();
    setExistingChecklist(fresh);
    console.log('[ImportScreen] Fresh existing read for conflict detection — categories:', fresh.length);

    const { conflicts, freshCategories } = detectConflicts(
      previewStage.file.payload.categories,
      fresh,
    );

    if (conflicts.length === 0) {
      // No conflicts — proceed with import using the fresh existing list
      proceedWithImport(previewStage.file, [], freshCategories, fresh);
      return;
    }

    const resolutions: ConflictResolution[] = conflicts.map(c => ({
      incoming: c.incoming,
      existing: c.existing,
      choice: 'keep' as ConflictChoice,
    }));

    setStage({ name: 'conflicts', file: previewStage.file, resolutions, freshCategories });
  };

  const handleBulkChoice = (choice: ConflictChoice) => {
    if (stage.name !== 'conflicts') return;
    console.log('[ImportScreen] User applied bulk choice:', choice);
    const updated = stage.resolutions.map(r => ({ ...r, choice }));
    setStage({ ...stage, resolutions: updated });
  };

  const handleConflictChange = (index: number, choice: ConflictChoice) => {
    if (stage.name !== 'conflicts') return;
    const updated = [...stage.resolutions];
    updated[index] = { ...updated[index], choice };
    setStage({ ...stage, resolutions: updated });
  };

  const handleConflictContinue = async () => {
    if (stage.name !== 'conflicts') return;
    console.log('[ImportScreen] User tapped Fortsett from conflicts');
    const hasReplace = stage.resolutions.some(r => r.choice === 'replace');
    if (hasReplace) {
      setStage({ name: 'replaceWarning', file: stage.file, resolutions: stage.resolutions, freshCategories: stage.freshCategories });
    } else {
      const fresh = await storage.getChecklist();
      setExistingChecklist(fresh);
      proceedWithImport(stage.file, stage.resolutions, stage.freshCategories, fresh);
    }
  };

  const proceedWithImport = async (
    file: SharedChecklistFile,
    resolutions: ConflictResolution[],
    freshCategories: ChecklistCategory[],
    existing: ChecklistCategory[],
  ) => {
    console.log('[ImportScreen] Proceeding with import — existing categories:', existing.length, 'fresh:', freshCategories.length, 'conflicts:', resolutions.length);
    setStage({ name: 'loading' });
    try {
      const summary = await applyImport({
        freshCategories,
        conflictResolutions: resolutions,
        existing,
      });
      // Refresh local checklist state for any subsequent UI
      const updated = await storage.getChecklist();
      setExistingChecklist(updated);
      setStage({ name: 'done', summary });
    } catch (e) {
      console.error('[ImportScreen] Import failed:', e);
      Alert.alert('Feil', 'Importen mislyktes. Prøv igjen.');
      setStage({ name: 'idle' });
    }
  };

  const handleConfirmReplace = async () => {
    if (stage.name !== 'replaceWarning') return;
    console.log('[ImportScreen] User confirmed replace warning');
    const fresh = await storage.getChecklist();
    setExistingChecklist(fresh);
    proceedWithImport(stage.file, stage.resolutions, stage.freshCategories, fresh);
  };

  // ─── Render stages ──────────────────────────────────────────────────────────

  const renderContent = () => {
    if (stage.name === 'idle') {
      return (
        <View style={styles.centeredContent}>
          <IconSymbol name="square.and.arrow.down" color={colors.primary} size={56} />
          <Text style={styles.idleTitle}>Importer sjekkliste</Text>
          <Text style={styles.idleSubtitle}>
            Velg en .kts-fil fra enheten din for å importere kategorier.
          </Text>
          <Pressable style={styles.primaryButton} onPress={handlePickFile}>
            <Text style={styles.primaryButtonText}>Velg fil</Text>
          </Pressable>
        </View>
      );
    }

    if (stage.name === 'loading') {
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Laster fil...</Text>
        </View>
      );
    }

    if (stage.name === 'invalid') {
      return (
        <View style={styles.centeredContent}>
          <IconSymbol name="exclamationmark.triangle.fill" color={colors.error} size={48} />
          <Text style={styles.invalidTitle}>Filen er ugyldig</Text>
          <Text style={styles.invalidReason}>{stage.reason}</Text>
          <Pressable style={styles.secondaryButton} onPress={exitImporter}>
            <Text style={styles.secondaryButtonText}>Lukk</Text>
          </Pressable>
        </View>
      );
    }

    if (stage.name === 'preview') {
      const { file } = stage;
      const cats = file.payload.categories;
      const total = totalItems(cats);
      const catLabel = categoryCountLabel(cats.length);
      const itemLabel = itemCountLabel(total);
      const dateStr = formatNorwegianDate(file.metadata.createdAt);

      return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>{file.metadata.title}</Text>
            {file.metadata.author.length > 0 && (
              <Text style={styles.metaAuthor}>{file.metadata.author}</Text>
            )}
            <Text style={styles.metaDate}>{dateStr}</Text>
            <Text style={styles.metaSummary}>
              {catLabel}
            </Text>
            <Text style={styles.metaSummary}>
              {itemLabel}
            </Text>
          </View>

          <Text style={styles.sectionHeader}>KATEGORIER I FILEN</Text>
          {cats.map((cat, i) => {
            const catItemLabel = itemCountLabel(cat.items.length);
            return (
              <View key={i} style={styles.previewCatRow}>
                <View style={styles.previewCatInfo}>
                  <Text style={styles.previewCatName}>{cat.name}</Text>
                  <Text style={styles.previewCatMeta}>{catItemLabel}</Text>
                </View>
                <View style={[styles.rolePill, cat.categoryRole === 'weapon' ? styles.rolePillWeapon : styles.rolePillGeneral]}>
                  <Text style={styles.rolePillText}>
                    {cat.categoryRole === 'weapon' ? 'VÅPEN' : 'GENERELL'}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.secondaryButton, styles.actionButton]}
              onPress={() => {
                console.log('[ImportScreen] User tapped Avbryt from preview');
                exitImporter();
              }}
            >
              <Text style={styles.secondaryButtonText}>Avbryt</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, styles.actionButton]} onPress={handlePreviewImport}>
              <Text style={styles.primaryButtonText}>Importer</Text>
            </Pressable>
          </View>
        </ScrollView>
      );
    }

    if (stage.name === 'conflicts') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.conflictsTitle}>Navnekonflikter</Text>
          <Text style={styles.conflictsSubtitle}>
            Noen kategorier i filen har samme navn som eksisterende kategorier. Velg hva som skal skje for hver.
          </Text>

          {/* Bulk apply row */}
          <View style={styles.bulkRow}>
            <Text style={styles.bulkLabel}>Bruk på alle:</Text>
            <View style={styles.bulkButtons}>
              <Pressable
                style={[styles.bulkButton, styles.bulkButtonReplace]}
                onPress={() => handleBulkChoice('replace')}
              >
                <Text style={styles.bulkButtonText}>Erstatt</Text>
              </Pressable>
              <Pressable
                style={[styles.bulkButton, styles.bulkButtonKeep]}
                onPress={() => handleBulkChoice('keep')}
              >
                <Text style={styles.bulkButtonText}>Behold</Text>
              </Pressable>
              <Pressable
                style={[styles.bulkButton, styles.bulkButtonRename]}
                onPress={() => handleBulkChoice('rename')}
              >
                <Text style={styles.bulkButtonText}>Kopi</Text>
              </Pressable>
            </View>
          </View>

          {stage.resolutions.map((res, i) => (
            <ConflictCard
              key={res.existing.id}
              resolution={res}
              onChange={choice => handleConflictChange(i, choice)}
            />
          ))}

          {stage.freshCategories.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>NYE KATEGORIER (INGEN KONFLIKT)</Text>
              {stage.freshCategories.map((cat, i) => {
                const catItemLabel = itemCountLabel(cat.items.length);
                return (
                  <View key={i} style={styles.previewCatRow}>
                    <View style={styles.previewCatInfo}>
                      <Text style={styles.previewCatName}>{cat.name}</Text>
                      <Text style={styles.previewCatMeta}>{catItemLabel}</Text>
                    </View>
                    <View style={[styles.rolePill, styles.rolePillFresh]}>
                      <Text style={styles.rolePillText}>NY</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.secondaryButton, styles.actionButton]}
              onPress={() => {
                console.log('[ImportScreen] User tapped Tilbake from conflicts');
                if (stage.name === 'conflicts') {
                  setStage({ name: 'preview', file: stage.file, newerSchema: false });
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Tilbake</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, styles.actionButton]} onPress={handleConflictContinue}>
              <Text style={styles.primaryButtonText}>Fortsett</Text>
            </Pressable>
          </View>
        </ScrollView>
      );
    }

    if (stage.name === 'replaceWarning') {
      const replaceCount = stage.resolutions.filter(r => r.choice === 'replace').length;
      const replaceLabel = replaceCount === 1 ? '1 kategori' : `${replaceCount} kategorier`;

      return (
        <View style={styles.centeredContent}>
          <View style={styles.warningCard}>
            <IconSymbol name="exclamationmark.triangle.fill" color={colors.error} size={40} />
            <Text style={styles.warningTitle}>Advarsel</Text>
            <Text style={styles.warningText}>
              Du er i ferd med å erstatte {replaceLabel}.
            </Text>
            <Text style={styles.warningText}>
              Erstatt vil overskrive alle elementer i de valgte kategoriene. Dette kan ikke angres. Tilknyttede loggoppføringer og soldat-tildelinger blir også fjernet.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.secondaryButton, styles.actionButton]}
              onPress={() => {
                console.log('[ImportScreen] User tapped Avbryt from replace warning');
                if (stage.name === 'replaceWarning') {
                  setStage({ name: 'conflicts', file: stage.file, resolutions: stage.resolutions, freshCategories: stage.freshCategories });
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Avbryt</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, styles.dangerButton, styles.actionButton]} onPress={handleConfirmReplace}>
              <Text style={styles.primaryButtonText}>Bekreft og importer</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (stage.name === 'done') {
      const { summary } = stage;
      const lines: string[] = [];
      if (summary.added > 0) lines.push(`${summary.added} nye`);
      if (summary.replaced > 0) lines.push(`${summary.replaced} erstattet`);
      if (summary.renamed > 0) lines.push(`${summary.renamed} importert som kopi`);
      if (summary.skipped > 0) lines.push(`${summary.skipped} hoppet over`);
      const summaryLine = lines.length > 0 ? lines.join(', ') : 'Ingen endringer';

      return (
        <View style={styles.centeredContent}>
          <IconSymbol name="checkmark.circle.fill" color={colors.primary} size={56} />
          <Text style={styles.doneTitle}>Import fullført</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLine}>
              {summaryLine}
            </Text>
            {summary.addedNames.length > 0 && (
              <Text style={styles.summaryDetail}>
                Lagt til: {summary.addedNames.join(', ')}
              </Text>
            )}
            {summary.replacedNames.length > 0 && (
              <Text style={styles.summaryDetail}>
                Erstattet: {summary.replacedNames.join(', ')}
              </Text>
            )}
            {summary.renamedNames.length > 0 && (
              <Text style={styles.summaryDetail}>
                Kopi: {summary.renamedNames.join(', ')}
              </Text>
            )}
            {summary.skippedNames.length > 0 && (
              <Text style={styles.summaryDetail}>
                Hoppet over: {summary.skippedNames.join(', ')}
              </Text>
            )}
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              console.log('[ImportScreen] User tapped Lukk from done');
              exitImporter();
            }}
          >
            <Text style={styles.primaryButtonText}>Lukk</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.fullScreen, { paddingTop: insets.top }]}>
        <View style={commonStyles.modalNavBar}>
          <View style={{ width: 24 }} />
          <Text style={commonStyles.modalNavBarTitle}>Importer sjekkliste</Text>
          <Pressable
            onPress={() => {
              console.log('[ImportScreen] User tapped close (X)');
              exitImporter();
            }}
          >
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>
        <View style={styles.body}>
          {renderContent()}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  // Idle
  idleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
    marginTop: 8,
  },
  idleSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Loading
  loadingText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    marginTop: 12,
  },
  // Invalid
  invalidTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
  },
  invalidReason: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Meta card
  metaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  metaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 4,
  },
  metaAuthor: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    marginBottom: 2,
  },
  metaDate: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    marginBottom: 8,
  },
  metaSummary: {
    fontSize: 15,
    color: colors.text,
    fontFamily: bodyFont,
  },
  // Section header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  // Preview category row
  previewCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  previewCatInfo: {
    flex: 1,
  },
  previewCatName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  previewCatMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    marginTop: 2,
  },
  rolePill: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  rolePillWeapon: {
    backgroundColor: '#0D9488',
  },
  rolePillGeneral: {
    backgroundColor: '#475569',
  },
  rolePillFresh: {
    backgroundColor: colors.primary,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'BigShouldersStencil_700Bold',
    letterSpacing: 0.8,
  },
  // Conflicts
  conflictsTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 8,
  },
  conflictsSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    lineHeight: 22,
    marginBottom: 16,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  bulkLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  bulkButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bulkButtonReplace: {
    backgroundColor: colors.error,
  },
  bulkButtonKeep: {
    backgroundColor: '#475569',
  },
  bulkButtonRename: {
    backgroundColor: colors.primary,
  },
  bulkButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  conflictCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  conflictNames: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  conflictNameCol: {
    flex: 1,
  },
  conflictArrow: {
    paddingTop: 18,
  },
  conflictLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'BigShouldersStencil_700Bold',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  conflictName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  conflictMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    marginTop: 2,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.inputBorder,
  },
  choiceButtonReplace: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  choiceButtonKeep: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  choiceButtonRename: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  choiceButtonTextSelected: {
    color: '#fff',
  },
  // Replace warning
  warningCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.error,
    width: '100%',
  },
  warningTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.error,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  warningText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: bodyFont,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Done
  doneTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 6,
  },
  summaryLine: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    marginBottom: 4,
  },
  summaryDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: bodyFont,
    lineHeight: 20,
  },
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButton: {
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
});
