
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, copyAsync, deleteAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import { ChecklistCategory } from '@/types/checklist';
import { SharedChecklistFile, KTS_MIME_TYPE, KTS_FILE_EXTENSION } from '@/types/share';
import { validateSharedFile, regenerateCategoryIds } from './shareFile';
import { storage } from './storage';

// ─── File reading ─────────────────────────────────────────────────────────────

export async function pickAndReadKtsFile(): Promise<
  { ok: true; file: SharedChecklistFile; sourceUri: string } | { ok: false; reason: string }
> {
  console.log('[Import] Opening document picker');
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: [KTS_MIME_TYPE, 'application/json', '*/*'],
      copyToCacheDirectory: true,
    });
  } catch (e) {
    console.error('[Import] Document picker error:', e);
    return { ok: false, reason: 'Kunne ikke åpne filvelger' };
  }

  if (result.canceled) {
    console.log('[Import] User cancelled document picker');
    return { ok: false, reason: 'Avbrutt' };
  }

  const asset = result.assets[0];
  if (!asset) {
    return { ok: false, reason: 'Ingen fil valgt' };
  }

  // Filter by extension if MIME doesn't match
  const name = (asset.name ?? '').toLowerCase();
  const mimeOk = asset.mimeType === KTS_MIME_TYPE || asset.mimeType === 'application/json';
  const extOk = name.endsWith(`.${KTS_FILE_EXTENSION}`);
  if (!mimeOk && !extOk) {
    console.warn('[Import] File rejected by extension/MIME:', asset.name, asset.mimeType);
    return { ok: false, reason: 'Filen er ikke en KTS Alfa-sjekkliste (.kts)' };
  }

  console.log('[Import] Reading file:', asset.uri);
  return readKtsFromUri(asset.uri);
}

export async function readKtsFromUri(
  uri: string,
): Promise<{ ok: true; file: SharedChecklistFile } | { ok: false; reason: string }> {
  console.log('[Import] readKtsFromUri:', uri);

  let rawText: string | undefined;

  // ── Primary path: fetch() ──────────────────────────────────────────────────
  // iOS "Open in app" handoff from the Files app delivers a security-scoped URI
  // (file:///private/var/mobile/Library/Mobile Documents/... or shareddocuments://).
  // expo-file-system goes through NSFileManager and cannot access these URIs without
  // calling URL.startAccessingSecurityScopedResource() first, which it does not do.
  // React Native's built-in fetch() uses NSURLSession, which handles security-scoped
  // URIs transparently — so we try fetch() first before falling back to FileSystem.
  try {
    console.log('[Import] Attempting fetch() read');
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error('fetch status ' + res.status);
    }
    const candidate = await res.text();
    if (candidate.length >= 2) {
      rawText = candidate;
      console.log('[Import] fetch() succeeded, read', rawText.length, 'chars');
    } else {
      console.warn('[Import] fetch() returned suspiciously short body (', candidate.length, 'chars), falling through to copy fallback');
    }
  } catch (fetchErr) {
    console.warn('[Import] fetch() failed, falling through to copy fallback:', fetchErr);
  }

  // ── Fallback path: copy to cache then read ─────────────────────────────────
  let cachePath: string | null = null;
  if (rawText === undefined) {
    cachePath = `${cacheDirectory}kts-import-${Date.now()}.kts`;
    try {
      const isAlreadyCached = !!cacheDirectory && uri.startsWith(cacheDirectory);
      if (isAlreadyCached) {
        console.log('[Import] URI is already in cache directory, reading directly');
        rawText = await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
        console.log('[Import] Read', rawText.length, 'chars from cached URI');
      } else {
        console.log('[Import] Copying to cache:', cachePath);
        await copyAsync({ from: uri, to: cachePath });
        rawText = await readAsStringAsync(cachePath, { encoding: EncodingType.UTF8 });
        console.log('[Import] Read', rawText.length, 'chars from cache copy');
      }
    } catch (copyErr) {
      console.error('[Import] Copy/read fallback failed:', copyErr);
      if (cachePath) {
        deleteAsync(cachePath, { idempotent: true }).catch(() => {});
      }
      return { ok: false, reason: 'read_failed' };
    } finally {
      if (cachePath && !uri.startsWith(cacheDirectory ?? '')) {
        deleteAsync(cachePath, { idempotent: true }).catch(e => {
          console.warn('[Import] Could not delete cache copy:', e);
        });
      }
    }
  }

  if (rawText === undefined) {
    console.error('[Import] Both read strategies failed');
    return { ok: false, reason: 'read_failed' };
  }

  const result = validateSharedFile(rawText);
  if (!result.ok) {
    console.warn('[Import] Validation failed:', result.reason);
    return { ok: false, reason: result.reason };
  }

  console.log('[Import] File validated OK, kind:', result.file.payload.kind, 'categories:', result.file.payload.categories.length);
  return { ok: true, file: result.file };
}

// ─── Conflict detection ───────────────────────────────────────────────────────

export interface ConflictEntry {
  incoming: ChecklistCategory;
  existing: ChecklistCategory;
}

export interface ConflictResult {
  conflicts: ConflictEntry[];
  freshCategories: ChecklistCategory[];
}

export function detectConflicts(
  incoming: ChecklistCategory[],
  existing: ChecklistCategory[],
): ConflictResult {
  const conflicts: ConflictEntry[] = [];
  const freshCategories: ChecklistCategory[] = [];

  for (const inc of incoming) {
    const incName = inc.name.trim().toLocaleLowerCase('nb-NO');
    const match = existing.find(e => e.name.trim().toLocaleLowerCase('nb-NO') === incName);
    if (match) {
      conflicts.push({ incoming: inc, existing: match });
    } else {
      freshCategories.push(inc);
    }
  }

  return { conflicts, freshCategories };
}

// ─── Apply import ─────────────────────────────────────────────────────────────

export type ConflictChoice = 'replace' | 'keep' | 'rename';

export interface ConflictResolution {
  incoming: ChecklistCategory;
  existing: ChecklistCategory;
  choice: ConflictChoice;
}

export interface ImportSummary {
  added: number;
  replaced: number;
  renamed: number;
  skipped: number;
  addedNames: string[];
  replacedNames: string[];
  renamedNames: string[];
  skippedNames: string[];
}

export async function applyImport(opts: {
  freshCategories: ChecklistCategory[];
  conflictResolutions: ConflictResolution[];
  existing: ChecklistCategory[];
}): Promise<ImportSummary> {
  console.log('[Import] applyImport — fresh:', opts.freshCategories.length, 'conflicts:', opts.conflictResolutions.length);

  const summary: ImportSummary = {
    added: 0,
    replaced: 0,
    renamed: 0,
    skipped: 0,
    addedNames: [],
    replacedNames: [],
    renamedNames: [],
    skippedNames: [],
  };

  // Work on a mutable copy
  let merged = [...opts.existing];

  // Collect all existing IDs for collision detection
  const existingIds = new Set(merged.map(c => c.id));

  // Process conflict resolutions
  for (const res of opts.conflictResolutions) {
    if (res.choice === 'replace') {
      console.log('[Import] Replacing category:', res.existing.name, '(id:', res.existing.id, ')');
      // Clean up sessions and squad refs for the existing category
      await storage.purgeCategoryFromSessions(res.existing.id);
      if (res.existing.categoryRole === 'weapon') {
        await storage.clearWeaponCategoryFromSquad(res.existing.id);
      }
      // Remove existing from merged list
      merged = merged.filter(c => c.id !== res.existing.id);
      // Add incoming with fresh IDs (always regenerate — defense in depth)
      const fresh = regenerateCategoryIds(res.incoming);
      merged.push(fresh);
      existingIds.add(fresh.id);
      summary.replaced++;
      summary.replacedNames.push(res.incoming.name);
    } else if (res.choice === 'keep') {
      console.log('[Import] Keeping existing category:', res.existing.name);
      summary.skipped++;
      summary.skippedNames.push(res.incoming.name);
    } else if (res.choice === 'rename') {
      console.log('[Import] Importing as copy:', res.incoming.name);
      // Find a unique name
      const baseName = res.incoming.name;
      let candidateName = `${baseName} (importert)`;
      let n = 2;
      while (merged.some(c => c.name.trim().toLocaleLowerCase('nb-NO') === candidateName.trim().toLocaleLowerCase('nb-NO'))) {
        candidateName = `${baseName} (importert ${n})`;
        n++;
      }
      const fresh = regenerateCategoryIds({ ...res.incoming, name: candidateName });
      merged.push(fresh);
      existingIds.add(fresh.id);
      summary.renamed++;
      summary.renamedNames.push(candidateName);
    }
  }

  // Process fresh categories (no name conflict)
  for (const cat of opts.freshCategories) {
    console.log('[Import] Adding fresh category:', cat.name);
    // Always regenerate IDs to avoid collisions
    const fresh = regenerateCategoryIds(cat);
    merged.push(fresh);
    existingIds.add(fresh.id);
    summary.added++;
    summary.addedNames.push(cat.name);
  }

  await storage.saveChecklist(merged);
  console.log('[Import] Checklist saved, total categories:', merged.length);

  return summary;
}
