
import { ChecklistCategory } from './checklist';

// ─── Constants ────────────────────────────────────────────────────────────────

export const KTS_FILE_FORMAT = 'kts-alfa-checklist';
export const KTS_APP_ID = 'kts-alfa';
export const KTS_SCHEMA_VERSION = 1;
export const KTS_FILE_EXTENSION = 'kts';
export const KTS_MIME_TYPE = 'application/vnd.ktsalfa.checklist+json';
export const KTS_UTI = 'app.ktsalfa.checklist';
export const KTS_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

// Validation caps
export const KTS_MAX_CATEGORIES = 50;
export const KTS_MAX_ITEMS_PER_CATEGORY = 200;
export const KTS_MAX_TITLE_LENGTH = 120;
export const KTS_MAX_AUTHOR_LENGTH = 80;
export const KTS_MAX_CATEGORY_NAME_LENGTH = 80;
export const KTS_MAX_ITEM_NAME_LENGTH = 500;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SharedChecklistMetadata {
  title: string;
  author: string;
  createdAt: string;
  appId: string;
  origin: string;
}

export interface SharedChecklistPayload {
  kind: 'category' | 'checklist';
  categories: ChecklistCategory[];
}

export interface SharedChecklistFile {
  format: string;
  schemaVersion: number;
  metadata: SharedChecklistMetadata;
  payload: SharedChecklistPayload;
}
