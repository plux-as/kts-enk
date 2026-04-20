
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SquadSettings, ChecklistCategory, ChecklistSession } from '@/types/checklist';
import { defaultChecklist } from '@/data/defaultChecklist';

const KEYS = {
  SQUAD_SETTINGS: '@squad_settings',
  CHECKLIST: '@checklist',
  CHECKLIST_VERSION: '@checklist_version',
  SESSIONS: '@sessions',
  SETUP_COMPLETE: '@setup_complete',
};

export function mergeChecklists(
  stored: ChecklistCategory[],
  incoming: ChecklistCategory[],
): ChecklistCategory[] {
  const storedIds = new Set(stored.map(c => c.id));
  const merged = [...stored];

  for (const incomingCat of incoming) {
    if (!storedIds.has(incomingCat.id)) {
      // Entirely new category — add it
      merged.push(incomingCat);
    } else {
      // Category exists — merge in any new items
      const storedCatIndex = merged.findIndex(c => c.id === incomingCat.id);
      if (storedCatIndex !== -1) {
        const storedCat = merged[storedCatIndex];
        const storedItemIds = new Set(storedCat.items.map(i => i.id));
        const newItems = incomingCat.items.filter(i => !storedItemIds.has(i.id));
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
        const merged = mergeChecklists(migrated, defaultChecklist);
        console.log('Checklist auto-merged with defaultChecklist');
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

  // Clear all data (for testing)
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.SQUAD_SETTINGS,
        KEYS.CHECKLIST,
        KEYS.CHECKLIST_VERSION,
        KEYS.SESSIONS,
        KEYS.SETUP_COMPLETE,
      ]);
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  },
};
