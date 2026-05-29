
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SquadSettings, ChecklistCategory, ChecklistSession } from '@/types/checklist';
import { defaultChecklist } from '@/data/defaultChecklist';

const KEYS = {
  SQUAD_SETTINGS: '@squad_settings',
  CHECKLIST: '@checklist',
  CHECKLIST_VERSION: '@checklist_version',
  SESSIONS: '@sessions',
  SETUP_COMPLETE: '@setup_complete',
  DELETED_IDS: '@deleted_ids',
};

export function mergeChecklists(
  stored: ChecklistCategory[],
  incoming: ChecklistCategory[],
  deletedIds: { categoryIds: string[]; itemIds: string[] } = { categoryIds: [], itemIds: [] },
): ChecklistCategory[] {
  const deletedCatSet = new Set(deletedIds.categoryIds);
  const deletedItemSet = new Set(deletedIds.itemIds);
  const storedIds = new Set(stored.map(c => c.id));
  const merged = stored
    .filter(c => !deletedCatSet.has(c.id))
    .map(c => ({
      ...c,
      items: c.items.filter(i => !deletedItemSet.has(i.id)),
    }));

  for (const incomingCat of incoming) {
    // Skip categories the user has explicitly deleted
    if (deletedCatSet.has(incomingCat.id)) continue;

    if (!storedIds.has(incomingCat.id)) {
      // Entirely new category — add it
      merged.push(incomingCat);
    } else {
      // Category exists — merge in any new items, skipping deleted ones
      const storedCatIndex = merged.findIndex(c => c.id === incomingCat.id);
      if (storedCatIndex !== -1) {
        const storedCat = merged[storedCatIndex];
        const storedItemIds = new Set(storedCat.items.map(i => i.id));
        const newItems = incomingCat.items.filter(
          i => !storedItemIds.has(i.id) && !deletedItemSet.has(i.id),
        );
        if (newItems.length > 0) {
          merged[storedCatIndex] = {
            ...storedCat,
            items: [...storedCat.items, ...newItems],
          };
        }
      }
    }
  }

  return merged;
}

export const storage = {
  // Squad Settings
  async saveSquadSettings(settings: SquadSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SQUAD_SETTINGS, JSON.stringify(settings));
      console.log('Squad settings saved:', settings);
    } catch (error) {
      console.error('Error saving squad settings:', error);
      throw error;
    }
  },

  async getSquadSettings(): Promise<SquadSettings | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SQUAD_SETTINGS);
      if (data) {
        console.log('Squad settings loaded');
        const parsed: SquadSettings = JSON.parse(data);
        // Find HK416 category id for default primary weapon fallback
        const checklist = await this.getChecklist();
        const hk416Cat = checklist.find(c => c.name === 'HK416');
        const defaultPrimaryId = hk416Cat?.id ?? (checklist.find(c => c.categoryRole === 'weapon')?.id ?? 'cat-1');

        const migrated: SquadSettings = {
          ...parsed,
          soldiers: parsed.soldiers.map(s => ({
            ...s,
            personligVapenCategoryId: s.personligVapenCategoryId ?? defaultPrimaryId,
            // sekundærVåpenCategoryId: no default — leave as undefined if missing
          })),
        };
        return migrated;
      }
      return null;
    } catch (error) {
      console.error('Error loading squad settings:', error);
      return null;
    }
  },

  // Checklist
  async saveChecklist(checklist: ChecklistCategory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CHECKLIST, JSON.stringify(checklist));
      console.log('Checklist saved');
    } catch (error) {
      console.error('Error saving checklist:', error);
      throw error;
    }
  },

  async getChecklist(): Promise<ChecklistCategory[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CHECKLIST);
      if (data) {
        console.log('Checklist loaded from storage');
        const parsed: ChecklistCategory[] = JSON.parse(data);
        // Migrate: map old primaryWeapon/secondaryWeapon roles to 'weapon'
        const migrated = parsed.map(cat => {
          const role = cat.categoryRole as string;
          if (role === 'primaryWeapon' || role === 'secondaryWeapon') {
            return { ...cat, categoryRole: 'weapon' as const };
          }
          if (!role) {
            // Legacy: cat-1 was always the primary weapon (HK416)
            return { ...cat, categoryRole: (cat.id === 'cat-1' ? 'weapon' : 'general') as 'weapon' | 'general' };
          }
          return cat;
        });
        const deletedIds = await this.getDeletedIds();
        const merged = mergeChecklists(migrated, defaultChecklist, deletedIds);
        console.log('Checklist auto-merged with defaultChecklist (deletedIds applied)');
        await this.saveChecklist(merged);
        return merged;
      }
      console.log('No checklist found, using default');
      return defaultChecklist;
    } catch (error) {
      console.error('Error loading checklist:', error);
      return defaultChecklist;
    }
  },

  // Sessions
  async saveSessions(sessions: ChecklistSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
      console.log('Sessions saved, count:', sessions.length);
    } catch (error) {
      console.error('Error saving sessions:', error);
      throw error;
    }
  },

  async getSessions(): Promise<ChecklistSession[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SESSIONS);
      if (data) {
        console.log('Sessions loaded');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  },

  async addSession(session: ChecklistSession): Promise<void> {
    try {
      const sessions = await this.getSessions();
      sessions.unshift(session); // Add to beginning
      await this.saveSessions(sessions);
      console.log('Session added:', session.id);
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  },

  async updateSession(sessionId: string, updatedSession: ChecklistSession): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      if (index !== -1) {
        sessions[index] = updatedSession;
        await this.saveSessions(sessions);
        console.log('Session updated:', sessionId);
      }
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  async getSessionById(sessionId: string): Promise<ChecklistSession | null> {
    try {
      const sessions = await this.getSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Error getting session by id:', error);
      return null;
    }
  },

  // Setup Complete Flag
  async setSetupComplete(complete: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETUP_COMPLETE, JSON.stringify(complete));
      console.log('Setup complete flag set:', complete);
    } catch (error) {
      console.error('Error setting setup complete:', error);
      throw error;
    }
  },

  async isSetupComplete(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETUP_COMPLETE);
      if (data) {
        return JSON.parse(data);
      }
      return false;
    } catch (error) {
      console.error('Error checking setup complete:', error);
      return false;
    }
  },

  // Checklist Version
  async getChecklistVersion(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CHECKLIST_VERSION);
      if (data !== null) {
        return JSON.parse(data) as number;
      }
      return 0;
    } catch (error) {
      console.error('Error getting checklist version:', error);
      return 0;
    }
  },

  async saveChecklistVersion(version: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CHECKLIST_VERSION, JSON.stringify(version));
      console.log('Checklist version saved:', version);
    } catch (error) {
      console.error('Error saving checklist version:', error);
      throw error;
    }
  },

  // Deleted IDs
  async getDeletedIds(): Promise<{ categoryIds: string[]; itemIds: string[] }> {
    try {
      const data = await AsyncStorage.getItem(KEYS.DELETED_IDS);
      if (data) {
        return JSON.parse(data);
      }
      return { categoryIds: [], itemIds: [] };
    } catch (error) {
      console.error('Error loading deleted ids:', error);
      return { categoryIds: [], itemIds: [] };
    }
  },

  async addDeletedCategoryId(id: string): Promise<void> {
    try {
      const current = await this.getDeletedIds();
      if (!current.categoryIds.includes(id)) {
        current.categoryIds.push(id);
        await AsyncStorage.setItem(KEYS.DELETED_IDS, JSON.stringify(current));
        console.log('Added deleted category id:', id);
      }
    } catch (error) {
      console.error('Error adding deleted category id:', error);
      throw error;
    }
  },

  async addDeletedItemId(id: string): Promise<void> {
    try {
      const current = await this.getDeletedIds();
      if (!current.itemIds.includes(id)) {
        current.itemIds.push(id);
        await AsyncStorage.setItem(KEYS.DELETED_IDS, JSON.stringify(current));
        console.log('Added deleted item id:', id);
      }
    } catch (error) {
      console.error('Error adding deleted item id:', error);
      throw error;
    }
  },

  // Session purge helpers
  async purgeCategoryFromSessions(categoryId: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const cleaned = sessions
        .map(session => ({
          ...session,
          data: session.data.filter(d => d.categoryId !== categoryId),
        }))
        .filter(session => session.data.length > 0);
      await this.saveSessions(cleaned);
      console.log('Purged category from sessions:', categoryId);
    } catch (error) {
      console.error('Error purging category from sessions:', error);
      throw error;
    }
  },

  async purgeItemFromSessions(itemId: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const cleaned = sessions
        .map(session => ({
          ...session,
          data: session.data.filter(d => d.itemId !== itemId),
        }))
        .filter(session => session.data.length > 0);
      await this.saveSessions(cleaned);
      console.log('Purged item from sessions:', itemId);
    } catch (error) {
      console.error('Error purging item from sessions:', error);
      throw error;
    }
  },

  // Squad weapon category cleanup
  async clearWeaponCategoryFromSquad(categoryId: string): Promise<void> {
    try {
      const settings = await this.getSquadSettings();
      if (!settings) return;
      const updated: SquadSettings = {
        ...settings,
        soldiers: settings.soldiers.map(s => ({
          ...s,
          personligVapenCategoryId:
            s.personligVapenCategoryId === categoryId ? '' : s.personligVapenCategoryId,
          sekundærVåpenCategoryId:
            s.sekundærVåpenCategoryId === categoryId ? undefined : s.sekundærVåpenCategoryId,
        })),
      };
      await this.saveSquadSettings(updated);
      console.log('Cleared weapon category from squad:', categoryId);
    } catch (error) {
      console.error('Error clearing weapon category from squad:', error);
      throw error;
    }
  },

  // Last export author
  async getLastExportAuthor(): Promise<string> {
    try {
      const data = await AsyncStorage.getItem('@last_export_author');
      return data ?? '';
    } catch (error) {
      console.error('Error getting last export author:', error);
      return '';
    }
  },

  async setLastExportAuthor(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem('@last_export_author', name);
      console.log('Last export author saved:', name);
    } catch (error) {
      console.error('Error saving last export author:', error);
    }
  },

  // Clear all data (for testing)
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.SQUAD_SETTINGS,
        KEYS.CHECKLIST,
        KEYS.CHECKLIST_VERSION,
        KEYS.SESSIONS,
        KEYS.SETUP_COMPLETE,
        KEYS.DELETED_IDS,
      ]);
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  },
};
