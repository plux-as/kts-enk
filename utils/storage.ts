
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SquadSettings, ChecklistCategory, ChecklistSession } from '@/types/checklist';
import { defaultChecklist } from '@/data/defaultChecklist';

const KEYS = {
  SQUAD_SETTINGS: '@squad_settings',
  CHECKLIST: '@checklist',
  SESSIONS: '@sessions',
  SETUP_COMPLETE: '@setup_complete',
};

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
        return JSON.parse(data);
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
        return JSON.parse(data);
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

  // Clear all data (for testing)
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.SQUAD_SETTINGS,
        KEYS.CHECKLIST,
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
