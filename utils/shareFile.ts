
import { ChecklistCategory, ChecklistItem } from '@/types/checklist';
import {
  SharedChecklistFile,
  KTS_FILE_FORMAT,
  KTS_APP_ID,
  KTS_SCHEMA_VERSION,
  KTS_MAX_FILE_BYTES,
  KTS_MAX_CATEGORIES,
  KTS_MAX_ITEMS_PER_CATEGORY,
  KTS_MAX_TITLE_LENGTH,
  KTS_MAX_AUTHOR_LENGTH,
  KTS_MAX_CATEGORY_NAME_LENGTH,
  KTS_MAX_ITEM_NAME_LENGTH,
} from '@/types/share';

// ─── Injection pattern detection ─────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /data:/i,
  /eval\(/i,
  /Function\(/i,
  /\$\{/,
  /on\w+=/i,
];

function containsInjection(value: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(value));
}

// Control characters except tab (\t = 0x09) and newline (\n = 0x0A, \r = 0x0D)
// Using Unicode escapes to avoid the no-control-regex lint rule
function containsControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Allow: 0x09 (tab), 0x0A (LF), 0x0D (CR)
    // Reject: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
    if (
      (code >= 0x00 && code <= 0x08) ||
      code === 0x0B ||
      code === 0x0C ||
      (code >= 0x0E && code <= 0x1F) ||
      code === 0x7F
    ) {
      return true;
    }
  }
  return false;
}

function isSafeString(value: string): boolean {
  return !containsControlChars(value) && !containsInjection(value);
}

// ─── Allow-list key sets ──────────────────────────────────────────────────────

const ALLOWED_TOP_KEYS = new Set(['format', 'schemaVersion', 'metadata', 'payload']);
const ALLOWED_METADATA_KEYS = new Set(['title', 'author', 'createdAt', 'appId', 'origin']);
const ALLOWED_PAYLOAD_KEYS = new Set(['kind', 'categories']);
const ALLOWED_CATEGORY_KEYS = new Set(['id', 'name', 'categoryRole', 'items']);
const ALLOWED_ITEM_KEYS = new Set(['id', 'name', 'categoryId']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkAllowedKeys(obj: Record<string, unknown>, allowed: Set<string>, context: string): string | null {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      return `Ukjent felt "${key}" i ${context}`;
    }
  }
  return null;
}

// ─── Build ────────────────────────────────────────────────────────────────────

export function buildSharedFile(opts: {
  kind: 'category' | 'checklist';
  categories: ChecklistCategory[];
  title: string;
  author: string;
}): SharedChecklistFile {
  return {
    format: KTS_FILE_FORMAT,
    schemaVersion: KTS_SCHEMA_VERSION,
    metadata: {
      title: opts.title.trim().slice(0, KTS_MAX_TITLE_LENGTH),
      author: opts.author.trim().slice(0, KTS_MAX_AUTHOR_LENGTH),
      createdAt: new Date().toISOString(),
      appId: KTS_APP_ID,
      origin: '',
    },
    payload: {
      kind: opts.kind,
      categories: opts.categories,
    },
  };
}

export function serializeSharedFile(file: SharedChecklistFile): string {
  return JSON.stringify(file, null, 2);
}

// ─── Validate ─────────────────────────────────────────────────────────────────

export function validateSharedFile(
  rawText: string,
): { ok: true; file: SharedChecklistFile } | { ok: false; reason: string } {
  // 1. Size check (byte length)
  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > KTS_MAX_FILE_BYTES) {
    return { ok: false, reason: 'Filen er for stor (maks 2 MB)' };
  }

  // 2. Parse — never eval
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, reason: 'Filen er ikke gyldig JSON' };
  }

  // Must be a plain object
  if (!isPlainObject(parsed)) {
    return { ok: false, reason: 'Filen inneholder ugyldige data' };
  }

  // Prototype check
  if (Object.getPrototypeOf(parsed) !== Object.prototype) {
    return { ok: false, reason: 'Filen inneholder ugyldige data' };
  }

  // 5. Unknown top-level keys
  const topKeyErr = checkAllowedKeys(parsed, ALLOWED_TOP_KEYS, 'toppnivå');
  if (topKeyErr) return { ok: false, reason: topKeyErr };

  // 3. format check
  if (parsed.format !== KTS_FILE_FORMAT) {
    return { ok: false, reason: 'Ukjent filformat' };
  }

  // schemaVersion
  if (typeof parsed.schemaVersion !== 'number') {
    return { ok: false, reason: 'Filen inneholder ugyldige data (schemaVersion)' };
  }
  const schemaVersion = parsed.schemaVersion as number;
  // Forward-compat: warn if higher version (handled by caller via ok:true + warning flag)
  // We still validate what we know

  // metadata
  if (!isPlainObject(parsed.metadata)) {
    return { ok: false, reason: 'Filen mangler metadata' };
  }
  if (Object.getPrototypeOf(parsed.metadata) !== Object.prototype) {
    return { ok: false, reason: 'Filen inneholder ugyldige data' };
  }
  const metaKeyErr = checkAllowedKeys(parsed.metadata as Record<string, unknown>, ALLOWED_METADATA_KEYS, 'metadata');
  if (metaKeyErr) return { ok: false, reason: metaKeyErr };

  const meta = parsed.metadata as Record<string, unknown>;

  // 4. appId check
  if (meta.appId !== KTS_APP_ID) {
    return { ok: false, reason: 'Filen er ikke laget for KTS Alfa' };
  }

  if (typeof meta.title !== 'string') return { ok: false, reason: 'Filen mangler tittel' };
  const title = (meta.title as string).trim();
  if (title.length === 0 || title.length > KTS_MAX_TITLE_LENGTH) {
    return { ok: false, reason: 'Tittelen er ugyldig' };
  }
  if (!isSafeString(title)) return { ok: false, reason: 'Filen inneholder ugyldige data (tittel)' };

  if (typeof meta.author !== 'string') return { ok: false, reason: 'Filen inneholder ugyldige data (author)' };
  const author = (meta.author as string).trim();
  if (author.length > KTS_MAX_AUTHOR_LENGTH) return { ok: false, reason: 'Forfatternavn er for langt' };
  if (author.length > 0 && !isSafeString(author)) return { ok: false, reason: 'Filen inneholder ugyldige data (author)' };

  if (typeof meta.createdAt !== 'string') return { ok: false, reason: 'Filen mangler opprettelsesdato' };
  if (!isSafeString(meta.createdAt as string)) return { ok: false, reason: 'Filen inneholder ugyldige data (createdAt)' };

  // origin: must be string (can be empty or a URL — we accept but don't use it)
  if (typeof meta.origin !== 'string') return { ok: false, reason: 'Filen inneholder ugyldige data (origin)' };

  // payload
  if (!isPlainObject(parsed.payload)) {
    return { ok: false, reason: 'Filen mangler innhold' };
  }
  if (Object.getPrototypeOf(parsed.payload) !== Object.prototype) {
    return { ok: false, reason: 'Filen inneholder ugyldige data' };
  }
  const payloadKeyErr = checkAllowedKeys(parsed.payload as Record<string, unknown>, ALLOWED_PAYLOAD_KEYS, 'payload');
  if (payloadKeyErr) return { ok: false, reason: payloadKeyErr };

  const payload = parsed.payload as Record<string, unknown>;

  // 10. kind
  if (payload.kind !== 'category' && payload.kind !== 'checklist') {
    return { ok: false, reason: 'Ukjent innholdstype' };
  }
  const kind = payload.kind as 'category' | 'checklist';

  // categories array
  if (!Array.isArray(payload.categories)) {
    return { ok: false, reason: 'Filen mangler kategorier' };
  }
  const rawCats = payload.categories as unknown[];

  // 11 & 12. kind-specific length checks
  if (kind === 'category' && rawCats.length !== 1) {
    return { ok: false, reason: 'Enkelt-kategori-fil må inneholde nøyaktig én kategori' };
  }
  if (kind === 'checklist' && rawCats.length < 1) {
    return { ok: false, reason: 'Sjekkliste-fil må inneholde minst én kategori' };
  }

  // 7. Max categories
  if (rawCats.length > KTS_MAX_CATEGORIES) {
    return { ok: false, reason: `Filen inneholder for mange kategorier (maks ${KTS_MAX_CATEGORIES})` };
  }

  // Validate each category — build clean output field-by-field (rule 9)
  const categories: import('@/types/checklist').ChecklistCategory[] = [];
  for (let ci = 0; ci < rawCats.length; ci++) {
    const rawCat = rawCats[ci];
    if (!isPlainObject(rawCat)) return { ok: false, reason: `Kategori ${ci + 1} er ugyldig` };
    if (Object.getPrototypeOf(rawCat) !== Object.prototype) return { ok: false, reason: `Kategori ${ci + 1} er ugyldig` };

    const catKeyErr = checkAllowedKeys(rawCat, ALLOWED_CATEGORY_KEYS, `kategori ${ci + 1}`);
    if (catKeyErr) return { ok: false, reason: catKeyErr };

    if (typeof rawCat.id !== 'string') return { ok: false, reason: `Kategori ${ci + 1} mangler id` };
    const catId = (rawCat.id as string).trim();
    if (catId.length === 0) return { ok: false, reason: `Kategori ${ci + 1} har ugyldig id` };
    if (!isSafeString(catId)) return { ok: false, reason: `Kategori ${ci + 1} inneholder ugyldige data (id)` };

    if (typeof rawCat.name !== 'string') return { ok: false, reason: `Kategori ${ci + 1} mangler navn` };
    const catName = (rawCat.name as string).trim();
    if (catName.length === 0 || catName.length > KTS_MAX_CATEGORY_NAME_LENGTH) {
      return { ok: false, reason: `Kategori ${ci + 1} har ugyldig navn` };
    }
    if (!isSafeString(catName)) return { ok: false, reason: `Kategori ${ci + 1} inneholder ugyldige data (navn)` };

    if (rawCat.categoryRole !== 'general' && rawCat.categoryRole !== 'weapon') {
      return { ok: false, reason: `Kategori ${ci + 1} har ugyldig kategoritype` };
    }
    const categoryRole = rawCat.categoryRole as 'general' | 'weapon';

    if (!Array.isArray(rawCat.items)) return { ok: false, reason: `Kategori ${ci + 1} mangler elementer` };
    const rawItems = rawCat.items as unknown[];

    if (rawItems.length > KTS_MAX_ITEMS_PER_CATEGORY) {
      return { ok: false, reason: `Kategori ${ci + 1} inneholder for mange elementer (maks ${KTS_MAX_ITEMS_PER_CATEGORY})` };
    }

    const items: import('@/types/checklist').ChecklistItem[] = [];
    for (let ii = 0; ii < rawItems.length; ii++) {
      const rawItem = rawItems[ii];
      if (!isPlainObject(rawItem)) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} er ugyldig` };
      if (Object.getPrototypeOf(rawItem) !== Object.prototype) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} er ugyldig` };

      const itemKeyErr = checkAllowedKeys(rawItem, ALLOWED_ITEM_KEYS, `element ${ii + 1} i kategori ${ci + 1}`);
      if (itemKeyErr) return { ok: false, reason: itemKeyErr };

      if (typeof rawItem.id !== 'string') return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} mangler id` };
      const itemId = (rawItem.id as string).trim();
      if (itemId.length === 0) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} har ugyldig id` };
      if (!isSafeString(itemId)) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} inneholder ugyldige data (id)` };

      if (typeof rawItem.name !== 'string') return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} mangler navn` };
      const itemName = (rawItem.name as string).trim();
      if (itemName.length === 0 || itemName.length > KTS_MAX_ITEM_NAME_LENGTH) {
        return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} har ugyldig navn` };
      }
      if (!isSafeString(itemName)) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} inneholder ugyldige data (navn)` };

      if (typeof rawItem.categoryId !== 'string') return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} mangler categoryId` };
      const itemCategoryId = (rawItem.categoryId as string).trim();
      if (itemCategoryId.length === 0) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} har ugyldig categoryId` };
      if (!isSafeString(itemCategoryId)) return { ok: false, reason: `Element ${ii + 1} i kategori ${ci + 1} inneholder ugyldige data (categoryId)` };

      // Build clean item field-by-field
      items.push({ id: itemId, name: itemName, categoryId: itemCategoryId });
    }

    // Build clean category field-by-field
    categories.push({ id: catId, name: catName, categoryRole, items });
  }

  // Build clean file field-by-field
  const file: SharedChecklistFile = {
    format: KTS_FILE_FORMAT,
    schemaVersion,
    metadata: {
      title,
      author,
      createdAt: (meta.createdAt as string).trim(),
      appId: KTS_APP_ID,
      origin: (meta.origin as string).trim(),
    },
    payload: {
      kind,
      categories,
    },
  };

  return { ok: true, file };
}

// ─── Filename helpers ─────────────────────────────────────────────────────────

export function slugifyForFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9æøå]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug.length > 0 ? slug : 'sjekkliste';
}

// ─── ID regeneration ──────────────────────────────────────────────────────────

export function regenerateCategoryIds(cat: ChecklistCategory): ChecklistCategory {
  const newCatId = `cat-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const items: import('@/types/checklist').ChecklistItem[] = cat.items.map(item => ({
    id: `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    name: item.name,
    categoryId: newCatId,
  }));
  return {
    id: newCatId,
    name: cat.name,
    categoryRole: cat.categoryRole,
    items,
  };
}

// ─── Schema version warning ───────────────────────────────────────────────────

export function isNewerSchemaVersion(file: SharedChecklistFile): boolean {
  return file.schemaVersion > KTS_SCHEMA_VERSION;
}
