
import { Alert } from 'react-native';
import {
  cacheDirectory,
  writeAsStringAsync,
  deleteAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ChecklistCategory } from '@/types/checklist';
import { KTS_UTI, KTS_FILE_EXTENSION } from '@/types/share';
import { buildSharedFile, serializeSharedFile, slugifyForFilename } from './shareFile';

export type ExportFormat = 'kts' | 'json';

async function shareCategories(opts: {
  kind: 'category' | 'checklist';
  categories: ChecklistCategory[];
  title: string;
  author: string;
  format: ExportFormat;
}): Promise<void> {
  console.log('[Export] Checking sharing availability');
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert('Deling ikke tilgjengelig', 'Deling er ikke støttet på denne enheten.');
    return;
  }

  const file = buildSharedFile(opts);
  const json = serializeSharedFile(file);
  const slug = slugifyForFilename(opts.title);
  const extension = opts.format === 'json' ? 'kts.json' : KTS_FILE_EXTENSION;
  const filename = `${slug}.${extension}`;
  const uri = `${cacheDirectory}${filename}`;

  console.log('[Export] Writing temp file:', uri, 'format:', opts.format);
  await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 });

  console.log('[Export] Opening share sheet for:', filename);
  const shareOpts: { mimeType: string; UTI?: string; dialogTitle: string } = {
    mimeType: 'application/json',
    dialogTitle: 'Del sjekkliste',
  };
  if (opts.format === 'kts') {
    shareOpts.UTI = KTS_UTI;
  }
  await Sharing.shareAsync(uri, shareOpts);

  deleteAsync(uri, { idempotent: true }).catch(e => {
    console.warn('[Export] Could not delete temp file:', e);
  });
}

export async function exportSingleCategory(
  category: ChecklistCategory,
  title: string,
  author: string,
  format: ExportFormat = 'kts',
): Promise<void> {
  console.log('[Export] exportSingleCategory:', category.name, 'title:', title, 'format:', format);
  await shareCategories({ kind: 'category', categories: [category], title, author, format });
}

export async function exportFullChecklist(
  categories: ChecklistCategory[],
  title: string,
  author: string,
  format: ExportFormat = 'kts',
): Promise<void> {
  console.log('[Export] exportFullChecklist, categories:', categories.length, 'title:', title, 'format:', format);
  await shareCategories({ kind: 'checklist', categories, title, author, format });
}
